import express from 'express';
import { Database } from '../db';

const router = express.Router();

router.get('/insights/:apiKey/:customerId', async (req, res) => {
    try {
        const { apiKey, customerId } = req.params;
        const db = await Database.getInstance();
        const stats = await db.getInsightsCardStats(apiKey, parseInt(customerId, 10));
        res.json(stats);
    } catch (error) {
        console.error('Error fetching insights stats:', error);
        res.status(500).json({ error: 'Failed to fetch insights stats' });
    }
});

export default router;
