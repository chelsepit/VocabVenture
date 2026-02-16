// app/js/database-universal.js
// Universal Database Wrapper - Works on both Electron and Capacitor

class UniversalDatabase {
    constructor() {
        this.db = null;
        this.platform = this.detectPlatform();
        this.initialized = false;
    }

    detectPlatform() {
        if (typeof process !== 'undefined' && process.versions && process.versions.electron) {
            return 'electron';
        } else if (typeof window !== 'undefined' && window.Capacitor) {
            return 'capacitor';
        } else {
            return 'web';
        }
    }

    async initialize() {
        if (this.initialized) return;

        console.log(`Initializing database for ${this.platform}...`);

        if (this.platform === 'electron') {
            await this.initElectron();
        } else if (this.platform === 'capacitor') {
            await this.initCapacitor();
        } else {
            await this.initWeb();
        }

        this.initialized = true;
        console.log('✅ Database initialized');
    }

    // =========================
    // ELECTRON
    // =========================

    async initElectron() {
        const ipcRenderer = window.require?.('electron')?.ipcRenderer;

        if (!ipcRenderer) {
            throw new Error("ipcRenderer not available");
        }

        this.db = {
            login: (name, birthdate) =>
                ipcRenderer.invoke('auth:login', { name, birthdate }),

            register: (name, birthdate) =>
                ipcRenderer.invoke('auth:register', { name, birthdate }),

            saveProgress: (userId, storyId, segmentId) =>
                ipcRenderer.invoke('progress:save', { userId, storyId, segmentId }),

            getProgress: (userId, storyId) =>
                ipcRenderer.invoke('progress:get', { userId, storyId }),

            getAllProgress: (userId) =>
                ipcRenderer.invoke('progress:getAll', userId),

            getOverallProgress: (userId) =>
                ipcRenderer.invoke('progress:getOverall', userId),

            saveQuizResult: (userId, storyId, score, totalQuestions) =>
                ipcRenderer.invoke('quiz:save', { userId, storyId, score, totalQuestions }),

            getUserBadges: (userId) =>
                ipcRenderer.invoke('badge:getAll', userId),

            getUserStats: (userId) =>
                ipcRenderer.invoke('stats:get', userId)
        };
    }

    // =========================
    // CAPACITOR (ANDROID)
    // =========================

