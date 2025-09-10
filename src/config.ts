import dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

// Configuration interface for type safety
export interface Config {
  openai: {
    apiKey: string;
    embeddingModel: string;
    chatModel: string;
  };
  google: {
    apiKey: string;
    model: string;
  };
  chroma: {
    url: string;
    apiToken?: string;
    collection: string;
  };
  chunking: {
    size: number;
    overlap: number;
    maxDocsPerFile: number;
  };
  embedding: {
    provider: 'openai' | 'google';
    model: string;
  };
}

// Validate required environment variables
function validateConfig(): void {
  const requiredVars = ['OPENAI_API_KEY', 'CHROMA_URL'];
  const missing = requiredVars.filter(varName => !process.env[varName]);
  
  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(', ')}\n` +
      'Please copy env.example to .env and fill in the required values.'
    );
  }
}

// Parse and validate configuration
export function getConfig(): Config {
  validateConfig();
  
  return {
    openai: {
      apiKey: process.env.OPENAI_API_KEY!,
      embeddingModel: process.env.OPENAI_EMBEDDING_MODEL || 'text-embedding-3-small',
      chatModel: process.env.OPENAI_CHAT_MODEL || 'gpt-4o-mini',
    },
    google: {
      apiKey: process.env.GOOGLE_API_KEY || '',
      model: process.env.GOOGLE_MODEL || 'text-embedding-api',
    },
    chroma: {
      url: process.env.CHROMA_URL!,
      apiToken: process.env.CHROMA_API_TOKEN,
      collection: process.env.CHROMA_COLLECTION || 'semantic_chunks',
    },
    chunking: {
      size: parseInt(process.env.CHUNK_SIZE || '2000'),
      overlap: parseInt(process.env.CHUNK_OVERLAP || '200'),
      maxDocsPerFile: parseInt(process.env.MAX_DOCS_PER_FILE || '10000'),
    },
    embedding: {
      provider: (process.env.EMBEDDING_PROVIDER as 'openai' | 'google') || 'openai',
      model: process.env.EMBEDDING_MODEL || 'text-embedding-3-large',
    },
  };
}

// Export default config instance
export const config = getConfig();