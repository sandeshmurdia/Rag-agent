import fs from 'fs';
import path from 'path';
import OpenAI from 'openai';
import { config } from './config';
import { getOrCreateCollection } from './chroma';
import { getEmbedding } from './embeddings';

// Initialize OpenAI
const openai = new OpenAI({
    apiKey: config.openai.apiKey,
});

interface CartValue {
    currency: string;
    cost: number;
    total_items: number;
    shipping_cost: number | null;
    tax_cost: number;
    discount_cost: number | null;
    discount_percentage: number | null;
    discount_coupon: string | null;
    total_cost: number;
}

interface CartItemCost {
    currency: string;
    cost: number;
    quantity: number;
}

interface SessionChunk {
    chunk_id: string;
    session_id: string;
    browser: string | null;
    device_type: string | null;
    country: string | null;
    payment_method: string | null;
    funnel_step: string | null;
    error_type: string[];
    cart_value: CartValue | null;
    cart_items_cost: { [key: string]: CartItemCost } | null;
    order_type: string | null;
    dropoff_reason: string | null;
    checkout_status: string;
    revenue_loss: number | null;
    summary: string;
    document: string;
    timestamp_start: number;
    timestamp_end: number;
    api_key: string;
    customer_id: number;
    navigation_url: string;
}

interface Level2Chunk {
    chunk_id: string;
    session_id: string;
    browser: string | null;
    device_type: string | null;
    country: string | null;
    payment_method: string | null;
    funnel_steps: string[];
    error_types: string[];
    cart_values: CartValue[];
    cart_items: { [key: string]: CartItemCost }[];
    order_types: string[];
    dropoff_reasons: string[];
    checkout_statuses: string[];
    total_revenue_loss: number;
    summary: string;
    document: string;
    timestamp_start: number;
    timestamp_end: number;
    api_key: string;
    customer_id: number;
    navigation_urls: string[];
}

async function generateSessionSummary(chunks: SessionChunk[]): Promise<string> {
    try {
        // Create a comprehensive context from chunks
        const context = chunks.map(chunk => {
            let cartInfo = '';
            if (chunk.cart_value) {
                cartInfo = `Cart: ${chunk.cart_value.total_items} items, ${chunk.cart_value.currency}${chunk.cart_value.total_cost}`;
                if (chunk.cart_items_cost) {
                    cartInfo += ` (${Object.entries(chunk.cart_items_cost)
                        .map(([item, cost]) => `${item}: ${cost.quantity}x${cost.currency}${cost.cost}`)
                        .join(', ')})`;
                }
            }
            return `${chunk.summary}\nStatus: ${chunk.checkout_status}${chunk.revenue_loss ? `, Revenue Loss: ${chunk.revenue_loss}` : ''}\n${cartInfo}\n`;
        }).join('\n');

        const systemPrompt = `You are an expert e-commerce analytics assistant. Analyze the provided session chunks and create a concise, insightful summary that captures:

1. Key user behaviors and patterns
2. Revenue impact (gains/losses)
3. Critical conversion points
4. Major issues or blockers
5. Product interactions
6. Payment/checkout patterns

Focus on actionable insights and business impact. Be specific with numbers and metrics.

Format:
- Start with the most impactful observation
- Include specific numbers and percentages
- Highlight critical patterns
- Note any unusual behaviors
- Emphasize revenue impact`;

        const userPrompt = `Analyze these session chunks and create a concise, meaningful summary:\n\n${context}`;

        const completion = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: userPrompt }
            ],
            temperature: 0.3,
            max_tokens: 500
        });

        return completion.choices[0]?.message?.content || "No summary generated";
    } catch (error) {
        console.error('Error generating summary:', error);
        return "Error generating summary";
    }
}

import { Database, SessionStats } from './db';

