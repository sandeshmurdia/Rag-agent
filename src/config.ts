import dotenv from 'dotenv';
import { z } from 'zod';

// Load environment variables
dotenv.config();

// Define environment variable schema
const envSchema = z.object({
    OPENAI_API_KEY: z.string().default('sk-793be324'),
    OPENAI_EMBEDDING_MODEL: z.string().default('text-embedding-3-small'),
    OPENAI_CHAT_MODEL: z.string().default('gpt-4o-mini'),
    GOOGLE_API_KEY: z.string().optional().default(''),
    GOOGLE_MODEL: z.string().optional().default('text-embedding-api'),
    CHROMA_URL: z.string().default('http://localhost:8000'),
    CHROMA_API_TOKEN: z.string().optional(),
    CHROMA_COLLECTION: z.string().default('semantic_chunks'),
    CHUNK_SIZE: z.string().default('2000'),
    CHUNK_OVERLAP: z.string().default('200'),
    MAX_DOCS_PER_FILE: z.string().default('10000'),
    EMBEDDING_PROVIDER: z.enum(['openai', 'google']).default('openai'),
    EMBEDDING_MODEL: z.string().default('text-embedding-3-large'),
});

// Parse and validate environment variables
const env = envSchema.parse(process.env);

// Required environment variables
const requiredVars = ['OPENAI_API_KEY', 'CHROMA_URL'];

// Check for missing required variables
const missing = requiredVars.filter(varName => !env[varName as keyof typeof env]);

if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
}

// Export configuration
export const config = {
    openai: {
        apiKey: env.OPENAI_API_KEY,
        embeddingModel: env.OPENAI_EMBEDDING_MODEL,
        chatModel: env.OPENAI_CHAT_MODEL,
    },
    google: {
        apiKey: env.GOOGLE_API_KEY,
        model: env.GOOGLE_MODEL,
    },
    chroma: {
        url: env.CHROMA_URL,
        apiToken: env.CHROMA_API_TOKEN,
        collection: env.CHROMA_COLLECTION,
    },
    chunking: {
        size: parseInt(env.CHUNK_SIZE),
        overlap: parseInt(env.CHUNK_OVERLAP),
        maxDocsPerFile: parseInt(env.MAX_DOCS_PER_FILE),
    },
    embedding: {
        provider: env.EMBEDDING_PROVIDER,
        model: env.EMBEDDING_MODEL,
    },
} as const;