import sqlite3 from 'sqlite3';
import { open } from 'sqlite';

export interface SessionStats {
    apiKey: string;
    customerId: number;
    totalSessions: number;
    abandonedSessions: number;
    totalRevenueLoss: number;
}

export class Database {
    private static instance: Database;
    private db: any;

    private constructor() {}

    static async getInstance(): Promise<Database> {
        if (!Database.instance) {
            Database.instance = new Database();
            await Database.instance.initialize();
        }
        return Database.instance;
    }

    private async initialize() {
        this.db = await open({
            filename: 'sessions.db',
            driver: sqlite3.Database
        });

        // Create the sessions_stats table if it doesn't exist
        await this.db.exec(`
            CREATE TABLE IF NOT EXISTS sessions_stats (
                api_key TEXT,
                customer_id INTEGER,
                total_sessions INTEGER,
                abandoned_sessions INTEGER,
                total_revenue_loss REAL,
                PRIMARY KEY (api_key, customer_id)
            )
        `);
    }

    async upsertSessionStats(stats: SessionStats) {
        const sql = `
            INSERT INTO sessions_stats (
                api_key,
                customer_id,
                total_sessions,
                abandoned_sessions,
                total_revenue_loss
            ) VALUES (?, ?, ?, ?, ?)
            ON CONFLICT(api_key, customer_id) DO UPDATE SET
                total_sessions = total_sessions + ?,
                abandoned_sessions = abandoned_sessions + ?,
                total_revenue_loss = total_revenue_loss + ?
        `;

        await this.db.run(sql, [
            stats.apiKey,
            stats.customerId,
            1, // Increment total sessions by 1
            stats.abandonedSessions,
            stats.totalRevenueLoss,
            1, // Same values for the UPDATE part
            stats.abandonedSessions,
            stats.totalRevenueLoss
        ]);
    }

    async getSessionStats(): Promise<SessionStats[]> {
        return await this.db.all(`
            SELECT 
                api_key as apiKey,
                customer_id as customerId,
                total_sessions as totalSessions,
                abandoned_sessions as abandonedSessions,
                total_revenue_loss as totalRevenueLoss
            FROM sessions_stats
        `);
    }

    async close() {
        if (this.db) {
            await this.db.close();
        }
    }
}
