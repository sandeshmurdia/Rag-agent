import express from 'express';
import { config } from './config';
import { Agent } from './services/agent';
import { ChatMessage } from './types';
import { chatService } from './services/chat';

const app = express();

// Enable CORS
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
    if (req.method === 'OPTIONS') {
        res.sendStatus(200);
    } else {
        next();
    }
});

app.use(express.json());

// Initialize the agent
const agent = new Agent();

// Create a new chat session
app.post('/api/chat/session', async (req, res) => {
    try {
        const sessionId = await chatService.createSession();
        res.json({ sessionId });
    } catch (error) {
        console.error('Error creating session:', error);
        res.status(500).json({ error: 'Failed to create session' });
    }
});

// Get all chat sessions
app.get('/api/chat/sessions', async (req, res) => {
    try {
        const sessions = await chatService.getAllSessions();
        res.json({ sessions });
    } catch (error) {
        console.error('Error getting sessions:', error);
        res.status(500).json({ error: 'Failed to get sessions' });
    }
});

// Get a specific chat session
app.get('/api/chat/session/:sessionId', async (req, res) => {
    try {
        const { sessionId } = req.params;
        const session = await chatService.getSession(sessionId);
        
        if (!session) {
            return res.status(404).json({ error: 'Session not found' });
        }

        res.json(session);
    } catch (error) {
        console.error('Error getting session:', error);
        res.status(500).json({ error: 'Failed to get session' });
    }
});

// Delete a chat session
app.delete('/api/chat/session/:sessionId', async (req, res) => {
    try {
        const { sessionId } = req.params;
        const session = await chatService.getSession(sessionId);
        
        if (!session) {
            return res.status(404).json({ error: 'Session not found' });
        }

        await chatService.deleteSession(sessionId);
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

        const session = await chatService.getSession(sessionId);
        if (!session) {
            return res.status(404).json({ error: 'Session not found' });
        }

        // Add user message to session
        const userMessage: ChatMessage = { role: 'user', content: message };
        await chatService.addMessage(sessionId, userMessage);

        // Get response from agent
        const response = await agent.processQuery(message, [...session.messages, userMessage]);

        // Add assistant message to session
        const assistantMessage: ChatMessage = { role: 'assistant', content: response.response };
        await chatService.addMessage(sessionId, assistantMessage);

        res.json({ response: response.response });
    } catch (error) {
        console.error('Error processing message:', error);
        res.status(500).json({ error: 'Failed to process message' });
    }
});

const port = config.port || 3000;
app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});