    async initCapacitor() {
        console.log("Initializing Capacitor SQLite...");
        console.log("Capacitor plugins:", window.Capacitor?.Plugins);

        const { CapacitorSQLite } = window.Capacitor?.Plugins || {};

        if (!CapacitorSQLite) {
            throw new Error("CapacitorSQLite plugin not loaded. Did you run cap sync?");
        }

        try {
            // Check connection consistency
            const retCC = await CapacitorSQLite.checkConnectionsConsistency({
                dbNames: ["vocabventure.db"]
            });
            
            const isConn = (await CapacitorSQLite.isConnection({ database: "vocabventure.db" })).result;
            
            let db;
            if (retCC.result && isConn) {
                db = await CapacitorSQLite.retrieveConnection({ database: "vocabventure.db" });
            } else {
                db = await CapacitorSQLite.createConnection({
                    database: "vocabventure.db",
                    encrypted: false,
                    mode: "no-encryption",
                    version: 1,
                    readonly: false
                });
            }

            await CapacitorSQLite.open({ database: "vocabventure.db" });
            console.log("✅ Capacitor SQLite opened");

            // ---------- TABLES ----------
            const createTablesSQL = `
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
                    UNIQUE(user_id, story_id, segment_id)
                );
                
                CREATE TABLE IF NOT EXISTS quiz_results (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id INTEGER,
                    story_id INTEGER,
                    score INTEGER,
                    total_questions INTEGER,
                    completed_at DATETIME DEFAULT CURRENT_TIMESTAMP
                );
                
                CREATE TABLE IF NOT EXISTS user_badges (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id INTEGER,
                    badge_id TEXT,
                    earned_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    UNIQUE(user_id, badge_id)
                );
            `;

            await CapacitorSQLite.execute({
                database: "vocabventure.db",
                statements: createTablesSQL
            });

            console.log("✅ Tables created");

            // ---------- API ----------
            this.db = {

                login: async (name, birthdate) => {
                    try {
                        const res = await CapacitorSQLite.query({
                            database: "vocabventure.db",
                            statement: 'SELECT * FROM users WHERE username = ? AND birthdate = ?',
                            values: [name, birthdate]
                        });

                        const row = res.values?.[0];
                        if (!row) {
                            return { success: false, message: "Invalid credentials" };
                        }

                        return { success: true, user: row };
                    } catch (error) {
                        console.error("Login error:", error);
                        return { success: false, message: error.message };
                    }
                },

                register: async (name, birthdate) => {
                    try {
                        const exists = await CapacitorSQLite.query({
                            database: "vocabventure.db",
                            statement: 'SELECT id FROM users WHERE username = ? AND birthdate = ?',
                            values: [name, birthdate]
                        });

                        if (exists.values?.length) {
                            return { success: false, message: "User exists" };
                        }

                        const r = await CapacitorSQLite.run({
                            database: "vocabventure.db",
                            statement: 'INSERT INTO users (username, birthdate) VALUES (?, ?)',
                            values: [name, birthdate]
                        });

                        return { success: true, userId: r.changes?.lastId };
                    } catch (error) {
                        console.error("Register error:", error);
                        return { success: false, message: error.message };
                    }
                },

                saveProgress: async (userId, storyId, segmentId) => {
                    try {
                        await CapacitorSQLite.run({
                            database: "vocabventure.db",
                            statement: `INSERT OR REPLACE INTO progress
                                (user_id, story_id, segment_id, completed, completed_at)
                                VALUES (?, ?, ?, 1, datetime('now'))`,
                            values: [userId, storyId, segmentId]
                        });
                        return { success: true };
                    } catch (error) {
                        console.error("Save progress error:", error);
                        return { success: false };
                    }
                },

                getProgress: async (userId, storyId) => {
                    try {
                        const r = await CapacitorSQLite.query({
                            database: "vocabventure.db",
                            statement: 'SELECT * FROM progress WHERE user_id = ? AND story_id = ?',
                            values: [userId, storyId]
                        });
                        return r.values || [];
                    } catch (error) {
                        console.error("Get progress error:", error);
                        return [];
                    }
                },

                getAllProgress: async (userId) => {
                    try {
                        const r = await CapacitorSQLite.query({
                            database: "vocabventure.db",
                            statement: 'SELECT * FROM progress WHERE user_id = ?',
                            values: [userId]
                        });
                        return r.values || [];
                    } catch (error) {
                        console.error("Get all progress error:", error);
                        return [];
                    }
                },

                getOverallProgress: async (userId) => {
                    try {
                        const r = await CapacitorSQLite.query({
                            database: "vocabventure.db",
                            statement: 'SELECT COUNT(*) as c FROM progress WHERE user_id = ? AND completed = 1',
                            values: [userId]
                        });

                        const completed = r.values?.[0]?.c || 0;
                        const total = 42;

                        return {
                            completed,
                            total,
                            percentage: Math.round((completed / total) * 100)
                        };
                    } catch (error) {
                        console.error("Get overall progress error:", error);
                        return { completed: 0, total: 42, percentage: 0 };
                    }
                },

                saveQuizResult: async (userId, storyId, score, totalQuestions) => {
                    try {
                        await CapacitorSQLite.run({
                            database: "vocabventure.db",
                            statement: 'INSERT INTO quiz_results (user_id, story_id, score, total_questions, completed_at) VALUES (?, ?, ?, ?, datetime("now"))',
                            values: [userId, storyId, score, totalQuestions]
                        });
                        return { success: true };
                    } catch (error) {
                        console.error("Save quiz error:", error);
                        return { success: false };
                    }
                },

                getUserBadges: async (userId) => {
                    try {
                        const r = await CapacitorSQLite.query({
                            database: "vocabventure.db",
                            statement: 'SELECT * FROM user_badges WHERE user_id = ?',
                            values: [userId]
                        });
                        return r.values || [];
                    } catch (error) {
                        console.error("Get badges error:", error);
                        return [];
                    }
                },

                getUserStats: async (userId) => {
                    try {
                        const progress = await this.db.getOverallProgress(userId);
                        const badges = await this.db.getUserBadges(userId);

                        return {
                            progress,
                            totalBadges: badges.length
                        };
                    } catch (error) {
                        console.error("Get stats error:", error);
                        return {
                            progress: { completed: 0, total: 42, percentage: 0 },
                            totalBadges: 0
                        };
                    }
                }
            };
        } catch (error) {
            console.error("Capacitor SQLite initialization error:", error);
            throw error;
        }
    }

    // =========================
    // WEB FALLBACK
    // =========================

    async initWeb() {
        console.warn("Using web fallback DB");

        this.db = {
            login: async () => ({ success: false }),
            register: async () => ({ success: false }),
            saveProgress: async () => ({}),
            getProgress: async () => [],
            getAllProgress: async () => [],
            getOverallProgress: async () => ({ completed: 0, total: 42, percentage: 0 }),
            saveQuizResult: async () => ({}),
            getUserBadges: async () => [],
            getUserStats: async () => ({ progress: { completed: 0, total: 42, percentage: 0 }, totalBadges: 0 })
        };
    }

    // =========================
    // PROXY METHODS
    // =========================

    login(...a) { return this.db.login(...a); }
    register(...a) { return this.db.register(...a); }
    saveProgress(...a) { return this.db.saveProgress(...a); }
    getProgress(...a) { return this.db.getProgress(...a); }
    getAllProgress(...a) { return this.db.getAllProgress(...a); }
    getOverallProgress(...a) { return this.db.getOverallProgress(...a); }
    saveQuizResult(...a) { return this.db.saveQuizResult(...a); }
    getUserBadges(...a) { return this.db.getUserBadges(...a); }
    getUserStats(...a) { return this.db.getUserStats(...a); }
}

const db = new UniversalDatabase();

if (typeof window !== 'undefined') {
    window.db = db;
    db.initialize().catch(e => console.error("DB init failed:", e));
}

if (typeof module !== 'undefined') {
    module.exports = db;
}