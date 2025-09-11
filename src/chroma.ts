import { ChromaClient, Collection, OpenAIEmbeddingFunction } from 'chromadb';
import { config } from './config';

// Initialize ChromaDB client
const client = new ChromaClient({
  path: config.chroma.url,
  auth: config.chroma.apiToken ? {
    provider: 'token',
    credentials: config.chroma.apiToken
  } : undefined,
});

// Interface for document data
export interface Document {
  id: string;
  text: string;
  metadata?: Record<string, any>;
  embedding?: number[];
}

// Interface for query result
export interface QueryResult {
  id: string;
  text: string;
  metadata?: Record<string, any>;
  distance?: number;
}

/**
 * Retry function with exponential backoff
 * @param fn - Function to retry
 * @param maxAttempts - Maximum number of attempts
 * @param baseDelay - Base delay in milliseconds
 * @returns Promise resolving to function result
 */
async function withRetry<T>(
  fn: () => Promise<T>,
  maxAttempts: number = 3,
  baseDelay: number = 1000
): Promise<T> {
  let lastError: Error;
  
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      
      if (attempt === maxAttempts) {
        throw lastError;
      }
      
      // Exponential backoff with jitter
      const delay = baseDelay * Math.pow(2, attempt - 1) + Math.random() * 1000;
      console.log(`Attempt ${attempt} failed, retrying in ${Math.round(delay)}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError!;
}

/**
 * Get or create a ChromaDB collection
 * @param name - Collection name
 * @returns Promise resolving to collection instance
 */
export async function getOrCreateCollection(name: string): Promise<Collection> {
  return withRetry(async () => {
    // Initialize embedding function with the correct model
    const embedder = new OpenAIEmbeddingFunction({
      openai_api_key: config.openai.apiKey,
      openai_model: config.embedding.model
    });

    try {
      // Try to get existing collection
      const collection = await client.getCollection({ 
        name,
        embeddingFunction: embedder
      });
      console.log(`Using existing collection: ${name}`);
      return collection;
    } catch (error) {
      // Collection doesn't exist, create it
      console.log(`Creating new collection: ${name}`);
      const collection = await client.createCollection({
        name,
        embeddingFunction: embedder,
        metadata: {
          description: 'RAG system collection for rrweb events',
          created_at: new Date().toISOString(),
        }
      });
      return collection;
    }
  });
}

/**
 * Upsert documents into a ChromaDB collection
 * @param collection - ChromaDB collection instance
 * @param docs - Array of documents to upsert
 * @returns Promise resolving when operation completes
 */
export async function upsertDocuments(
  collection: Collection,
  docs: Document[]
): Promise<void> {
  if (!docs || docs.length === 0) {
    console.log('No documents to upsert');
    return;
  }
  
  console.log(`Upserting ${docs.length} documents into collection...`);
  
  return withRetry(async () => {
    // Prepare data for upsert
    const ids = docs.map(doc => doc.id);
    const texts = docs.map(doc => doc.text);
    const metadatas = docs.map(doc => doc.metadata || {});
    const embeddings = docs.map(doc => doc.embedding).filter(Boolean);
    
    // Validate that all documents have embeddings if any do
    if (embeddings.length > 0 && embeddings.length !== docs.length) {
      throw new Error('All documents must have embeddings if any do');
    }
    
    // Filter out undefined embeddings
    const validEmbeddings = embeddings.filter(emb => emb !== undefined) as number[][];
    
    await collection.upsert({
      ids,
      documents: texts,
      metadatas,
      embeddings: validEmbeddings.length > 0 ? validEmbeddings : undefined,
    });
    
    console.log(`Successfully upserted ${docs.length} documents`);
  });
}

/**
 * Query ChromaDB collection for similar documents
 * @param collection - ChromaDB collection instance
 * @param queryEmbedding - Query embedding vector
 * @param topK - Number of top results to return
 * @param where - Optional metadata filter
 * @returns Promise resolving to array of query results
 */
export async function queryTopK(
  collection: Collection,
  queryEmbedding: number[],
  topK: number = 8,
  where?: any
): Promise<QueryResult[]> {
  console.log(`Querying collection for top ${topK} results...`);
  
  return withRetry(async () => {
console.log('Where:', where);
console.log('Query Embedding:', queryEmbedding);
console.log('Top K:', topK);
    const response = await collection.query({
      queryEmbeddings: [queryEmbedding],
      nResults: topK,
      where : {
        $and : [
            {
                customerId : {
                    $eq : where.customerId
                }
            },
            {
                apiKey : {
                    $eq : where.apiKey
                }
            }
        ]
      }
    });
    
    // Transform response to our interface
    const results: QueryResult[] = [];
    
    if (response.ids && response.ids[0]) {
      const ids = response.ids[0];
      const documents = response.documents?.[0] || [];
      const metadatas = response.metadatas?.[0] || [];
      const distances = response.distances?.[0] || [];
      
      for (let i = 0; i < ids.length; i++) {
        results.push({
          id: ids[i],
          text: documents[i] || '',
          metadata: metadatas[i] || {},
          distance: distances[i],
        });
      }
    }
    
    console.log(`Found ${results.length} results`);
    return results;
  });
}

/**
 * Get collection statistics
 * @param collection - ChromaDB collection instance
 * @returns Promise resolving to collection stats
 */
export async function getCollectionStats(collection: Collection): Promise<{
  count: number;
  name: string;
}> {
  return withRetry(async () => {
    const count = await collection.count();
    return {
      count,
      name: collection.name,
    };
  });
}

/**
 * Delete documents from collection by IDs
 * @param collection - ChromaDB collection instance
 * @param ids - Array of document IDs to delete
 * @returns Promise resolving when operation completes
 */
export async function deleteDocuments(
  collection: Collection,
  ids: string[]
): Promise<void> {
  if (!ids || ids.length === 0) {
    return;
  }
  
  console.log(`Deleting ${ids.length} documents from collection...`);
  
  return withRetry(async () => {
    await collection.delete({
      ids,
    });
    
    console.log(`Successfully deleted ${ids.length} documents`);
  });
}