async function processSessionFile(filePath: string): Promise<Level2Chunk | null> {
    try {
        const fileContent = fs.readFileSync(filePath, 'utf8');
        const sessionData = JSON.parse(fileContent);
        const chunks: SessionChunk[] = sessionData.chunks;

        if (!chunks || !chunks.length) {
            console.error(`No chunks found in ${filePath}`);
            return null;
        }

        // Get unique values and aggregate data
        const uniqueFunnelSteps = [...new Set(chunks.map(c => c.funnel_step).filter(Boolean))] as string[];
        const uniqueErrorTypes = [...new Set(chunks.flatMap(c => c.error_type))];
        const uniqueDropoffReasons = [...new Set(chunks.map(c => c.dropoff_reason).filter(Boolean))] as string[];
        const uniqueCheckoutStatuses = [...new Set(chunks.map(c => c.checkout_status))];
        const uniqueOrderTypes = [...new Set(chunks.map(c => c.order_type).filter(Boolean))] as string[];
        const uniquePaymentMethods = [...new Set(chunks.map(c => c.payment_method).filter(Boolean))] as string[];
        const uniqueNavigationUrls = [...new Set(chunks.map(c => c.navigation_url).filter(Boolean))] as string[];

        // Calculate total revenue loss
        const totalRevenueLoss = chunks.reduce((sum, chunk) => sum + (chunk.revenue_loss || 0), 0);

        // Get all cart values and items
        const cartValues = chunks.map(c => c.cart_value).filter(Boolean) as CartValue[];
        const cartItems = chunks.map(c => c.cart_items_cost).filter(Boolean) as { [key: string]: CartItemCost }[];

        // Generate intelligent summary using AI
        const summary = await generateSessionSummary(chunks);

        // Create level 2 chunk
        const level2Chunk: Level2Chunk = {
            chunk_id: `level2_${sessionData.sessionId}`,
            session_id: sessionData.sessionId,
            browser: chunks[0].browser,
            device_type: chunks[0].device_type,
            country: chunks[0].country,
            payment_method: uniquePaymentMethods.length ? uniquePaymentMethods[0] : null,
            funnel_steps: uniqueFunnelSteps,
            error_types: uniqueErrorTypes,
            cart_values: cartValues,
            cart_items: cartItems,
            order_types: uniqueOrderTypes,
            dropoff_reasons: uniqueDropoffReasons,
            checkout_statuses: uniqueCheckoutStatuses,
            total_revenue_loss: totalRevenueLoss,
            summary: summary,
            document: `Session Analysis:\n\n${summary}\n\nFunnel Steps: ${uniqueFunnelSteps.join(', ')}\nError Types: ${uniqueErrorTypes.join(', ')}\nDropoff Reasons: ${uniqueDropoffReasons.join(', ')}\nCheckout Statuses: ${uniqueCheckoutStatuses.join(', ')}\nTotal Revenue Loss: ${totalRevenueLoss}`,
            timestamp_start: Math.min(...chunks.map(c => c.timestamp_start)),
            timestamp_end: Math.max(...chunks.map(c => c.timestamp_end)),
            api_key: chunks[0].api_key,
            customer_id: chunks[0].customer_id,
            navigation_urls: uniqueNavigationUrls
        };

        return level2Chunk;
    } catch (error) {
        console.error(`Error processing file ${filePath}:`, error);
        return null;
    }
}

async function createLevel2Collection() {
    try {
        console.log('Creating level 2 collection...');
        const collection = await getOrCreateCollection('level_2_chunks');

        const chunksDir = path.join(__dirname, 'chunk-sessions');
        const files = fs.readdirSync(chunksDir).filter(file => file.endsWith('.json'));

        console.log(`Found ${files.length} session files to process`);

        for (const file of files) {
            console.log(`Processing ${file}...`);
            const filePath = path.join(chunksDir, file);
            const level2Chunk = await processSessionFile(filePath);

            if (level2Chunk) {
                // Generate embedding for the chunk
                const embedding = await getEmbedding(level2Chunk.document);

                // Add to ChromaDB
                await collection.add({
                    ids: [level2Chunk.chunk_id],
                    embeddings: [embedding],
                    documents: [level2Chunk.document],
                    metadatas: [{
                        sessionId: level2Chunk.session_id,
                        funnelSteps: level2Chunk.funnel_steps.join(','),
                        errorTypes: level2Chunk.error_types.join(','),
                        dropoffReasons: level2Chunk.dropoff_reasons.join(','),
                        checkoutStatuses: level2Chunk.checkout_statuses.join(','),
                        totalRevenueLoss: level2Chunk.total_revenue_loss.toString(),
                        apiKey: level2Chunk.api_key,
                        customerId: level2Chunk.customer_id.toString()
                    }]
                });

                // Update database with session stats
                const abandonedSessions = level2Chunk.checkout_statuses.filter(
                    status => status === 'abandoned' || status === 'failed'
                ).length;

                const sessionStats: SessionStats = {
                    apiKey: level2Chunk.api_key,
                    customerId: level2Chunk.customer_id,
                    totalSessions: 1,
                    abandonedSessions: abandonedSessions > 0 ? 1 : 0,
                    totalRevenueLoss: level2Chunk.total_revenue_loss
                };

                const db = await Database.getInstance();
                await db.upsertSessionStats(sessionStats);

                console.log(`Added level 2 chunk for session ${level2Chunk.session_id}`);
                console.log('Updated session stats in database');
            }
        }

        // Print final stats
        const db = await Database.getInstance();
        const stats = await db.getSessionStats();
        
        console.log('\nFinal Session Statistics:');
        console.log('========================');
        console.table(stats);
        
        await db.close();
        console.log('\nLevel 2 collection creation completed');
    } catch (error) {
        console.error('Error creating level 2 collection:', error);
    }
}

// Run the process
createLevel2Collection().catch(console.error);
