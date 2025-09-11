import OpenAI from 'openai';
import { config } from '../config';
import { getEmbedding } from '../embeddings';
import { getOrCreateCollection, queryTopK, QueryResult } from '../chroma';

/**
 * Enhances user questions to be more specific to checkout and payment analysis
 * @param question Original user question
 * @returns Enhanced question focusing on checkout and payment metrics
 */
/**
 * Enhances user questions using AI to focus on checkout and payment analysis
 * @param question Original user question
 * @returns Enhanced question with checkout/payment context
 */
/**
 * Validates if the question is relevant to checkout and payment analysis
 * @param question User's question
 * @returns Object containing validation result and suggestions if invalid
 */
/**
 * Validates if the question is relevant to checkout and payment analysis using AI
 * @param question User's question
 * @returns Object containing validation result and suggestions if invalid
 */
async function validateQuestion(question: string): Promise<{ isValid: boolean; message?: string }> {
  try {
    const systemPrompt = `You are a checkout and payment analytics assistant. Validate if questions are relevant to:

- Checkout flow and cart analysis
- Payment processing and failures
- Transaction success/failure metrics
- Revenue impact of payment issues
- Cart abandonment and conversion
- Any other question that is related to checkout flow, payment processing, revenue impact, total revenue, user behavior, error, otp , funnel steps, dropoff reason, checkout status or transaction metrics

If question is NOT about these topics, explain why and suggest 2 relevant example questions.

Response format:
{
  "isRelevant": false,
  "explanation": "Brief reason",
  "suggestedQuestions": ["Q1", "Q2"]
}
OR
{
  "isRelevant": true
}`;

    const userPrompt = `Question: "${question}"

Is this question relevant to checkout flow and payment analysis? Provide response in the specified JSON format.`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.1,
      max_tokens: 500,
      response_format: { type: "json_object" }
    });

    const response = JSON.parse(completion.choices[0]?.message?.content || '{"isRelevant": true}');

    if (!response.isRelevant) {
      const message = `## ❌ Invalid Question
> ${response.explanation}

## 💡 Try These Questions Instead:

${response.suggestedQuestions.map((q: string) => `• ${q}`).join('\n\n')}

---
*Note: Focus your questions on checkout flow, payment processing, or transaction metrics.*`;

      return { isValid: false, message };
    }

    return { isValid: true };
  } catch (error) {
    console.error('Error validating question:', error);
    // On error, let the question through to be safe
    return { isValid: true };
  }
}

async function enhanceQuestion(question: string): Promise<string> {
  try {
    const systemPrompt = `You are an expert e-commerce analytics assistant focused on checkout and payment flows. 
Your task is to correct user questions grammar`;

    const userPrompt = `Original Question: "${question}"`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.3,
      max_tokens: 1000, 
    });

    const enhancedQuestion = completion.choices[0]?.message?.content?.trim() || question;
    
    // Remove any quotes or "Enhanced Question:" prefix that might be in the response
    return enhancedQuestion.replace(/^["']|["']$/g, '').replace(/^Enhanced Question:\s*/i, '');

  } catch (error) {
    console.error('Error enhancing question:', error);
    // Fallback to original question in case of any error
    return question;
  }
}

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: config.openai.apiKey,
});

