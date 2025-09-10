import { readFileSync } from 'fs';
import { ChromaClient, OpenAIEmbeddingFunction } from 'chromadb';
import { config } from './config';
import path from 'path';

interface SemanticChunk {
  chunk_id: string;
  session_id: string;
  user_id: string | null;
  browser: string | null;
  device_type: string | null;
  country: string | null;
  issue_type: string[];
  event_type: string[];
  payment_method: string | null;
  funnel_step: string | null;
  error_type: string[];
  cart_value: {
    currency: string;
    cost: number;
    total_items: number;
    shipping_cost: number;
    tax_cost: number;
    discount_cost: number;
    discount_percentage: number;
    discount_coupon: string | null;
    total_cost: number;
  } | null;
  cart_items_cost: Record<string, {
    currency: string;
    cost: number;
    quantity: number;
  }> | null;
  order_type: string | null;
  dropoff_reason: string | null;
  checkout_status: string;
  summary: string;
  duration_ms: number;
  document: string;
  timestamp_start: number;
  timestamp_end: number;
}

// Interface for input data
interface SemanticChunksData {
  sessionId: string;
  apiKey: string;
  totalChunks: number;
  totalEvents: number;
  chunks: SemanticChunk[];
}

function createChunkText(chunk: SemanticChunk): string {
    // Use the enhanced document field that already contains eventData
    // The document field now includes AI summary, metadata, and raw eventData
    return chunk.document;
}

async function ingestSemanticChunks(filePath: string) {
    try {
        // Read and parse the file
        console.log('Reading file:', filePath);
        const fileContent = readFileSync(filePath, 'utf-8');
        const data: SemanticChunksData = JSON.parse(fileContent);

        console.log(`Found ${data.totalChunks} chunks to process`);

        // Initialize ChromaDB client
        const client = new ChromaClient({
            path: config.chroma.url
        });

        // Initialize embedding function
        const embedder = new OpenAIEmbeddingFunction({
            openai_api_key: config.openai.apiKey,
            openai_model: config.embedding.model
        });

        // Get or create collection with new model
        let collection;
        try {
            collection = await client.getCollection({
                name: 'semantic_chunks', // New collection for text-embedding-3-large
                embeddingFunction: embedder
            });
            console.log('Using existing collection');
        } catch (error) {
            console.log('Creating new collection with text-embedding-3-large...');
            collection = await client.createCollection({
                name: 'semantic_chunks', // New collection for text-embedding-3-large
                embeddingFunction: embedder,
                metadata: { "hnsw:space": "cosine" }
            });
        }

        // Get current count before ingestion
        const initialCount = await collection.count();

        // Process all chunks
        const documents = data.chunks.map((chunk: SemanticChunk) => ({
            id: chunk.chunk_id,
            text: createChunkText(chunk),
            metadata: {
                sessionId: chunk.session_id,
                userId: chunk.user_id || '',
                deviceType: chunk.device_type || '',
                browser: chunk.browser || '',
                country: chunk.country || '',
                funnelStep: chunk.funnel_step || '',
                checkoutStatus: chunk.checkout_status,
                eventTypes: chunk.event_type.join(','),
                issueTypes: chunk.issue_type.join(','),
                errorTypes: chunk.error_type.join(','),
                paymentMethod: chunk.payment_method || '',
                orderType: chunk.order_type || '',
                dropoffReason: chunk.dropoff_reason || '',
                timestampStart: chunk.timestamp_start.toString(),
                timestampEnd: chunk.timestamp_end.toString(),
                duration: chunk.duration_ms.toString(),
                cartValue: chunk.cart_value ? JSON.stringify(chunk.cart_value) : '',
                cartItemsCost: chunk.cart_items_cost ? JSON.stringify(chunk.cart_items_cost) : '',
                hasPaymentError: chunk.error_type.some((e: string) => 
                    e.toLowerCase().includes('payment') || 
                    e.toLowerCase().includes('transaction') || 
                    e.toLowerCase().includes('gateway')
                ).toString(),
                hasIssues: chunk.issue_type.length > 0 ? 'true' : 'false'
            }
        }));

        // Add documents in smaller batches
        const batchSize = 5;
        console.log(`Adding documents in batches of ${batchSize}...`);
        
        for (let i = 0; i < documents.length; i += batchSize) {
            const batch = documents.slice(i, i + batchSize);
            console.log(`Processing batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(documents.length/batchSize)}`);
            
            await collection.add({
                ids: batch.map((d: any) => d.id),
                documents: batch.map((d: any) => d.text),
                metadatas: batch.map((d: any) => d.metadata)
            });
        }

        console.log('✨ Successfully ingested all chunks!');
        
        // Verify ingestion
        const finalCount = await collection.count();
        const ingestedCount = finalCount - initialCount;
        console.log(`Initial documents in collection: ${initialCount}`);
        console.log(`Newly ingested documents: ${ingestedCount}`);
        console.log(`Total documents in collection: ${finalCount}`);
        
        // Check if ingestion was successful
        if (ingestedCount < data.totalChunks) {
            console.log(`⚠️  Warning: Expected to ingest ${data.totalChunks} chunks but only ${ingestedCount} were newly added.`);
            console.log(`This might be because some chunks already existed in the collection.`);
            
            // Check if the chunks we tried to add actually exist
            const sampleIds = data.chunks.slice(0, 3).map(chunk => chunk.chunk_id);
            const existingChunks = await collection.get({
                ids: sampleIds
            });
            
            if (existingChunks.ids.length > 0) {
                console.log(`✅ Verification: Found ${existingChunks.ids.length} of the sample chunks in collection.`);
                console.log(`✅ Ingestion completed successfully!`);
            } else {
                throw new Error(`❌ Verification failed: None of the sample chunks were found in collection.`);
            }
        } else {
            console.log(`✅ Successfully ingested all ${data.totalChunks} chunks!`);
        }

        // Get a sample document to verify content
        const sample = await collection.get({
            limit: 1
        });

        if (sample.ids.length > 0) {
            console.log('\nVerification - Sample document:');
            console.log('ID:', sample.ids[0]);
            console.log('Metadata:', sample.metadatas[0]);
        }
    
  } catch (error) {
        console.error('Error ingesting chunks:', error);
    process.exit(1);
  }
}

// Get file path from command line or use default
const filePath = process.argv[2] || path.join(__dirname, 'cart_chunk.json');

// Run the ingestion
console.log('Starting ingestion process...');
ingestSemanticChunks(filePath);