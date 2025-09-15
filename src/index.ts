import express from 'express';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';
import { config } from './config';
import { ChatMessage } from './types';
import { askQuestion } from './services/ask';
import { storeChatMessage, getChatMessages, deleteChatMessages, getAllSessions } from './services/chat';
import statsRouter from './routes/stats';

const app = express();
app.use(cors());
app.use(express.json());

// Mount the stats router
app.use('/api/stats', statsRouter);

// Get all chat sessions
app.get('/api/chat/sessions', async (req, res) => {
    try {
        const sessions = await getAllSessions();
        
        // Get messages for each session
        const sessionsWithMessages = await Promise.all(
            sessions.map(async (session) => {
                const messages = await getChatMessages(session.id);
                return {
                    ...session,
                    messages
                };
            })
        );
        
        res.json({ sessions: sessionsWithMessages });
    } catch (error) {
        console.error('Error getting sessions:', error);
        res.status(500).json({ error: 'Failed to get sessions' });
    }
});

// Create a new chat session
app.post('/api/chat/session', (req, res) => {
    try {
        const sessionId = uuidv4();
        res.json({ sessionId });
    } catch (error) {
        console.error('Error creating session:', error);
        res.status(500).json({ error: 'Failed to create session' });
    }
});

// Get a specific chat session
app.get('/api/chat/session/:sessionId', async (req, res) => {
    try {
        const { sessionId } = req.params;
        const messages = await getChatMessages(sessionId);
        
        if (!messages.length) {
            return res.status(404).json({ error: 'Session not found or empty' });
        }
        
        res.json({
            id: sessionId,
            messages: messages,
            createdAt: new Date() // You might want to get this from the first message's metadata
        });
    } catch (error) {
        console.error('Error getting session:', error);
        res.status(500).json({ error: 'Failed to get session' });
    }
});

// Delete a chat session
app.delete('/api/chat/session/:sessionId', async (req, res) => {
    try {
        const { sessionId } = req.params;
        await deleteChatMessages(sessionId);
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

        // Store user message
        const userMessage: ChatMessage = { role: 'user', content: message };
        await storeChatMessage(sessionId, userMessage);

        // Get response from agent with metadata filters
        const response = await askQuestion(
            message,
            30, // topK
            {}, // base filters
            false, // rawOnly
            req.body.customerId, // optional customerId
            req.body.apiKey // optional apiKey
        );

        // Store assistant message
        const assistantMessage: ChatMessage = { role: 'assistant', content: response };
        await storeChatMessage(sessionId, assistantMessage);

        res.json({ response: response });
        
    } catch (error) {
        console.error('Error processing message:', error);
        res.status(500).json({ error: 'Failed to process message' });
    }
});

const port = 3000;
app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});