function buildSystemPrompt(): string {
  return `You are an expert e-commerce analytics assistant. Your role is to analyze checkout flows, payment patterns, and revenue impact from session data.

IMPORTANT GUIDELINES:

1. CONTENT FOCUS:
- Use ONLY the provided context to answer questions
- If data is insufficient, say "I don't have enough information to answer this question"
- Focus on revenue impact, conversion metrics, and actionable insights
- Highlight critical patterns and anomalies

2. DATA PRESENTATION:
- For numerical data, use clean HTML tables with proper styling. Example table structure:
  <table style="width:100%; border-collapse:collapse; margin:10px 0;"><tr style="background:#f5f5f5"><th style="padding:8px; border:1px solid #ddd; text-align:left">Metric</th><th style="padding:8px; border:1px solid #ddd; text-align:right">Value</th><th style="padding:8px; border:1px solid #ddd; text-align:right">Change</th></tr><tr><td style="padding:8px; border:1px solid #ddd">Revenue</td><td style="padding:8px; border:1px solid #ddd; text-align:right">$1,000</td><td style="padding:8px; border:1px solid #ddd; text-align:right">↑ 5%</td></tr></table>
- Use bullet points for listing issues or recommendations
- Include trend indicators (↑↓→) where relevant
- Format currency values consistently with $ and commas
- The numbers and metrics should be 100% accurate and correct with full context of the data.

3. ANSWER STRUCTURE:
- Start with a clear summary of key findings
- Group related metrics together
- Present data in order of business impact
- End with actionable recommendations if applicable

4. FORMATTING RULES:
- Use **bold** for important metrics and KPIs
- Use \`code\` for error codes or technical details
- Create tables for comparing metrics:
  | Metric | Value | Change |
  |--------|--------|--------|
  | Example | 100 | ↑ 5% |
- Use > for highlighting critical insights
- Use ### for section headers

5. SPECIFIC DATA TYPES:
- Revenue: Always include % change
- Errors: Group by type/gateway
- Time metrics: Show trends
- Conversion: Show funnel steps

Example Answer Format:
### Summary
> Key insight or critical finding

**Metrics Overview:**
<table style="width:100%; border-collapse:collapse; margin:10px 0;"><tr style="background:#f5f5f5"><th style="padding:8px; border:1px solid #ddd; text-align:left">Metric</th><th style="padding:8px; border:1px solid #ddd; text-align:right">Current</th><th style="padding:8px; border:1px solid #ddd; text-align:right">vs Previous</th></tr><tr><td style="padding:8px; border:1px solid #ddd">Revenue</td><td style="padding:8px; border:1px solid #ddd; text-align:right">$10,000</td><td style="padding:8px; border:1px solid #ddd; text-align:right">↑ 15%</td></tr><tr><td style="padding:8px; border:1px solid #ddd">Conversion</td><td style="padding:8px; border:1px solid #ddd; text-align:right">2.4%</td><td style="padding:8px; border:1px solid #ddd; text-align:right">↓ 0.3%</td></tr></table>

### Detailed Analysis
• Finding 1
• Finding 2

### Technical Details
Error Code: \`ERR_GATEWAY_TIMEOUT\`

### Recommendations
1. Action item 1
2. Action item 2`;
}

function buildUserPrompt(question: string, results: QueryResult[]): string {
  if (results.length === 0) {
    return `Question: ${question}\n\nContext: No relevant information found in the session data.`;
  }
  
  const contextParts = results.map((result, index) => {
    const metadata = result.metadata || {};
    const chunkIndex = metadata.chunkIndex !== undefined ? metadata.chunkIndex : index;
    
    return `--- Context ${index + 1} [chunkIndex: ${chunkIndex}] ---  
Distance: ${result.distance ? result.distance.toFixed(4) : 'N/A'}
Content:
${result.text}
--- End Context ${index + 1} ---`;
  });
  
  return `Question: ${question}

Context:
${contextParts.join('\n\n')}

Please analyze the above context and answer the question. When referencing specific information, cite the chunkIndex in brackets [chunkIndex: X].`;
}

/**
 * Enhances the answer with proper formatting and structure
 * @param answer Original answer from the model
 * @param question Enhanced question that was asked
 * @returns Formatted and structured answer
 */
async function enhanceAnswer(answer: string, question: string): Promise<string> {
  try {
    const systemPrompt = `You are an expert e-commerce data formatter. Your task is to enhance and structure the given answer.
Format the answer following these rules:

1. Structure:
- Start with a clear summary
- Group related metrics
- Present data in order of impact
- End with recommendations if any

2. Formatting:
- Use tables for numerical data if available and there should not be extra data in the table from its own.
- Use bullet points for lists
- Include trend indicators (↑↓→)
- Use markdown formatting

3. Highlight:
- Bold for important metrics
- Code blocks for technical details
- Blockquotes for key insights
- Headers for sections

4. Data Types:
- Format currencies consistently
- Show % changes where available
- Group errors by type
- Show conversion funnels as steps

Keep all factual information exactly the same - only enhance the formatting and structure.`;

    const userPrompt = `Question: ${question}

Original Answer: ${answer}

Please restructure and format this answer following the guidelines. Maintain all factual information exactly as is.

IMPORTANT: Only enhance the formatting and structure. Maintain all factual information exactly as is.
           Do not add any recommendations or suggestions.
           Enhance the answer with what is asked and available in the context.
           I dont want (chunkIndex: x) in the answer.
`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.3,
      max_tokens: 1500,
    });

    return completion.choices[0]?.message?.content?.trim() || answer;
  } catch (error) {
    console.error('Error enhancing answer:', error);
    return answer;
  }
}

