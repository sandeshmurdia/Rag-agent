import { readFileSync } from 'fs';
import { ChromaClient } from 'chromadb';
import { config } from './config';
import { getEmbedding } from './embeddings';
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
    shipping_cost: number | null;
    tax_cost: number | null;
    discount_cost: number | null;
    discount_percentage: number | null;
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
  revenue_loss: number | null; // NEW: total monetary value lost due to abandoned or failed checkout
  potential_sales_loss: number | null; // NEW: total possible sales lost from abandoned checkout funnel
  summary: string;
  duration_ms: number;
  document: string;
  timestamp_start: number;
  timestamp_end: number;
  api_key: string;
  customer_id: number;
  navigations: string[];
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
        const fileContent = readFileSync(filePath, 'utf-8');
        const data: SemanticChunksData = JSON.parse(fileContent);


        // Initialize ChromaDB client
        const client = new ChromaClient({
            path: config.chroma.url
        });

        // Create custom embedding function using our multi-modal system
        const customEmbedder = {
            generate: async (texts: string[]) => {
                const embeddings = [];
                for (const text of texts) {
                    const embedding = await getEmbedding(text);
                    embeddings.push(embedding);
                }
                return embeddings;
            }
        };

        // Get or create collection with custom embedder
        let collection;
        try {
            collection = await client.getCollection({
                name: config.chroma.collection,
                embeddingFunction: customEmbedder
            });
        } catch (error) {
            collection = await client.createCollection({
                name: config.chroma.collection,
                embeddingFunction: customEmbedder,
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
                apiKey: chunk.api_key || '',
                customerId: chunk.customer_id || '',
                navigations: chunk.navigations.join(','),
                timestampStart: chunk.timestamp_start.toString(),
                timestampEnd: chunk.timestamp_end.toString(),
                duration: chunk.duration_ms.toString(),
                cartValue: chunk.cart_value ? JSON.stringify(chunk.cart_value) : '',
                cartItemsCost: chunk.cart_items_cost ? JSON.stringify(chunk.cart_items_cost) : '',
                revenueLoss: chunk.revenue_loss ? chunk.revenue_loss.toString() : '', // NEW: Include revenue loss in metadata
                potentialSalesLoss: chunk.potential_sales_loss ? chunk.potential_sales_loss.toString() : '', // NEW: Include potential sales loss in metadata
                hasPaymentError: chunk.error_type.some((e: string) => 
                    e.toLowerCase().includes('payment') || 
                    e.toLowerCase().includes('transaction') || 
                    e.toLowerCase().includes('gateway')
                ).toString(),
                hasIssues: chunk.issue_type.length > 0 ? 'true' : 'false',
                hasRevenueLoss: chunk.revenue_loss && chunk.revenue_loss > 0 ? 'true' : 'false', // NEW: Flag for chunks with revenue loss
                hasSalesLoss: chunk.potential_sales_loss && chunk.potential_sales_loss > 0 ? 'true' : 'false' // NEW: Flag for chunks with sales loss
            }
        }));

        // Add documents in smaller batches
        const batchSize = 5;
        
        for (let i = 0; i < documents.length; i += batchSize) {
            const batch = documents.slice(i, i + batchSize);
            
            await collection.add({
                ids: batch.map((d: any) => d.id),
                documents: batch.map((d: any) => d.text),
                metadatas: batch.map((d: any) => d.metadata)
            });
        }

        
        // Verify ingestion
        const finalCount = await collection.count();
        const ingestedCount = finalCount - initialCount;
        
        // Check if ingestion was successful
        if (ingestedCount < data.totalChunks) {
            
            // Check if the chunks we tried to add actually exist
            const sampleIds = data.chunks.slice(0, 3).map(chunk => chunk.chunk_id);
            const existingChunks = await collection.get({
                ids: sampleIds
            });
            
            if (existingChunks.ids.length > 0) {
                console.info(`✅ Ingestion completed successfully!`);
            } else {
                throw new Error(`❌ Verification failed: None of the sample chunks were found in collection.`);
            }
        } else {
            console.info(`✅ Successfully ingested all ${data.totalChunks} chunks!`);
        }

        // Get a sample document to verify content
        const sample = await collection.get({
            limit: 1
        });

        if (sample.ids.length > 0) {
        }
    
  } catch (error) {
        console.error('Error ingesting chunks:', error);
    process.exit(1);
  }
}

// Get file path from command line or use default
const filePath = process.argv[2] || path.join(__dirname, '2.json');

// Run the ingestion
ingestSemanticChunks(filePath);