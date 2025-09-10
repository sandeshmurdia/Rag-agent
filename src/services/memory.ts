import type { ChatMessage } from '../types';

interface Session {
    messages: ChatMessage[];
    createdAt: Date;
    lastActivity: Date;
}

class MemoryService {
    private sessions: Map<string, Session>;
    private static instance: MemoryService;

    private constructor() {
        this.sessions = new Map();
    }

    public static getInstance(): MemoryService {
        if (!MemoryService.instance) {
            MemoryService.instance = new MemoryService();
        }
        return MemoryService.instance;
    }

    createSession(sessionId: string): void {
        this.sessions.set(sessionId, {
            messages: [],
            createdAt: new Date(),
            lastActivity: new Date()
        });
    }

    getSession(sessionId: string): Session | undefined {
        const session = this.sessions.get(sessionId);
        return session;
    }

    addMessage(sessionId: string, message: ChatMessage): void {
        const session = this.sessions.get(sessionId);
        if (!session) {
            throw new Error('Session not found');
        }

        session.messages.push(message);
        session.lastActivity = new Date();
    }

    getMessages(sessionId: string): ChatMessage[] {
        const session = this.sessions.get(sessionId);
        if (!session) {
            throw new Error('Session not found');
        }

        return session.messages;
    }

    clearSession(sessionId: string): void {
        this.sessions.delete(sessionId);
    }
}

export const memory = MemoryService.getInstance();