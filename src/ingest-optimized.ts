import { readFileSync } from 'fs';
import { ChromaClient, OpenAIEmbeddingFunction } from 'chromadb';
import { config } from './config';
import path from 'path';

interface SemanticChunk {
    chunk_id: string;
    session_id: string;
    user_id: string | null;
    timestamp_start: number;
    timestamp_end: number;
    device_type: string;
    browser: string | null;
    country: string | null;
    event_type: string[];
    funnel_stage: string;
    error_type: string[];
    cart_value: number | null;
    status: string;
    summary: string;
    document: string;
    duration_ms: number;
    total_events: number;
}

interface SemanticChunksFile {
  sessionId: string;
    apiKey: string;
    totalChunks: number;
  totalEvents: number;
    chunks: SemanticChunk[];
}

function extractPaymentInfo(chunk: SemanticChunk): string {
    const paymentKeywords = ['payment', 'checkout', 'transaction', 'cart', 'order', 'purchase'];
    const errorTypes = chunk.error_type.join(', ').toLowerCase();
    const hasPaymentError = errorTypes.includes('payment') || 
                           errorTypes.includes('transaction') || 
                           errorTypes.includes('gateway');
    
    let paymentContext = '';
    
    if (chunk.funnel_stage === 'checkout' || hasPaymentError) {
        paymentContext = `
Payment Context:
- Cart Value: ${chunk.cart_value ? `₹${chunk.cart_value}` : 'Not available'}
- Payment Status: ${chunk.status}
- Error Types: ${chunk.error_type.length > 0 ? chunk.error_type.join(', ') : 'None'}
- Session Duration: ${(chunk.duration_ms / 1000).toFixed(2)} seconds
- Total Events: ${chunk.total_events}
`;
    }

    return paymentContext;
}

function createChunkText(chunk: SemanticChunk): string {
    const paymentInfo = extractPaymentInfo(chunk);
    
    return `
Summary: ${chunk.summary}

Session Details:
- Session ID: ${chunk.session_id}
- Time Period: ${new Date(chunk.timestamp_start).toISOString()} to ${new Date(chunk.timestamp_end).toISOString()}
- Duration: ${chunk.duration_ms}ms
- Total Events: ${chunk.total_events}

User Context:
- Device: ${chunk.device_type}
- Browser: ${chunk.browser || 'Not specified'}
- Country: ${chunk.country || 'Not specified'}
- User ID: ${chunk.user_id || 'Anonymous'}

Event Analysis:
- Types: ${chunk.event_type.join(', ')}
- Funnel Stage: ${chunk.funnel_stage}
- Status: ${chunk.status}
- Errors: ${chunk.error_type.length > 0 ? chunk.error_type.join(', ') : 'None'}

${paymentInfo}

Full Context:
${chunk.document}
`.trim();
}

async function ingestSemanticChunks(filePath: string) {
    try {
        // Read and parse the file
        console.log('Reading file:', filePath);
        const fileContent = readFileSync(filePath, 'utf-8');
        const data: SemanticChunksFile = JSON.parse(fileContent);

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

        // Get or create collection
        let collection;
        try {
            collection = await client.getCollection({
                name: 'semantic_chunks',
                embeddingFunction: embedder
            });
            console.log('Using existing collection');
        } catch (error) {
            console.log('Creating new collection...');
            collection = await client.createCollection({
                name: 'semantic_chunks',
                embeddingFunction: embedder,
                metadata: { "hnsw:space": "cosine" }
            });
        }

        // Get current count before ingestion
        const initialCount = await collection.count();

        // Process all chunks
        const documents = data.chunks.map(chunk => ({
            id: chunk.chunk_id,
            text: createChunkText(chunk),
            metadata: {
                sessionId: chunk.session_id,
                userId: chunk.user_id || '',
                deviceType: chunk.device_type,
                funnelStage: chunk.funnel_stage,
                status: chunk.status,
                eventTypes: chunk.event_type.join(','),
                errorTypes: chunk.error_type.join(','),
                timestampStart: chunk.timestamp_start.toString(),
                timestampEnd: chunk.timestamp_end.toString(),
                totalEvents: chunk.total_events.toString(),
                duration: chunk.duration_ms.toString(),
                cartValue: chunk.cart_value?.toString() || '',
                hasPaymentError: chunk.error_type.some(e => 
                    e.toLowerCase().includes('payment') || 
                    e.toLowerCase().includes('transaction') || 
                    e.toLowerCase().includes('gateway')
                ).toString()
            }
        }));

        // Add documents in smaller batches
        const batchSize = 5;
        console.log(`Adding documents in batches of ${batchSize}...`);
        
        for (let i = 0; i < documents.length; i += batchSize) {
            const batch = documents.slice(i, i + batchSize);
            console.log(`Processing batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(documents.length/batchSize)}`);
            
            await collection.add({
                ids: batch.map(d => d.id),
                documents: batch.map(d => d.text),
                metadatas: batch.map(d => d.metadata)
            });
        }

        console.log('✨ Successfully ingested all chunks!');
        
        // Verify ingestion
        const finalCount = await collection.count();
        const ingestedCount = finalCount - initialCount;
        console.log(`Initial documents in collection: ${initialCount}`);
        console.log(`Newly ingested documents: ${ingestedCount}`);
        console.log(`Total documents in collection: ${finalCount}`);
        
        if (ingestedCount !== data.totalChunks) {
            throw new Error(`Expected to ingest ${data.totalChunks} chunks but ingested ${ingestedCount}`);
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
const filePath = process.argv[2] || path.join(__dirname, 'semantic-chunks2.json');

// Run the ingestion
console.log('Starting ingestion process...');
ingestSemanticChunks(filePath);