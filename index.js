const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const VocabVentureDB = require('./app/js/database');

let mainWindow;
let db;

function createWindow() {
    // Initialize database
    db = new VocabVentureDB();
    
    mainWindow = new BrowserWindow({
        width: 1280,
        height: 800,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false
        }
    });

    // Open DevTools in development
    if (process.env.NODE_ENV === 'development') {
        mainWindow.webContents.openDevTools();
    }
    
    // Load your main index.html
    mainWindow.loadFile('app/index.html');

    mainWindow.on('closed', () => {
        mainWindow = null;
    });
}

// ============================================
// IPC HANDLERS - Bridge to your database
// ============================================

// Database initialization
ipcMain.handle('db-init', async () => {
    try {
        return { success: true };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

// Generic database operations
ipcMain.handle('db-run', async (event, { sql, params }) => {
    try {
        // This is a simple wrapper - you might need to adjust based on your queries
        const stmt = db.db.prepare(sql);
        const result = stmt.run(...params);
        return { success: true, changes: result.changes, lastInsertRowid: result.lastInsertRowid };
    } catch (error) {
        console.error('DB Run error:', error);
        return { success: false, error: error.message };
    }
});

ipcMain.handle('db-get', async (event, { sql, params }) => {
    try {
        const stmt = db.db.prepare(sql);
        return stmt.get(...params);
    } catch (error) {
        console.error('DB Get error:', error);
        return null;
    }
});

ipcMain.handle('db-all', async (event, { sql, params }) => {
    try {
        const stmt = db.db.prepare(sql);
        return stmt.all(...params);
    } catch (error) {
        console.error('DB All error:', error);
        return [];
    }
});

// Direct method handlers (using your existing database methods)
ipcMain.handle('auth:login', async (event, { name, birthdate }) => {
    return db.login(name, birthdate);
});

ipcMain.handle('auth:register', async (event, { name, birthdate }) => {
    return db.register(name, birthdate);
});

ipcMain.handle('progress:save', async (event, { userId, storyId, segmentId }) => {
    try {
        db.saveProgress(userId, storyId, segmentId);
        return { success: true };
    } catch (error) {
        return { success: false, message: error.message };
    }
});

ipcMain.handle('progress:get', async (event, { userId, storyId }) => {
    return db.getProgress(userId, storyId);
});

ipcMain.handle('progress:getAll', async (event, userId) => {
    return db.getAllProgress(userId);
});

ipcMain.handle('progress:getOverall', async (event, userId) => {
    return db.getOverallProgress(userId);
});

ipcMain.handle('quiz:save', async (event, { userId, storyId, score, totalQuestions }) => {
    try {
        db.saveQuizResult(userId, storyId, score, totalQuestions);
        return { success: true };
    } catch (error) {
        return { success: false, message: error.message };
    }
});

ipcMain.handle('badge:getAll', async (event, userId) => {
    return db.getUserBadges(userId);
});

ipcMain.handle('stats:get', async (event, userId) => {
    return db.getUserStats(userId);
});

// ============================================
// APP LIFECYCLE
// ============================================

app.whenReady().then(() => {
    createWindow();

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});

app.on('window-all-closed', () => {
    if (db) {
        db.close();
        console.log('Database closed');
    }
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('quit', () => {
    if (db) db.close();
});