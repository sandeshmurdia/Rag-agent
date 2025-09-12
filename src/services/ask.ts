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
- User can ask any question like why, how, what caused this, etc.
- User can ask about any production that how much did it got sold, how much revenue did it generate, how much revenue did it lose, etc.
- User can ask about any payment that how much did it got paid, how much did it lose, etc.
- User can ask about any checkout that how much did it got completed, how much did it lose, etc.
- User can ask about any user that how much did they spent, how much did they lose, etc.
- User can ask about any error that how much did it occur, how much did it lose, etc.
- User can ask about any otp that how much did it get verified, how much did it lose, etc.
- User can ask about any funnel step that how much did it get completed, how much did it lose, etc.
- User can ask about any dropoff reason that how much did it get dropped off, how much did it lose, etc.
- User can ask about any checkout status that how much did it get completed, how much did it lose, etc.
- User can ask about any transaction metric that how much did it get completed, how much did it lose, etc.
- User can ask about any user behavior that how much did it get completed, how much did it lose, etc.
- User can ask about any error that how much did it occur, how much did it lose, etc.
- User can ask about any otp that how much did it get verified, how much did it lose, etc.
- User can ask about any funnel step that how much did it get completed, how much did it lose, etc.
- User can ask about any dropoff reason that how much did it get dropped off, how much did it lose, etc.
- User can ask about any checkout status that how much did it get completed, how much did it lose, etc.
- User can ask about any transaction metric that how much did it get completed, how much did it lose, etc.
- User can ask about any user behavior that how much did it get completed, how much did it lose, etc.
- User can ask about any error that how much did it occur, how much did it lose, etc.
- User can ask about any otp that how much did it get verified, how much did it lose, etc.
- User can ask about any funnel step that how much did it get completed, how much did it lose, etc.
- User can ask about any dropoff reason that how much did it get dropped off, how much did it lose, etc.
- User can ask about any checkout status that how much did it get completed, how much did it lose, etc.
- User can ask about any transaction metric that how much did it get completed, how much did it lose, etc.
- User can ask about any user behavior that how much did it get completed, how much did it lose, etc.
- User can ask about any error that how much did it occur, how much did it lose, etc.
- User can ask about any otp that how much did it get verified, how much did it lose, etc.
- User can ask about any funnel step that how much did it get completed, how much did it lose, etc.
- User can ask about any dropoff reason that how much did it get dropped off, how much did it lose, etc.
- User can ask about any checkout status that how much did it get completed, how much did it lose, etc.
- User can ask about any transaction metric that how much did it get completed, how much did it lose, etc.
- User can ask about any user behavior that how much did it get completed, how much did it lose, etc.
- User can ask about any error that how much did it occur, how much did it lose, etc.
- User can ask about any otp that how much did it get verified, how much did it lose, etc.
- User can ask about any funnel step that how much did it get completed, how much did it lose, etc.
- User can ask about any dropoff reason that how much did it get dropped off, how much did it lose, etc.
- User can ask about any checkout status that how much did it get completed, how much did it lose, etc.
- User can ask about any transaction metric that how much did it get completed, how much did it lose, etc.
- User can ask about any user behavior that how much did it get completed, how much did it lose, etc.
- User can ask about any error that how much did it occur, how much did it lose, etc.
- User can ask about any otp that how much did it get verified, how much did it lose, etc.
- User can ask about any funnel step that how much did it get completed, how much did it lose, etc.
- User can ask about any dropoff reason that how much did it get dropped off, how much did it lose, etc.
- User can ask about any checkout status that how much did it get completed, how much did it lose, etc.
- User can ask about any transaction metric that how much did it get completed, how much did it lose, etc.
- User can ask about any user behavior that how much did it get completed, how much did it lose, etc.
- User can ask about any error that how much did it occur, how much did it lose, etc.
- User can ask about any otp that how much did it get verified, how much did it lose, etc.
- User can ask about any funnel step that how much did it get completed, how much did it lose, etc.
- User can ask about any dropoff reason that how much did it get dropped off, how much did it lose, etc.
- User can ask about any checkout status that how much did it get completed, how much did it lose, etc.
- User can ask about any transaction metric that how much did it get completed, how much did it lose, etc.
- User can ask about any user behavior that how much did it get completed, how much did it lose, etc.
- User can ask about any error that how much did it occur, how much did it lose, etc.
- User can ask about any otp that how much did it get verified, how much did it lose, etc.
- User can ask about any funnel step that how much did it get completed, how much did it lose, etc.
- User can ask about any dropoff reason that how much did it get dropped off, how much did it lose, etc.
- User can ask about any checkout status that how much did it get completed, how much did it lose, etc.
- User can ask about any transaction metric that how much did it get completed, how much did it lose, etc.
- User can ask about any user behavior that how much did it get completed, how much did it lose, etc.
- User can ask about any error that how much did it occur, how much did it lose, etc.
- User can ask about any otp that how much did it get verified, how much did it lose, etc.
- User can ask about any funnel step that how much did it get completed, how much did it lose, etc.
- User can ask about any dropoff reason that how much did it get dropped off, how much did it lose, etc.
- User can ask about any checkout status that how much did it get completed, how much did it lose, etc.
- User can ask about any transaction metric that how much did it get completed, how much did it lose, etc.
- User can ask about any user behavior that how much did it get completed, how much did it lose, etc.
- User can ask about any error that how much did it occur, how much did it lose, etc.
- User can ask about any otp that how much did it get verified, how much did it lose, etc.
- User can ask about any funnel step that how much did it get completed, how much did it lose, etc.
- User can ask about any dropoff reason that how much did it get dropped off, how much did it lose, etc.
- User can ask about any checkout status that how much did it get completed, how much did it lose, etc.
- User can ask about any transaction metric that how much did it get completed, how much did it lose, etc.
- User can ask about any session id information.
- User can ask on any product.
- User can ask question about inventory.

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
  return "You are an expert e-commerce analytics assistant. Your role is to analyze checkout flows, payment patterns, and revenue impact from session data.\n\n" +
    "IMPORTANT GUIDELINES:\n\n" +
    "1. CONTENT FOCUS:\n" +
    "- Use ONLY the provided context to answer questions\n" +
    "- If data is insufficient, say \"I don't have enough information to answer this question\"\n" +
    "- Focus on revenue impact, conversion metrics, and actionable insights\n" +
    "- Highlight critical patterns and anomalies\n" +
    "- Create Zipy session links in format: <a href=\"https://app.zipy.ai/{apiKey}/{customerId}/?is_error=false&euid={sessionId}\" target=\"_blank\">View Session</a>\n" +
    "- Always include a \"Sessions\" section at the end listing all relevant sessions with their context\n" +
    "- When mentioning sessions, include revenue impact (loss/gain) and key metrics\n\n" +
    "2. DATA PRESENTATION:\n" +
    "- For numerical data, use clean HTML tables with proper styling. Example table structure:\n" +
    "  <table style=\"width:100%; border-collapse:collapse; margin:10px 0;\"><tr style=\"background:#f5f5f5\"><th style=\"padding:8px; border:1px solid #ddd; text-align:left\">Metric</th><th style=\"padding:8px; border:1px solid #ddd; text-align:right\">Value</th><th style=\"padding:8px; border:1px solid #ddd; text-align:right\">Change</th></tr><tr><td style=\"padding:8px; border:1px solid #ddd\">Revenue</td><td style=\"padding:8px; border:1px solid #ddd; text-align:right\">$1,000</td><td style=\"padding:8px; border:1px solid #ddd; text-align:right\">↑ 5%</td></tr></table>\n" +
    "- Use bullet points for listing issues or recommendations\n" +
    "- Include trend indicators (↑↓→) where relevant\n" +
    "- Format currency values consistently with $ and commas\n" +
    "- The numbers and metrics should be 100% accurate and correct with full context of the data.\n\n" +
    "3. ANSWER STRUCTURE:\n" +
    "- Start with a clear summary of key findings\n" +
    "- Group related metrics together\n" +
    "- Present data in order of business impact\n" +
    "- End with actionable recommendations if applicable\n\n" +
    "4. FORMATTING RULES:\n" +
    "- Use **bold** for important metrics and KPIs\n" +
    "- Use `code` for error codes or technical details\n" +
    "- Create tables for comparing metrics:\n" +
    "  | Metric | Value | Change |\n" +
    "  |--------|--------|--------|\n" +
    "  | Example | 100 | ↑ 5% |\n" +
    "- Use > for highlighting critical insights\n" +
    "- Use ### for section headers\n\n" +
    "5. SPECIFIC DATA TYPES:\n" +
    "- Revenue: Always include % change\n" +
    "- Errors: Group by type/gateway\n" +
    "- Time metrics: Show trends\n" +
    "- Conversion: Show funnel steps\n\n" +
    "Example Answer Format:\n" +
    "### Summary\n" +
    "> Key insight or critical finding\n\n" +
    "**Metrics Overview:**\n" +
    "<table style=\"width:100%; border-collapse:collapse; margin:10px 0;\"><tr style=\"background:#f5f5f5\"><th style=\"padding:8px; border:1px solid #ddd; text-align:left\">Metric</th><th style=\"padding:8px; border:1px solid #ddd; text-align:right\">Current</th><th style=\"padding:8px; border:1px solid #ddd; text-align:right\">vs Previous</th></tr><tr><td style=\"padding:8px; border:1px solid #ddd\">Revenue</td><td style=\"padding:8px; border:1px solid #ddd; text-align:right\">$10,000</td><td style=\"padding:8px; border:1px solid #ddd; text-align:right\">↑ 15%</td></tr><tr><td style=\"padding:8px; border:1px solid #ddd\">Conversion</td><td style=\"padding:8px; border:1px solid #ddd; text-align:right\">2.4%</td><td style=\"padding:8px; border:1px solid #ddd; text-align:right\">↓ 0.3%</td></tr></table>\n\n" +
    "### Detailed Analysis\n" +
    "• Finding 1 - In session <a href=\"https://app.zipy.ai/ac244488/1180/?is_error=false&euid=session123\" target=\"_blank\">View Details</a>\n" +
    "• Finding 2 - Across multiple sessions (see Sessions section)\n\n" +
    "### Technical Details\n" +
    "Error Code: `ERR_GATEWAY_TIMEOUT`\n\n" +
    "### Recommendations\n" +
    "1. Action item 1\n" +
    "2. Action item 2\n\n" +
    "```markdown\n" +
    "### Sessions\n" +
    "#### Revenue Gained Sessions\n" +
    "1. **$200** <a href=\"https://app.zipy.ai/ac244488/1180/?is_error=false&euid=session789\" target=\"_blank\">View Session</a>\n" +
    "   - **Status**: Completed\n" +
    "   - **Items**: 1x iPhone 15 Pro ($999), 2x AirPods Pro ($249 each)\n" +
    "   - **Total Items**: 3\n" +
    "   - **Cart Value**: $1,497\n" +
    "   - **Payment Method**: Credit Card\n" +
    "   - **Funnel Step**: Checkout completed\n" +
    "   - **Timestamp**: 2025-09-11 12:45:23 UTC\n\n" +
    "#### Revenue Lost Sessions\n" +
    "1. **$1,099** <a href=\"https://app.zipy.ai/ac244488/1180/?is_error=false&euid=session123\" target=\"_blank\">View Session</a>\n" +
    "   - **Status**: Abandoned\n" +
    "   - **Items**: 1x MacBook Air ($1,099)\n" +
    "   - **Total Items**: 1\n" +
    "   - **Cart Value**: $1,099\n" +
    "   - **Payment Method**: Credit Card\n" +
    "   - **Funnel Step**: Payment gateway\n" +
    "   - **Error**: Gateway timeout\n" +
    "   - **Timestamp**: 2025-09-11 13:20:15 UTC\n" +
    "   - **Revenue Impact**: Potential loss of $1,099 due to payment gateway timeout\n\n" +
    "2. **$927** <a href=\"https://app.zipy.ai/ac244488/1180/?is_error=false&euid=session456\" target=\"_blank\">View Session</a>\n" +
    "   - **Status**: Failed\n" +
    "   - **Items**: 2x iPad Mini ($399 each), 1x Apple Pencil ($129)\n" +
    "   - **Total Items**: 3\n" +
    "   - **Cart Value**: $927\n" +
    "   - **Payment Method**: UPI\n" +
    "   - **Funnel Step**: OTP verification\n" +
    "   - **Error**: Bank declined\n" +
    "   - **Timestamp**: 2025-09-11 14:10:45 UTC\n" +
    "   - **Revenue Impact**: Lost sale of $927 due to payment failure at OTP step\n\n" +
    "Note: Multiple sessions with same items are grouped together to show cumulative impact.\n" +
    "```";
}

