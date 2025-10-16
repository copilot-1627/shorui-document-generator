const fs = require('fs');
const path = require('path');

// Storage directory
const DATA_DIR = path.join(__dirname, '../data');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
}

// File paths
const FILES = {
    users: path.join(DATA_DIR, 'users.json'),
    chatSessions: path.join(DATA_DIR, 'chatSessions.json'),
    usageLimits: path.join(DATA_DIR, 'usageLimits.json'),
    sessions: path.join(DATA_DIR, 'sessions.json')
};

// Initialize files with default data if they don't exist
const initializeFiles = () => {
    const defaultData = {
        users: [],
        chatSessions: [],
        usageLimits: {},
        sessions: {}
    };
    
    Object.keys(FILES).forEach(key => {
        if (!fs.existsSync(FILES[key])) {
            fs.writeFileSync(FILES[key], JSON.stringify(defaultData[key], null, 2));
            console.log(`Created ${key}.json with default data`);
        }
    });
};

// Read data from file
const readData = (filename) => {
    try {
        const filePath = FILES[filename];
        if (fs.existsSync(filePath)) {
            const data = fs.readFileSync(filePath, 'utf8');
            return JSON.parse(data);
        }
        return filename === 'usageLimits' || filename === 'sessions' ? {} : [];
    } catch (error) {
        console.error(`Error reading ${filename}:`, error);
        return filename === 'usageLimits' || filename === 'sessions' ? {} : [];
    }
};

// Write data to file
const writeData = (filename, data) => {
    try {
        const filePath = FILES[filename];
        fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
        return true;
    } catch (error) {
        console.error(`Error writing ${filename}:`, error);
        return false;
    }
};

// User operations
const UserStorage = {
    getAll: () => readData('users'),
    
    findById: (id) => {
        const users = readData('users');
        return users.find(user => user.id === id);
    },
    
    findByGoogleId: (googleId) => {
        const users = readData('users');
        return users.find(user => user.googleId === googleId);
    },
    
    findByPhone: (phone) => {
        const users = readData('users');
        return users.find(user => user.phone === phone);
    },
    
    create: (userData) => {
        const users = readData('users');
        const newUser = {
            id: users.length > 0 ? Math.max(...users.map(u => u.id)) + 1 : 1,
            ...userData,
            createdAt: new Date().toISOString()
        };
        users.push(newUser);
        writeData('users', users);
        return newUser;
    },
    
    update: (id, updates) => {
        const users = readData('users');
        const index = users.findIndex(user => user.id === id);
        if (index !== -1) {
            users[index] = { ...users[index], ...updates };
            writeData('users', users);
            return users[index];
        }
        return null;
    },
    
    delete: (id) => {
        const users = readData('users');
        const filteredUsers = users.filter(user => user.id !== id);
        writeData('users', filteredUsers);
        return filteredUsers.length < users.length;
    }
};

// Chat session operations
const ChatStorage = {
    getAll: () => readData('chatSessions'),
    
    findByUserId: (userId) => {
        const sessions = readData('chatSessions');
        return sessions.filter(session => session.userId === userId);
    },
    
    create: (sessionData) => {
        const sessions = readData('chatSessions');
        const newSession = {
            id: sessions.length > 0 ? Math.max(...sessions.map(s => s.id)) + 1 : 1,
            ...sessionData,
            timestamp: new Date().toISOString()
        };
        sessions.push(newSession);
        writeData('chatSessions', sessions);
        return newSession;
    },
    
    findById: (id) => {
        const sessions = readData('chatSessions');
        return sessions.find(session => session.id === id);
    }
};

// Usage limits operations
const UsageStorage = {
    get: (userId) => {
        const limits = readData('usageLimits');
        return limits[userId] || {
            documentsGenerated: 0,
            monthlyLimit: 10,
            resetDate: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1)
        };
    },
    
    set: (userId, data) => {
        const limits = readData('usageLimits');
        limits[userId] = data;
        writeData('usageLimits', limits);
        return limits[userId];
    },
    
    increment: (userId) => {
        const limits = readData('usageLimits');
        if (!limits[userId]) {
            limits[userId] = {
                documentsGenerated: 0,
                monthlyLimit: 10,
                resetDate: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1)
            };
        }
        limits[userId].documentsGenerated++;
        writeData('usageLimits', limits);
        return limits[userId];
    }
};

// Session storage operations
const SessionStorage = {
    get: (sessionId) => {
        const sessions = readData('sessions');
        return sessions[sessionId];
    },
    
    set: (sessionId, data) => {
        const sessions = readData('sessions');
        sessions[sessionId] = {
            ...data,
            lastAccess: new Date().toISOString()
        };
        writeData('sessions', sessions);
    },
    
    delete: (sessionId) => {
        const sessions = readData('sessions');
        delete sessions[sessionId];
        writeData('sessions', sessions);
    },
    
    cleanup: () => {
        const sessions = readData('sessions');
        const now = new Date();
        const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        
        Object.keys(sessions).forEach(sessionId => {
            const session = sessions[sessionId];
            if (session.lastAccess && new Date(session.lastAccess) < oneDayAgo) {
                delete sessions[sessionId];
            }
        });
        
        writeData('sessions', sessions);
    }
};

// Initialize storage on startup
initializeFiles();

// Cleanup old sessions periodically
setInterval(() => {
    SessionStorage.cleanup();
}, 60 * 60 * 1000); // Every hour

module.exports = {
    UserStorage,
    ChatStorage,
    UsageStorage,
    SessionStorage,
    initializeFiles
};