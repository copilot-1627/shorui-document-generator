// In-memory data storage
// In production, you would use a proper database like MongoDB or PostgreSQL

const users = [
    {
        id: 1,
        googleId: "demo123456",
        email: "demo@gmail.com",
        firstName: "Demo",
        lastName: "User",
        phone: "+1234567890",
        createdAt: new Date().toISOString(),
        isComplete: true
    }
];

const chatSessions = [
    {
        id: 1,
        userId: 1,
        topic: "Business Proposal for AI Startup",
        aiResponse: `{
            "filename": "business-proposal-doc-abc123.docx"
        }
        
        Python code:
        from docx import Document
        from docx.shared import Inches
        
        doc = Document()
        doc.add_heading('Business Proposal: AI Startup', 0)
        doc.add_paragraph('Executive Summary')
        doc.add_paragraph('This proposal outlines our innovative AI startup concept...')
        doc.save('business-proposal-doc-abc123.docx')`,
        generatedFile: "business-proposal-doc-abc123.docx",
        timestamp: new Date(Date.now() - 86400000), // 1 day ago
        status: "completed"
    }
];

const usageLimits = {
    1: {
        documentsGenerated: 1,
        monthlyLimit: 10,
        resetDate: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1)
    }
};

// Helper functions
const getUserById = (id) => users.find(user => user.id === id);
const getUserByGoogleId = (googleId) => users.find(user => user.googleId === googleId);
const getUserByPhone = (phone) => users.find(user => user.phone === phone);
const getChatSessionsByUserId = (userId) => chatSessions.filter(session => session.userId === userId);
const getUserUsage = (userId) => usageLimits[userId] || { documentsGenerated: 0, monthlyLimit: 10 };

module.exports = {
    users,
    chatSessions,
    usageLimits,
    getUserById,
    getUserByGoogleId,
    getUserByPhone,
    getChatSessionsByUserId,
    getUserUsage
};