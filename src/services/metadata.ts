import OpenAI from 'openai';
import { config } from '../config';

const openai = new OpenAI({
  apiKey: config.openai.apiKey,
});

interface MetadataFilters {
  [key: string]: string | boolean | number;
}

/**
 * Generates metadata filters based on the question context
 */
export async function generateMetadataFilters(
  question: string,
  customerId?: number,
  apiKey?: string
): Promise<MetadataFilters> {
  try {
    const systemPrompt = `You are a metadata filter generator for e-commerce analytics.
Your task is to analyze the question and determine which metadata filters should be applied.

Available metadata fields:
- deviceType: Device type (mobile, desktop, etc.)
- browser: Browser name
- country: Country code
- funnelStep: Stage in funnel
- checkoutStatus: Status of checkout
- eventTypes: Types of events (comma-separated)
- issueTypes: Types of issues (comma-separated)
- errorTypes: Types of errors (comma-separated)
- paymentMethod: Payment method used
- orderType: Type of order
- dropoffReason: Reason for drop-off
- hasPaymentError: 'true' or 'false'
- hasIssues: 'true' or 'false'
- hasRevenueLoss: 'true' or 'false'
- hasSalesLoss: 'true' or 'false'
- navigations: Navigations (comma-separated)
- sessionId: session id

Response format:
{
  "filters": {
    "fieldName": "value"
  },
  "explanation": "Brief explanation of why these filters were chosen"
}

Example:
Question: "How many payment failures occurred on mobile?"
Response: {
  "filters": {
    "deviceType": "mobile",
    "hasPaymentError": "true"
  },
  "explanation": "Filtering for mobile devices with payment errors"
}`;

    const userPrompt = `Question: "${question}"

Generate appropriate metadata filters for this question. Only include filters that are directly relevant to the question.
Do not include customerId or apiKey in your response.`;

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

    const response = JSON.parse(completion.choices[0]?.message?.content || '{"filters": {}}');
    
    // Add required filters
    const filters: MetadataFilters = {
      ...(customerId ? { customerId } : {}),
      ...(apiKey ? { apiKey } : {}),
      ...response.filters
    };

    console.log('Generated metadata filters:', {
      filters,
      explanation: response.explanation
    });

    return filters;
  } catch (error) {
    console.error('Error generating metadata filters:', error);
    // Return only required filters on error
    return {
      ...(customerId ? { customerId } : {}),
      ...(apiKey ? { apiKey } : {})
    };
  }
}
