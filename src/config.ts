import dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

// Configuration interface for type safety
export interface Config {
    port: number;
    openai: {
        apiKey: string;
        chatModel: string;
    };
    chroma: {
        url: string;
        collection: string;
    };
    embedding: {
        provider: 'openai';
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
        port: parseInt(process.env.PORT || '3000'),
        openai: {
            apiKey: process.env.OPENAI_API_KEY!,
            chatModel: process.env.OPENAI_CHAT_MODEL || 'gpt-4o-mini',
        },
        chroma: {
            url: process.env.CHROMA_URL!,
            collection: process.env.CHROMA_COLLECTION || 'semantic_chunks',
        },
        embedding: {
            provider: 'openai',
            model: process.env.EMBEDDING_MODEL || 'text-embedding-ada-002',
        },
    };
}

// Export default config instance
export const config = getConfig();