function buildUserPrompt(question: string, results: QueryResult[]): string {
  if (results.length === 0) {
    return "Question: " + question + "\n\nContext: No relevant information found in the session data.";
  }
  
  const contextParts = results.map((result, index) => {
    const metadata = result.metadata || {};
    const sessionId = metadata.sessionId || "unknown";
    
    return "--- Context " + (index + 1) + " [Session: " + sessionId + "] ---\n" +
           "Distance: " + (result.distance ? result.distance.toFixed(4) : "N/A") + "\n" +
           "Metadata: " + JSON.stringify(metadata, null, 2) + "\n" +
           "Content:\n" + result.text + "\n" +
           "--- End Context " + (index + 1) + " ---";
  });
  
  return "Question: " + question + "\n\n" +
         "Context:\n" + contextParts.join("\n\n") + "\n\n" +
         "Please analyze the above context and answer the question. When referencing specific information, cite the chunkIndex in brackets [chunkIndex: X].";
}

/**
 * Enhances the answer with proper formatting and structure
 * @param answer Original answer from the model
 * @param question Enhanced question that was asked
 * @returns Formatted and structured answer
 */
async function enhanceAnswer(answer: string, question: string): Promise<string> {
  try {
    const systemPrompt = "You are an expert e-commerce data formatter. Your task is to enhance and structure the given answer.\n" +
      "Format the answer following these rules:\n\n" +
      "1. Structure:\n" +
      "- Start with a clear summary\n" +
      "- Group related metrics\n" +
      "- Present data in order of impact\n" +
      "- End with recommendations if any\n\n" +
      "2. Formatting:\n" +
      "- Use tables for numerical data if available and there should not be extra data in the table from its own.\n" +
      "- Use bullet points for lists\n" +
      "- Include trend indicators (↑↓→)\n" +
      "- Use markdown formatting\n\n" +
      "3. Highlight:\n" +
      "- Bold for important metrics\n" +
      "- Code blocks for technical details\n" +
      "- Blockquotes for key insights\n" +
      "- Headers for sections\n\n" +
      "4. Data Types:\n" +
      "- Format currencies consistently\n" +
      "- Show % changes where available\n" +
      "- Group errors by type\n" +
      "- Show conversion funnels as steps\n" +
      "- Preserve all session links in format <a href=\"https://app.zipy.ai/{apiKey}/{customerId}/?is_error=false&euid={sessionId}\" target=\"_blank\">View Session</a>\n" +
      "- Include session links when referencing specific data\n\n" +
      "5. Sessions Section:\n" +
      "- Start with \"### Sessions\" header\n" +
      "- Group sessions by outcome (based on status):\n" +
      "  • \"#### Revenue Gained Sessions\" (status: Completed)\n" +
      "  • \"#### Revenue Lost Sessions\" (status: Abandoned or Failed)\n" +
      "- Sort sessions by amount (highest to lowest) within each group\n" +
      "- For each session:\n" +
      "  - First line: Amount in bold with link: **$200** <a href=\"...\">View Session</a>\n" +
      "  - List details with \"-\" bullets and bold labels:\n" +
      "    - **Status**: Completed/Abandoned/Failed\n" +
      "    - **Items**: List all items with quantities and prices\n" +
      "      Example: \"2x iPhone 15 ($999 each), 1x Case ($29)\"\n" +
      "    - **Total Items**: Total number of items in cart\n" +
      "    - **Cart Value**: Total value before tax/shipping\n" +
      "    - **Payment Method**: The payment method used\n" +
      "    - **Funnel Step**: The step where completed/abandoned\n" +
      "    - **Error**: Error details if any (only for failed/abandoned)\n" +
      "    - **Timestamp**: When the session occurred\n" +
      "  - For abandoned/failed sessions, always explain potential revenue loss\n" +
      "  - Group duplicate sessions and show cumulative impact\n\n" +
      "Keep all factual information exactly the same - only enhance the formatting and structure.\n" +
      "IMPORTANT: Always preserve session links and include the Sessions section - these are critical for data traceability.";

    const userPrompt = "Question: " + question + "\n\n" +
      "Original Answer: " + answer + "\n\n" +
      "Please restructure and format this answer following the guidelines. Maintain all factual information exactly as is.\n\n" +
      "IMPORTANT: Only enhance the formatting and structure. Maintain all factual information exactly as is.\n" +
      "           Do not add any recommendations or suggestions.\n" +
      "           Enhance the answer with what is asked and available in the context.\n" +
      "           I dont want (chunkIndex: x) in the answer.\n";

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      temperature: 0.3,
      max_tokens: 1500
    });

    return completion.choices[0]?.message?.content?.trim() || answer;
  } catch (error) {
    console.error("Error enhancing answer:", error);
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
    console.log("Processing question:", question);
    
    // Get embedding for the question
    console.log("Getting question embedding...");
    const questionEmbedding = await getEmbedding(question);
    
    if (questionEmbedding.length === 0) {
      throw new Error("Failed to generate embedding for question");
    }
    
    // Get collection and query for relevant documents
    console.log("Querying ChromaDB collection:", config.chroma.collection);
    const collection = await getOrCreateCollection(config.chroma.collection);
    
    const results = await queryTopK(collection, questionEmbedding, topK, where);
    
    if (results.length === 0) {
      return "I don't have enough information in the session data to answer this question. The query didn't return any relevant context.";
    }
    
    console.log("Found", results.length, "relevant documents");
    
    if (rawOnly) {
      return "Raw mode - no AI answer generated";
    }

    // Build prompts
    const systemPrompt = buildSystemPrompt();
    const userPrompt = buildUserPrompt(question, results);
    
    // Generate answer using OpenAI
    console.log("Generating answer with OpenAI...");
    const completion = await openai.chat.completions.create({
      model: config.openai.chatModel,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      temperature: 0.3,
      max_tokens: 1000
    });
    
    return completion.choices[0]?.message?.content || "No answer generated";
    
  } catch (error) {
    console.error('Error querying RAG system:', error);
    
    // Provide helpful error messages
    if (error instanceof Error) {
      if (error.message.includes("rate_limit")) {
        throw new Error("OpenAI rate limit exceeded. Please wait and try again.");
      } else if (error.message.includes("invalid_api_key")) {
        throw new Error("Invalid OpenAI API key. Please check your OPENAI_API_KEY environment variable.");
      } else if (error.message.includes("quota_exceeded")) {
        throw new Error("OpenAI quota exceeded. Please check your account usage.");
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
import { generateMetadataFilters } from "./metadata";

export async function askQuestion(
  question: string, 
  topK: number = 10,
  where: Record<string, any> = {},
  rawOnly: boolean = false,
  customerId?: number,
  apiKey?: string
): Promise<string> {
  try {
    // Validate question relevance using AI
    const validation = await validateQuestion(question);
    if (!validation.isValid) {
      console.log("Invalid question:", question);
      return validation.message || "This question is not related to checkout or payment analysis.";
    }

    const enhancedQuestion = await enhanceQuestion(question);
    console.log("Enhanced question:", enhancedQuestion);

    // Generate metadata filters based on the question
    // const metadataFilters = await generateMetadataFilters(question, customerId, apiKey);
    // const combinedFilters = { ...where, ...metadataFilters };
    // console.log("Using metadata filters:", combinedFilters);
    const combinedFilters = {
        customerId: customerId,
        apiKey: apiKey
    };
    console.log("Using metadata filters:", combinedFilters);
    const rawAnswer = await queryRag(enhancedQuestion, topK, combinedFilters, rawOnly);
    console.log("Raw answer:", rawAnswer);
    
    // Only enhance the answer if we have actual content and not in raw mode
    const enhancedAnswer = !rawOnly && rawAnswer && !rawAnswer.includes("don't have enough information") 
      ? await enhanceAnswer(rawAnswer, enhancedQuestion)
      : rawAnswer;
    console.log("Enhanced answer:", enhancedAnswer);
    
    return enhancedAnswer;
  } catch (error) {
    console.error("Error:", error instanceof Error ? error.message : error);
    throw error;
  }
}

export default askQuestion;