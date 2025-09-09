import OpenAI from 'openai';
import { config } from '../config';
import { ChatMessage } from '../types';
import { getOrCreateCollection } from '../chroma';

interface QueryResponse {
    response: string;
    analysis?: {
        revenueImpact?: number;
        failureRate?: number;
        recommendation?: string;
    };
}

export class Agent {
    private openai: OpenAI;

    constructor() {
        this.openai = new OpenAI({
            apiKey: config.openai.apiKey
        });
    }

    private async analyzePaymentData(context: string, query: string): Promise<string> {
        const analysisPrompt = `You are a Payment & Checkout Analysis Expert. Analyze the following session data and query:

Context: ${context}

Query: ${query}

Provide a detailed analysis focusing on:
1. Payment/Checkout Issues:
   - Payment gateway failures
   - OTP/authentication issues
   - Coupon application problems
   - Cart abandonment patterns
   - User drop-off points

2. Revenue Impact:
   - Quantify revenue at risk
   - Compare with historical patterns
   - Impact on specific products/categories

3. Root Cause Analysis:
   - Technical failures (API errors, timeouts)
   - User experience issues
   - Payment method specific problems
   - Gateway performance

4. Recommendations:
   - Immediate actions needed
   - System improvements
   - User experience enhancements

Format your response in a clear, structured manner with specific metrics where available.`;

        const completion = await this.openai.chat.completions.create({
            model: config.openai.chatModel || 'gpt-4o-mini',
            messages: [{ role: "user", content: analysisPrompt }],
            temperature: 0.7,
        });

        return completion.choices[0]?.message?.content || 'No analysis generated';
    }

    async processQuery(query: string, chatHistory: ChatMessage[] = []): Promise<QueryResponse> {
        if (!query.trim()) {
            throw new Error('Query cannot be empty');
        }

        try {
            const collection = await getOrCreateCollection('semantic_chunks');
            
            // Query the collection with more results for better context
            const results = await collection.query({
                queryTexts: [query],
                nResults: 5
            });

            // Format the context from search results
            let context = '';
            if (results.documents[0]) {
                context = results.documents[0].join('\n\n');
            }

            // Get enhanced analysis for payment/checkout queries
            const analysis = await this.analyzePaymentData(context, query);

            // Prepare final response with system context
            const systemPrompt = `You are a Payment & Checkout Intelligence Assistant with the following capabilities:

1. Payment Failure Detection:
   - Analyze OTP, card, UPI, wallet, and COD failures
   - Track coupon application issues
   - Monitor authentication success rates

2. Revenue Impact Analysis:
   - Calculate revenue at risk
   - Track failed transaction values
   - Analyze checkout abandonment impact

3. Root Cause Diagnosis:
   - Payment gateway issues
   - Coupon logic problems
   - API errors and timeouts
   - User experience barriers

4. Remediation Suggestions:
   - Recommend retry strategies
   - Suggest gateway failovers
   - Propose coupon fixes
   - Improve checkout flow

Use the following analysis to provide a clear, actionable response:

${analysis}

Focus on providing specific metrics, trends, and actionable insights.`;

            const messages = [
                { role: "system", content: systemPrompt },
                ...chatHistory.map(msg => ({
                    role: msg.role,
                    content: msg.content
                })),
                { role: "user", content: query }
            ] as OpenAI.Chat.ChatCompletionMessageParam[];

            const completion = await this.openai.chat.completions.create({
                model: config.openai.chatModel || 'gpt-4o-mini',
                messages,
                temperature: 0.7,
            });

            return {
                response: completion.choices[0]?.message?.content || 'No response generated'
            };

        } catch (error) {
            console.error('Error in processQuery:', error);
            throw new Error('Failed to process query');
        }
    }
}