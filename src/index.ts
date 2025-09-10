import express from 'express';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';
import { config } from './config';
import { Agent } from './services/agent';
import { ChatMessage } from './types';
import { askQuestion } from './services/ask';

const app = express();
app.use(cors());
app.use(express.json());

// Initialize the agent
const agent = new Agent();

// In-memory storage for chat sessions
const sessions = new Map<string, { messages: ChatMessage[]; createdAt: Date }>();

// Create a new chat session
app.post('/api/chat/session', (req, res) => {
    try {
        const sessionId = uuidv4();
        sessions.set(sessionId, { messages: [], createdAt: new Date() });
        res.json({ sessionId });
    } catch (error) {
        console.error('Error creating session:', error);
        res.status(500).json({ error: 'Failed to create session' });
    }
});

// Get all chat sessions
app.get('/api/chat/sessions', (req, res) => {
    try {
        const sessionList = Array.from(sessions.entries()).map(([id, data]) => ({
            id,
            messages: data.messages,
            createdAt: data.createdAt
        }));
        res.json({ sessions: sessionList });
    } catch (error) {
        console.error('Error getting sessions:', error);
        res.status(500).json({ error: 'Failed to get sessions' });
    }
});

// Get a specific chat session
app.get('/api/chat/session/:sessionId', (req, res) => {
    try {
        const { sessionId } = req.params;
        const session = sessions.get(sessionId);
        
        if (!session) {
            return res.status(404).json({ error: 'Session not found' });
        }
        
        res.json({
            id: sessionId,
            messages: session.messages,
            createdAt: session.createdAt
        });
    } catch (error) {
        console.error('Error getting session:', error);
        res.status(500).json({ error: 'Failed to get session' });
    }
});

// Delete a chat session
app.delete('/api/chat/session/:sessionId', (req, res) => {
    try {
        const { sessionId } = req.params;
        
        if (!sessions.has(sessionId)) {
            return res.status(404).json({ error: 'Session not found' });
        }
        
        sessions.delete(sessionId);

        res.json({ message: 'Session deleted successfully' });
    } catch (error) {
        console.error('Error deleting session:', error);
        res.status(500).json({ error: 'Failed to delete session' });
    }
});

// Send a message in a chat session
app.post('/api/chat/:sessionId', async (req, res) => {
    try {
        const { sessionId } = req.params;
        const { message } = req.body;

        if (!message || typeof message !== 'string') {
            return res.status(400).json({ error: 'Invalid message format' });
        }

        const session = sessions.get(sessionId);
        if (!session) {
            return res.status(404).json({ error: 'Session not found' });
        }

        // Add user message to session
        session.messages.push({ role: 'user', content: message });

        // Get response from agent
        const response = await askQuestion(message);

        // Add assistant message to session
        session.messages.push({ role: 'assistant', content: response });
        res.json({ response: response });
        
    } catch (error) {
        console.error('Error processing message:', error);
        res.status(500).json({ error: 'Failed to process message' });
    }
});

const port = config.port || 3000;
app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});