async function queryRag(
  question: string, 
  topK: number = 10,
  where?: Record<string, any>,
  rawOnly: boolean = false
): Promise<string> {
  try {
    console.log(`Processing question: "${question}"`);
    
    // Get embedding for the question
    console.log('Getting question embedding...');
    const questionEmbedding = await getEmbedding(question);
    
    if (questionEmbedding.length === 0) {
      throw new Error('Failed to generate embedding for question');
    }
    
    // Get collection and query for relevant documents
    console.log(`Querying ChromaDB collection: ${config.chroma.collection}`);
    const collection = await getOrCreateCollection(config.chroma.collection);
    
    const results = await queryTopK(collection, questionEmbedding, topK, where);
    
    if (results.length === 0) {
      return "I don't have enough information in the session data to answer this question. The query didn't return any relevant context.";
    }
    
    console.log(`Found ${results.length} relevant documents`);
    
    if (rawOnly) {
      return "Raw mode - no AI answer generated";
    }

    // Build prompts
    const systemPrompt = buildSystemPrompt();
    const userPrompt = buildUserPrompt(question, results);
    
    // Generate answer using OpenAI
    console.log('Generating answer with OpenAI...');
    const completion = await openai.chat.completions.create({
      model: config.openai.chatModel,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.3, // Lower temperature for more focused answers
      max_tokens: 1000,
    });
    
    return completion.choices[0]?.message?.content || 'No answer generated';
    
  } catch (error) {
    console.error('Error querying RAG system:', error);
    
    // Provide helpful error messages
    if (error instanceof Error) {
      if (error.message.includes('rate_limit')) {
        throw new Error('OpenAI rate limit exceeded. Please wait and try again.');
      } else if (error.message.includes('invalid_api_key')) {
        throw new Error('Invalid OpenAI API key. Please check your OPENAI_API_KEY environment variable.');
      } else if (error.message.includes('quota_exceeded')) {
        throw new Error('OpenAI quota exceeded. Please check your account usage.');
      }
    }
    
    throw error;
  }
}

/**
 * Ask a question and get an answer from the RAG system
 * @param question - User's question
 * @param topK - Number of top results to retrieve (optional)
 * @param where - Optional metadata filter
 * @param rawOnly - Whether to return raw results without AI processing
 * @returns The answer string
 */
import { generateMetadataFilters } from './metadata';

export async function askQuestion(
  question: string, 
  topK: number = 10,
  where: Record<string, any> = {},
  rawOnly: boolean = false,
  customerId?: number,
  apiKey?: string
): Promise<string> {
  try {
    /*
    * Step 1: Validate if the question is relevant to checkout/payment analysis
    * Step 2: Enhance the query with a prompt if valid
    * Step 3: Get the embedding of the question
    * Step 4: Get the collection and query for relevant documents
    * Step 5: Generate an answer using OpenAI
    */

    // Validate question relevance using AI
    const validation = await validateQuestion(question);
    if (!validation.isValid) {
      console.log('Invalid question:', question);
      return validation.message || "This question is not related to checkout or payment analysis.";
    }

    const enhancedQuestion = await enhanceQuestion(question);
    console.log('Enhanced question:', enhancedQuestion);

    // Generate metadata filters based on the question
    // const metadataFilters = await generateMetadataFilters(question, customerId, apiKey);
    // const combinedFilters = { ...where, ...metadataFilters };
    // console.log('Using metadata filters:', combinedFilters);
    const combinedFilters = {
        customerId: customerId,
        apiKey: apiKey,
    }
    console.log('Using metadata filters:', combinedFilters);
    const rawAnswer = await queryRag(enhancedQuestion, topK, combinedFilters, rawOnly);
    console.log('Raw answer:', rawAnswer);
    
    // Only enhance the answer if we have actual content and not in raw mode
    const enhancedAnswer = !rawOnly && rawAnswer && !rawAnswer.includes("don't have enough information") 
      ? await enhanceAnswer(rawAnswer, enhancedQuestion)
      : rawAnswer;
    console.log('Enhanced answer:', enhancedAnswer);
    
    return enhancedAnswer;
  } catch (error) {
    console.error('Error:', error instanceof Error ? error.message : error);
    throw error;
  }
}