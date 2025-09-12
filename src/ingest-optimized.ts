import { readFileSync, readdirSync } from 'fs';
import { ChromaClient } from 'chromadb';
import { config } from './config';
import { getEmbedding } from './embeddings';
import path from 'path';

interface SemanticChunk {
  chunk_id: string;
  session_id: string;
  browser: string | null;
  device_type: string | null;
  country: string | null;
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
  document: string;
  timestamp_start: number;
  timestamp_end: number;
  api_key: string;
  customer_id: number;
  navigation_url: string;
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
        console.info('Reading file:', filePath);
        const fileContent = readFileSync(filePath, 'utf-8');
        const data: SemanticChunksData = JSON.parse(fileContent);

        console.info(`Found ${data.totalChunks} chunks to process`);

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
            console.info('Using existing collection');
        } catch (error) {
            console.info(`Creating new collection: ${config.chroma.collection}`);
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
                deviceType: chunk.device_type || '',
                browser: chunk.browser || '',
                country: chunk.country || '',
                funnelStep: chunk.funnel_step || '',
                checkoutStatus: chunk.checkout_status,
                errorTypes: chunk.error_type.join(','),
                paymentMethod: chunk.payment_method || '',
                orderType: chunk.order_type || '',
                dropoffReason: chunk.dropoff_reason || '',
                apiKey: chunk.api_key || '',
                customerId: chunk.customer_id || '',
                navigationUrl: chunk.navigation_url,
                timestampStart: chunk.timestamp_start.toString(),
                timestampEnd: chunk.timestamp_end.toString(),
                cartValue: chunk.cart_value ? JSON.stringify(chunk.cart_value) : '',
                cartItemsCost: chunk.cart_items_cost ? JSON.stringify(chunk.cart_items_cost) : '',
                revenueLoss: chunk.revenue_loss ? chunk.revenue_loss.toString() : '', // NEW: Include revenue loss in metadata
                potentialSalesLoss: chunk.potential_sales_loss ? chunk.potential_sales_loss.toString() : '', // NEW: Include potential sales loss in metadata
                hasPaymentError: chunk.error_type.some((e: string) => 
                    e.toLowerCase().includes('payment') || 
                    e.toLowerCase().includes('transaction') || 
                    e.toLowerCase().includes('gateway')
                ).toString(),
                hasRevenueLoss: chunk.revenue_loss && chunk.revenue_loss > 0 ? 'true' : 'false', // NEW: Flag for chunks with revenue loss
                hasSalesLoss: chunk.potential_sales_loss && chunk.potential_sales_loss > 0 ? 'true' : 'false' // NEW: Flag for chunks with sales loss
            }
        }));

        // Add documents in smaller batches
        const batchSize = 5;
        console.info(`Adding documents in batches of ${batchSize}...`);
        
        for (let i = 0; i < documents.length; i += batchSize) {
            const batch = documents.slice(i, i + batchSize);
            console.info(`Processing batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(documents.length/batchSize)}`);
            
            await collection.add({
                ids: batch.map((d: any) => d.id),
                documents: batch.map((d: any) => d.text),
                metadatas: batch.map((d: any) => d.metadata)
            });
        }

        console.info('✨ Successfully ingested all chunks!');
        
        // Verify ingestion
        const finalCount = await collection.count();
        const ingestedCount = finalCount - initialCount;
        console.info(`Initial documents in collection: ${initialCount}`);
        console.info(`Newly ingested documents: ${ingestedCount}`);
        console.info(`Total documents in collection: ${finalCount}`);
        
        // Check if ingestion was successful
        if (ingestedCount < data.totalChunks) {
            console.warn(`⚠️  Warning: Expected to ingest ${data.totalChunks} chunks but only ${ingestedCount} were newly added.`);
            console.warn(`This might be because some chunks already existed in the collection.`);
            
            // Check if the chunks we tried to add actually exist
            const sampleIds = data.chunks.slice(0, 3).map(chunk => chunk.chunk_id);
            const existingChunks = await collection.get({
                ids: sampleIds
            });
            
            if (existingChunks.ids.length > 0) {
                console.info(`✅ Verification: Found ${existingChunks.ids.length} of the sample chunks in collection.`);
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
            console.info('\nVerification - Sample document:');
            console.info('ID:', sample.ids[0]);
            console.info('Metadata:', sample.metadatas[0]);
        }
    
  } catch (error) {
        console.error('Error ingesting chunks:', error);
    process.exit(1);
  }
}

async function ingestAllChunks() {
    const chunksDir = path.join(__dirname, 'chunk-sessions');
    console.info('Reading chunks directory:', chunksDir);

    try {
        // Get all JSON files from the directory
        const files = readdirSync(chunksDir)
            .filter(file => file.endsWith('.json'))
            .map(file => path.join(chunksDir, file));

        console.info(`Found ${files.length} JSON files to process`);

        // Process files sequentially to avoid overwhelming the system
        for (const file of files) {
            console.info('\n========================================');
            console.info(`Processing file: ${path.basename(file)}`);
            console.info('========================================\n');

            try {
                await ingestSemanticChunks(file);
                console.info(`✅ Successfully processed ${path.basename(file)}\n`);
            } catch (error) {
                console.error(`❌ Error processing ${path.basename(file)}:`, error);
                // Continue with next file even if one fails
                continue;
            }
        }

        console.info('\n✨ Completed processing all files!');
        console.info(`Total files processed: ${files.length}`);

    } catch (error) {
        console.error('Error reading chunks directory:', error);
        process.exit(1);
    }
}

// Run the ingestion for all files
console.info('Starting bulk ingestion process...');
ingestAllChunks();