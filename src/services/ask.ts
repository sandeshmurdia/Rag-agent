import OpenAI from 'openai';
import { config } from '../config';
import { getEmbedding } from '../embeddings';
import { getOrCreateCollection, queryTopK, QueryResult } from '../chroma';

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: config.openai.apiKey,
});

function buildSystemPrompt(): string {
  return `You are a helpful analyst of rrweb session recordings. Your role is to analyze user interactions, errors, and navigation patterns from session replay data.

IMPORTANT GUIDELINES:
- Use ONLY the provided context to answer questions
- If the context doesn't contain relevant information, say "I don't have enough information to answer this question"
- When referencing specific events, cite the chunkIndex in brackets [chunkIndex: X]
- Be specific about timestamps, user actions, and error details when available
- Focus on actionable insights and patterns
- If asked about errors, provide details about error types, timing, and context
- If asked about navigation, describe the sequence of page changes and user interactions

Format your responses clearly and provide specific details from the session data.`;
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
export async function askQuestion(
  question: string, 
  topK: number = 10,
  where?: Record<string, any>,
  rawOnly: boolean = false
): Promise<string> {
  try {
    /*
    * Step 1: Get the question and enhance the query with a prompt.
    * Step 2: Get the embedding of the question.
    * Step 3: Get the collection and query for relevant documents.
    * Step 4: Generate an answer using OpenAI.
    */

    const enhancedQuestion = await enhanceQuestion(question);
    const answer = await queryRag(question, topK, where, rawOnly);
    return answer;
  } catch (error) {
    console.error('Error:', error instanceof Error ? error.message : error);
    throw error;
  }
}