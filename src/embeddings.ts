import OpenAI from 'openai';
import { config } from './config';

// ============================================================================
// TYPES AND INTERFACES
// ============================================================================

export interface EmbeddingProvider {
  getEmbeddings(texts: string[]): Promise<number[][]>;
  getEmbedding(text: string): Promise<number[]>;
}

// ============================================================================
// OPENAI EMBEDDING PROVIDER
// ============================================================================

class OpenAIEmbeddingProvider implements EmbeddingProvider {
  private client: OpenAI;
  private model: string;

  constructor(apiKey: string, model: string) {
    this.client = new OpenAI({ apiKey });
    this.model = model;
  }

  async getEmbeddings(texts: string[]): Promise<number[][]> {
    console.log(`Getting OpenAI embeddings for ${texts.length} texts using ${this.model}...`);
    
    const embeddings: number[][] = [];
    const batchSize = 100; // OpenAI batch limit
    
    for (let i = 0; i < texts.length; i += batchSize) {
      const batch = texts.slice(i, i + batchSize);
      console.log(`Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(texts.length / batchSize)} (${batch.length} texts)`);
      
      try {
        const response = await this.client.embeddings.create({
          model: this.model,
          input: batch,
        });
        
        const batchEmbeddings = response.data.map(item => item.embedding);
        embeddings.push(...batchEmbeddings);
        
        console.log(`Successfully generated ${batchEmbeddings.length} embeddings`);
      } catch (error) {
        console.error(`Error generating embeddings for batch ${Math.floor(i / batchSize) + 1}:`, error);
        throw error;
      }
    }
    
    return embeddings;
  }

  async getEmbedding(text: string): Promise<number[]> {
    const embeddings = await this.getEmbeddings([text]);
    return embeddings[0];
  }
}

// ============================================================================
// GOOGLE EMBEDDING PROVIDER
// ============================================================================

class GoogleEmbeddingProvider implements EmbeddingProvider {
  private apiKey: string;
  private model: string;
  private baseUrl: string;

  constructor(apiKey: string, model: string) {
    this.apiKey = apiKey;
    this.model = model;
    this.baseUrl = 'https://generativelanguage.googleapis.com/v1beta/models';
  }

  async getEmbeddings(texts: string[]): Promise<number[][]> {
    console.log(`Getting Google embeddings for ${texts.length} texts using ${this.model}...`);
    
    const embeddings: number[][] = [];
    const batchSize = 5; // Google's recommended batch size
    
    for (let i = 0; i < texts.length; i += batchSize) {
      const batch = texts.slice(i, i + batchSize);
      console.log(`Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(texts.length / batchSize)} (${batch.length} texts)`);
      
      try {
        const response = await fetch(`${this.baseUrl}/${this.model}:embedContent?key=${this.apiKey}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            contents: batch.map(text => ({
              parts: [{ text }]
            }))
          })
        });
        
        if (!response.ok) {
          throw new Error(`Google API error: ${response.status} ${response.statusText}`);
        }
        
        const data:any = await response.json();
        const batchEmbeddings = data.embeddings.map((emb: any) => emb.values);
        embeddings.push(...batchEmbeddings);
        
        console.log(`Successfully generated ${batchEmbeddings.length} embeddings`);
      } catch (error) {
        console.error(`Error generating embeddings for batch ${Math.floor(i / batchSize) + 1}:`, error);
        throw error;
      }
    }
    
    return embeddings;
  }

  async getEmbedding(text: string): Promise<number[]> {
    const embeddings = await this.getEmbeddings([text]);
    return embeddings[0];
  }
}

// ============================================================================
// EMBEDDING FACTORY
// ============================================================================

export function createEmbeddingProvider(): EmbeddingProvider {
  const { provider, model } = config.embedding;
  
  switch (provider) {
    case 'openai':
      return new OpenAIEmbeddingProvider(config.openai.apiKey, model);
    case 'google':
      return new GoogleEmbeddingProvider(config.google.apiKey, model);
    default:
      throw new Error(`Unsupported embedding provider: ${provider}`);
  }
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Calculate cosine similarity between two vectors
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error('Vectors must have the same length');
  }
  
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  
  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

// ============================================================================
// EXPORT MAIN FUNCTIONS
// ============================================================================

const embeddingProvider = createEmbeddingProvider();

export async function getEmbeddings(texts: string[]): Promise<number[][]> {
  return embeddingProvider.getEmbeddings(texts);
}

export async function getEmbedding(text: string): Promise<number[]> {
  return embeddingProvider.getEmbedding(text);
}

export default {
  getEmbeddings,
  getEmbedding,
  cosineSimilarity,
  createEmbeddingProvider
};