import { v4 as uuidv4 } from 'uuid';
import { getOrCreateCollection } from '../chroma';
import { ChatMessage } from '../types';
import { Metadata } from 'chromadb';

interface ChatSession {
    id: string;
    messages: ChatMessage[];
    createdAt: Date;
    title?: string;
}

interface ChatMetadata {
    type: 'session';
    createdAt: string;
    messages: string;
    title?: string;
}

class ChatService {
    private static instance: ChatService;
    private collectionName = 'chat_feedback';

    private constructor() {}

    public static getInstance(): ChatService {
        if (!ChatService.instance) {
            ChatService.instance = new ChatService();
        }
        return ChatService.instance;
    }

    private toMetadata(data: ChatMetadata): Metadata {
        const metadata: Metadata = {
            type: data.type,
            createdAt: data.createdAt,
            messages: data.messages
        };
        if (data.title) {
            metadata.title = data.title;
        }
        return metadata;
    }

    async createSession(): Promise<string> {
        const collection = await getOrCreateCollection(this.collectionName);
        const sessionId = uuidv4();
        
        const chatMetadata: ChatMetadata = {
            type: 'session',
            createdAt: new Date().toISOString(),
            messages: JSON.stringify([])
        };

        await collection.add({
            ids: [sessionId],
            metadatas: [this.toMetadata(chatMetadata)],
            documents: ['New chat session'] // Need valid text for embedding
        });

        return sessionId;
    }

    async getSession(sessionId: string): Promise<ChatSession | null> {
        const collection = await getOrCreateCollection(this.collectionName);
        const result = await collection.get({
            ids: [sessionId]
        });

        if (result.ids.length === 0 || !result.metadatas?.[0]) return null;

        const metadata = result.metadatas[0];
        return {
            id: sessionId,
            messages: JSON.parse(metadata.messages as string),
            createdAt: new Date(metadata.createdAt as string),
            title: metadata.title as string | undefined
        };
    }

    async getAllSessions(): Promise<ChatSession[]> {
        const collection = await getOrCreateCollection(this.collectionName);
        const result = await collection.get({
            where: { type: 'session' }
        });

        if (!result.metadatas) return [];

        return result.ids.map((id, index) => {
            const metadata = result.metadatas![index];
            if (!metadata) {
                throw new Error(`Missing metadata for session ${id}`);
            }
            return {
                id,
                messages: JSON.parse(metadata.messages as string),
                createdAt: new Date(metadata.createdAt as string),
                title: metadata.title as string | undefined
            };
        });
    }

    async addMessage(sessionId: string, message: ChatMessage): Promise<void> {
        const session = await this.getSession(sessionId);
        if (!session) throw new Error('Session not found');

        const messages = [...session.messages, message];
        const collection = await getOrCreateCollection(this.collectionName);
        
        const chatMetadata: ChatMetadata = {
            type: 'session',
            createdAt: session.createdAt.toISOString(),
            messages: JSON.stringify(messages),
            title: session.title
        };

        await collection.update({
            ids: [sessionId],
            metadatas: [this.toMetadata(chatMetadata)]
        });
    }

    async updateSessionTitle(sessionId: string, title: string): Promise<void> {
        const session = await this.getSession(sessionId);
        if (!session) throw new Error('Session not found');

        const collection = await getOrCreateCollection(this.collectionName);
        
        const chatMetadata: ChatMetadata = {
            type: 'session',
            createdAt: session.createdAt.toISOString(),
            messages: JSON.stringify(session.messages),
            title
        };

        await collection.update({
            ids: [sessionId],
            metadatas: [this.toMetadata(chatMetadata)]
        });
    }

    async deleteSession(sessionId: string): Promise<void> {
        const collection = await getOrCreateCollection(this.collectionName);
        await collection.delete({
            ids: [sessionId]
        });
    }
}

export const chatService = ChatService.getInstance();