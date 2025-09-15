import sqlite3 from 'sqlite3';
import { Database as SQLiteDB, open } from 'sqlite';

interface DBStats {
    totalSessions: number;
    abandonedSessions: number;
    totalRevenueLoss: number;
}

interface CountResult {
    count: number;
}

export interface SessionStats {
    apiKey: string;
    customerId: number;
    totalSessions: number;
    abandonedSessions: number;
    totalRevenueLoss: number;
}

export class Database {
    private static instance: Database | null = null;
    private db: SQLiteDB | null = null;
    private initialized: boolean = false;

    private constructor() {}

    static async getInstance(): Promise<Database> {
        if (!Database.instance) {
            Database.instance = new Database();
        }
        if (!Database.instance.initialized) {
            await Database.instance.initialize();
        }
        return Database.instance;
    }

    private async initialize() {
        if (this.initialized) return;

        try {
            this.db = await open({
                filename: 'sessions.db',
                driver: sqlite3.Database
            });

            // Create the sessions_stats table if it doesn't exist
            await this.db.exec(`
                CREATE TABLE IF NOT EXISTS sessions_stats (
                    api_key TEXT,
                    customer_id INTEGER,
                    total_sessions INTEGER DEFAULT 0,
                    abandoned_sessions INTEGER DEFAULT 0,
                    total_revenue_loss REAL DEFAULT 0.0,
                    PRIMARY KEY (api_key, customer_id)
                )
            `);

            // Insert test data if table is empty
            const count = await this.db.get<CountResult>('SELECT COUNT(*) as count FROM sessions_stats');
            if (count?.count === 0) {
                await this.db.run(`
                    INSERT INTO sessions_stats (api_key, customer_id, total_sessions, abandoned_sessions, total_revenue_loss)
                    VALUES ('abc', 10, 100, 30, 1500.50)
                `);
            }

            this.initialized = true;
        } catch (error) {
            console.error('Failed to initialize database:', error);
            throw error;
        }
    }

    private ensureConnection() {
        if (!this.db || !this.initialized) {
            throw new Error('Database not initialized. Call getInstance() first.');
        }
    }

    async upsertSessionStats(stats: SessionStats) {
        this.ensureConnection();
        try {
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

            await this.db!.run(sql, [
                stats.apiKey,
                stats.customerId,
                1, // Increment total sessions by 1
                stats.abandonedSessions,
                stats.totalRevenueLoss,
                1, // Same values for the UPDATE part
                stats.abandonedSessions,
                stats.totalRevenueLoss
            ]);
        } catch (error) {
            console.error('Error upserting session stats:', error);
            throw error;
        }
    }

    async getSessionStats(): Promise<SessionStats[]> {
        this.ensureConnection();
        try {
            return await this.db!.all(`
                SELECT 
                    api_key as apiKey,
                    customer_id as customerId,
                    total_sessions as totalSessions,
                    abandoned_sessions as abandonedSessions,
                    total_revenue_loss as totalRevenueLoss
                FROM sessions_stats
            `);
        } catch (error) {
            console.error('Error getting session stats:', error);
            throw error;
        }
    }

    async getInsightsCardStats(apiKey: string, customerId: number): Promise<{
        weeklyLoss: number;
        abandonments: number;
        sessions: number;
        paymentDropoffRate: number;
    }> {
        this.ensureConnection();
        try {
            const stats = await this.db!.get<DBStats>(`
                SELECT 
                    total_sessions as totalSessions,
                    abandoned_sessions as abandonedSessions,
                    total_revenue_loss as totalRevenueLoss
                FROM sessions_stats
                WHERE api_key = ? AND customer_id = ?
            `, [apiKey, customerId]);

            if (!stats) {
                return {
                    weeklyLoss: 0,
                    abandonments: 0,
                    sessions: 0,
                    paymentDropoffRate: 0
                };
            }

            // Calculate payment dropoff rate
            const paymentDropoffRate = stats.totalSessions > 0
                ? Math.round((stats.abandonedSessions / stats.totalSessions) * 100)
                : 0;

            return {
                weeklyLoss: Math.round(stats.totalRevenueLoss * 100) / 100, // Round to 2 decimal places
                abandonments: stats.abandonedSessions,
                sessions: stats.totalSessions,
                paymentDropoffRate
            };
        } catch (error) {
            console.error('Error getting insights card stats:', error);
            throw error;
        }
    }

    async close() {
        if (this.db) {
            await this.db.close();
        }
    }
}
