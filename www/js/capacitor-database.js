import { CapacitorSQLite, SQLiteConnection, SQLiteDBConnection } from '@capacitor-community/sqlite';
import { Capacitor } from '@capacitor/core';

class VocabVentureDB {
    constructor() {
        this.dbName = 'vocabventure.db';
        this.db = null;
        this.sqlite = null;
        this.isInitialized = false;
    }

    async initialize() {
        if (this.isInitialized) return;

        try {
            // Create SQLite connection
            this.sqlite = new SQLiteConnection(CapacitorSQLite);
            
            // Create or open database
            this.db = await this.sqlite.createConnection(
                this.dbName,
                false, // not encrypted
                'no-encryption',
                1, // version
                false // readonly = false
            );

            // Open the database
            await this.db.open();

            // Create tables
            await this.initializeTables();

            this.isInitialized = true;
            console.log('✅ Capacitor SQLite initialized');
        } catch (error) {
            console.error('❌ Database initialization error:', error);
            throw error;
        }
    }

    async initializeTables() {
        const createTableSQL = `
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT NOT NULL,
                birthdate TEXT NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(username, birthdate)
            );

            CREATE TABLE IF NOT EXISTS progress (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER,
                story_id INTEGER,
                segment_id INTEGER,
                completed BOOLEAN DEFAULT 0,
                completed_at DATETIME,
                FOREIGN KEY (user_id) REFERENCES users(id),
                UNIQUE(user_id, story_id, segment_id)
            );

            CREATE TABLE IF NOT EXISTS quiz_results (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER,
                story_id INTEGER,
                score INTEGER,
                total_questions INTEGER,
                completed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id)
            );

            CREATE TABLE IF NOT EXISTS user_badges (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER,
                badge_id TEXT,
                earned_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id),
                UNIQUE(user_id, badge_id)
            );
        `;

        await this.db.execute(createTableSQL);
        console.log('✅ Database tables created');
    }

    // ============================================
    // AUTHENTICATION METHODS
    // ============================================
    async login(name, birthdate) {
        try {
            const query = 'SELECT * FROM users WHERE username = ? AND birthdate = ?';
            const result = await this.db.query(query, [name, birthdate]);

            if (result.values && result.values.length > 0) {
                const user = result.values[0];
                return {
                    success: true,
                    user: {
                        id: user.id,
                        username: user.username,
                        birthdate: user.birthdate,
                        created_at: user.created_at
                    }
                };
            }

            return {
                success: false,
                message: 'Invalid name or birthdate. Please try again or register.'
            };
        } catch (error) {
            console.error('Login error:', error);
            return {
                success: false,
                message: 'Login failed. Please try again.'
            };
        }
    }

    async register(name, birthdate) {
        try {
            // Check if user exists
            const checkQuery = 'SELECT * FROM users WHERE username = ? AND birthdate = ?';
            const existing = await this.db.query(checkQuery, [name, birthdate]);

            if (existing.values && existing.values.length > 0) {
                return {
                    success: false,
                    message: 'An account with this name and birthdate already exists. Please login instead.'
                };
            }

            // Insert new user
            const insertQuery = 'INSERT INTO users (username, birthdate) VALUES (?, ?)';
            const result = await this.db.run(insertQuery, [name, birthdate]);

            return {
                success: true,
                userId: result.changes.lastId,
                message: 'Account created successfully!'
            };
        } catch (error) {
            console.error('Registration error:', error);
            return {
                success: false,
                message: 'Failed to create account. Please try again.'
            };
        }
    }

    // ============================================
    // PROGRESS METHODS
    // ============================================
    async saveProgress(userId, storyId, segmentId) {
        try {
            const query = `
                INSERT OR REPLACE INTO progress (user_id, story_id, segment_id, completed, completed_at)
                VALUES (?, ?, ?, 1, datetime('now'))
            `;
            await this.db.run(query, [userId, storyId, segmentId]);
            return { success: true };
        } catch (error) {
            console.error('Save progress error:', error);
            return { success: false };
        }
    }

    async getProgress(userId, storyId) {
        try {
            const query = `
                SELECT * FROM progress 
                WHERE user_id = ? AND story_id = ? 
                ORDER BY segment_id
            `;
            const result = await this.db.query(query, [userId, storyId]);
            return result.values || [];
        } catch (error) {
            console.error('Get progress error:', error);
            return [];
        }
    }

    async getAllProgress(userId) {
        try {
            const query = `
                SELECT story_id, 
                       COUNT(*) as completed_segments,
                       14 as total_segments,
                       MAX(completed_at) as last_activity
                FROM progress 
                WHERE user_id = ? AND completed = 1
                GROUP BY story_id
            `;
            const result = await this.db.query(query, [userId]);
            return result.values || [];
        } catch (error) {
            console.error('Get all progress error:', error);
            return [];
        }
    }

    async getOverallProgress(userId) {
        try {
            const query = `
                SELECT COUNT(*) as completed_segments,
                       42 as total_segments
                FROM progress 
                WHERE user_id = ? AND completed = 1
            `;
            const result = await this.db.query(query, [userId]);
            
            if (result.values && result.values.length > 0) {
                const data = result.values[0];
                return {
                    completed: data.completed_segments,
                    total: data.total_segments,
                    percentage: Math.round((data.completed_segments / data.total_segments) * 100)
                };
            }
            
            return { completed: 0, total: 42, percentage: 0 };
        } catch (error) {
            console.error('Get overall progress error:', error);
            return { completed: 0, total: 42, percentage: 0 };
        }
    }

    // ============================================
    // QUIZ METHODS
    // ============================================
    async saveQuizResult(userId, storyId, score, totalQuestions) {
        try {
            const query = `
                INSERT INTO quiz_results (user_id, story_id, score, total_questions)
                VALUES (?, ?, ?, ?)
            `;
            await this.db.run(query, [userId, storyId, score, totalQuestions]);
            return { success: true };
        } catch (error) {
            console.error('Save quiz result error:', error);
            return { success: false };
        }
    }

    async getQuizResults(userId, storyId = null) {
        try {
            let query, params;
            
            if (storyId) {
                query = `
                    SELECT * FROM quiz_results 
                    WHERE user_id = ? AND story_id = ?
                    ORDER BY completed_at DESC
                `;
                params = [userId, storyId];
            } else {
                query = `
                    SELECT * FROM quiz_results 
                    WHERE user_id = ?
                    ORDER BY completed_at DESC
                `;
                params = [userId];
            }
            
            const result = await this.db.query(query, params);
            return result.values || [];
        } catch (error) {
            console.error('Get quiz results error:', error);
            return [];
        }
    }

    // ============================================
    // BADGE METHODS
    // ============================================
    async awardBadge(userId, badgeId) {
        try {
            const query = `
                INSERT INTO user_badges (user_id, badge_id)
                VALUES (?, ?)
            `;
            await this.db.run(query, [userId, badgeId]);
            return { success: true };
        } catch (error) {
            // Badge already awarded or other error
            return { success: false };
        }
    }

    async getUserBadges(userId) {
        try {
            const query = `
                SELECT * FROM user_badges 
                WHERE user_id = ?
                ORDER BY earned_at DESC
            `;
            const result = await this.db.query(query, [userId]);
            return result.values || [];
        } catch (error) {
            console.error('Get badges error:', error);
            return [];
        }
    }

    // ============================================
    // CLEANUP
    // ============================================
    async close() {
        if (this.db) {
            await this.db.close();
            await this.sqlite.closeConnection(this.dbName, false);
        }
    }
}

// Create singleton instance
const db = new VocabVentureDB();

export default db;