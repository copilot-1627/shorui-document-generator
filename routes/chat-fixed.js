const express = require('express');
const axios = require('axios');
const { v4: uuidv4 } = require('uuid');
const router = express.Router();
const { ChatStorage, UsageStorage } = require('../models/storage');

// Middleware to check authentication
const requireAuth = (req, res, next) => {
    if (!req.isAuthenticated() || !req.user || !req.user.isComplete) {
        return res.redirect('/');
    }
    next();
};

// Utility: escape HTML and template literals safely
function escapeHTML(str = '') {
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}
function escapeForTemplate(str = '') {
    // Escape backticks and ${ to avoid breaking template literals
    return String(str)
        .replace(/`/g, '\\`')
        .replace(/\$\{/g, '\\${');
}

// Chat interface route
router.get('/', requireAuth, (req, res) => {
    const safeFirstName = escapeHTML(req.user.firstName);
    res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Create Document - Shorui</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css" rel="stylesheet">
        <link href="/css/custom.css" rel="stylesheet">
    </head>
    <body class="bg-gray-50 min-h-screen">
        <!-- Header -->
        <header class="bg-white shadow-sm border-b">
            <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div class="flex justify-between items-center h-16">
                    <div class="flex items-center">
                        <a href="/" class="text-2xl font-bold text-blue-600">
                            <i class="fas fa-file-alt mr-2"></i>Shorui
                        </a>
                    </div>
                    <div class="flex items-center space-x-4">
                        <a href="/dashboard" class="text-gray-700 hover:text-blue-600">Dashboard</a>
                        <span class="text-sm text-gray-700">Hello, ${safeFirstName}!</span>
                        <a href="/auth/logout" class="bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 transition-colors">
                            <i class="fas fa-sign-out-alt mr-1"></i>Logout
                        </a>
                    </div>
                </div>
            </div>
        </header>
        
        <!-- Main Content -->
        <main class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <!-- Header -->
            <div class="bg-white rounded-lg shadow-sm p-6 mb-6">
                <div class="flex items-center justify-between">
                    <div>
                        <h1 class="text-2xl font-bold text-gray-900 mb-2">Create New Document</h1>
                        <p class="text-gray-600">Describe what kind of document you need, and our AI will generate it for you</p>
                    </div>
                    <a href="/dashboard" class="text-gray-500 hover:text-gray-700">
                        <i class="fas fa-arrow-left mr-2"></i>Back to Dashboard
                    </a>
                </div>
            </div>
            
            <!-- Chat Interface -->
            <div class="bg-white rounded-lg shadow-sm min-h-96">
                <!-- Chat Messages Area -->
                <div id="chatMessages" class="p-6 space-y-4 min-h-64 max-h-96 overflow-y-auto"></div>
                
                <!-- Input Area -->
                <div class="border-t border-gray-200 p-6">
                    <form id="documentForm" class="space-y-4">
                        <div>
                            <label for="topic" class="block text-sm font-medium text-gray-700 mb-2">
                                Document Topic *
                            </label>
                            <textarea 
                                id="topic" 
                                name="topic" 
                                rows="3" 
                                required
                                class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent resize-none"
                                placeholder="e.g., Business proposal for an AI startup, Project report for Q4 marketing campaign, Meeting minutes template, etc."
                            ></textarea>
                        </div>
                        
                        <div class="flex items-center justify-between">
                            <div class="text-sm text-gray-500">
                                <i class="fas fa-info-circle mr-1"></i>
                                Be specific about the type and purpose of your document for best results
                            </div>
                            <button 
                                type="submit" 
                                id="generateBtn"
                                class="bg-blue-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <i class="fas fa-magic mr-2"></i>Generate Document
                            </button>
                        </div>
                    </form>
                </div>
            </div>
            
            <!-- Loading Modal -->
            <div id="loadingModal" class="hidden fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                <div class="bg-white rounded-lg p-8 max-w-sm w-full mx-4">
                    <div class="text-center">
                        <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                        <h3 class="text-lg font-medium text-gray-900 mb-2">Generating Document</h3>
                        <p class="text-gray-600">Our AI is creating your document...</p>
                    </div>
                </div>
            </div>
            
            <!-- Success Modal -->
            <div id="successModal" class="hidden fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                <div class="bg-white rounded-lg p-8 max-w-md w-full mx-4">
                    <div class="text-center">
                        <div class="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <i class="fas fa-check text-green-600 text-2xl"></i>
                        </div>
                        <h3 class="text-lg font-medium text-gray-900 mb-2">Document Generated!</h3>
                        <p class="text-gray-600 mb-6">Your document has been successfully created.</p>
                        <div class="space-y-3">
                            <button id="downloadDocumentBtn" class="w-full border border-gray-300 text-gray-700 py-2 px-4 rounded-lg font-medium hover:bg-gray-50 transition-colors">
                                Download Document
                            </button>
                            <button id="createAnotherBtn" class="w-full text-blue-600 font-medium hover:text-blue-700 transition-colors">
                                Create Another Document
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </main>
        
        <script>
            function escapeHTMLClient(str = '') {
                return String(str)
                    .replace(/&/g, '&amp;')
                    .replace(/</g, '&lt;')
                    .replace(/>/g, '&gt;')
                    .replace(/\"/g, '&quot;')
                    .replace(/'/g, '&#39;');
            }
            
            let currentFilename = null;
            let downloadUrl = null;
            const chatMessagesEl = document.getElementById('chatMessages');
            
            // Initial welcome message (build DOM elements safely)
            (function initWelcome(){
                const wrap = document.createElement('div');
                wrap.className = 'flex items-start space-x-3';
                wrap.innerHTML = `
                    <div class="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                        <i class="fas fa-robot text-white text-sm"></i>
                    </div>
                    <div class="flex-1">
                        <div class="bg-gray-100 rounded-lg p-4">
                            <p class="text-gray-800">Hi! I'm your AI document generator. What kind of document would you like me to create for you today? Just describe the topic or type of document you need.</p>
                        </div>
                        <p class="text-xs text-gray-500 mt-1">AI Assistant</p>
                    </div>`;
                chatMessagesEl.appendChild(wrap);
            })();
            
            document.getElementById('documentForm').addEventListener('submit', async function(e) {
                e.preventDefault();
                
                const topicRaw = document.getElementById('topic').value.trim();
                if (!topicRaw) return;
                
                const topic = escapeHTMLClient(topicRaw);
                addMessage(topic, 'user');
                document.getElementById('topic').value = '';
                showLoadingModal();
                
                try {
                    const response = await fetch('/chat/generate', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ topic: topicRaw })
                    });
                    const data = await response.json();
                    if (data.success) {
                        currentFilename = data.filename;
                        downloadUrl = data.downloadUrl || ('/chat/download/' + data.filename);
                        hideLoadingModal();
                        addMessage('Your document is ready: ' + escapeHTMLClient(data.filename), 'ai');
                        setTimeout(() => { showSuccessModal(); }, 600);
                    } else {
                        hideLoadingModal();
                        addMessage('Sorry, error generating your document: ' + escapeHTMLClient(data.error || 'Unknown error'), 'ai');
                    }
                } catch (error) {
                    hideLoadingModal();
                    console.error('Client error:', error);
                    addMessage('A network error occurred. Please try again.', 'ai');
                }
            });
            
            function addMessage(content, type) {
                const wrap = document.createElement('div');
                wrap.className = 'flex items-start space-x-3';
                if (type === 'user') {
                    wrap.innerHTML = `
                        <div class="flex-1"></div>
                        <div class="flex-shrink-0">
                            <div class="bg-blue-600 text-white rounded-lg p-4 max-w-xs">
                                <p>${content}</p>
                            </div>
                            <p class="text-xs text-gray-500 mt-1 text-right">You</p>
                        </div>
                        <div class="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
                            <i class="fas fa-user text-white text-sm"></i>
                        </div>`;
                } else {
                    wrap.innerHTML = `
                        <div class="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                            <i class="fas fa-robot text-white text-sm"></i>
                        </div>
                        <div class="flex-1">
                            <div class="bg-gray-100 rounded-lg p-4">
                                <p class="text-gray-800 whitespace-pre-wrap text-sm">${content}</p>
                            </div>
                            <p class="text-xs text-gray-500 mt-1">AI Assistant</p>
                        </div>`;
                }
                chatMessagesEl.appendChild(wrap);
                chatMessagesEl.scrollTop = chatMessagesEl.scrollHeight;
            }
            
            function showLoadingModal() {
                document.getElementById('loadingModal').classList.remove('hidden');
                document.getElementById('generateBtn').disabled = true;
            }
            function hideLoadingModal() {
                document.getElementById('loadingModal').classList.add('hidden');
                document.getElementById('generateBtn').disabled = false;
            }
            function showSuccessModal() {
                document.getElementById('successModal').classList.remove('hidden');
            }
            function hideSuccessModal() {
                document.getElementById('successModal').classList.add('hidden');
            }
            document.getElementById('downloadDocumentBtn').addEventListener('click', function() {
                if (downloadUrl) { window.location.href = downloadUrl; hideSuccessModal(); }
            });
            document.getElementById('createAnotherBtn').addEventListener('click', function() {
                hideSuccessModal();
                document.getElementById('topic').focus();
            });
            document.getElementById('topic').addEventListener('input', function() {
                this.style.height = 'auto';
                this.style.height = this.scrollHeight + 'px';
            });
        </script>
    </body>
    </html>
    `);
});

// Get specific chat session
router.get('/:sessionId', requireAuth, (req, res) => {
    const sessionId = parseInt(req.params.sessionId);
    const session = ChatStorage.findById(sessionId);
    
    if (!session || session.userId !== req.user.id) {
        return res.redirect('/dashboard');
    }
    
    res.send(`
    <div>Chat Session Details for: ${escapeHTML(session.topic)}</div>
    <p>Generated file: ${escapeHTML(session.generatedFile)}</p>
    <a href="/dashboard">Back to Dashboard</a>
    `);
});

// Generate document route
router.post('/generate', requireAuth, async (req, res) => {
    console.log('Generate document request from:', req.user.email);
    
    try {
        const { topic } = req.body;
        
        if (!topic || String(topic).trim() === '') {
            return res.status(400).json({ error: 'Topic is required' });
        }
        
        // Check usage limits
        const usage = UsageStorage.get(req.user.id);
        if (usage.documentsGenerated >= usage.monthlyLimit) {
            return res.status(429).json({ error: 'Monthly document limit reached' });
        }
        
        console.log('Generating document for topic:', topic);
        
        // Simulate AI call to Perplexity API
        const aiResponse = await callPerplexityAPI(topic);
        
        // Create new chat session
        const newSession = ChatStorage.create({
            userId: req.user.id,
            topic: String(topic),
            aiResponse: aiResponse,
            generatedFile: extractFilenameFromResponse(aiResponse),
            status: "completed"
        });
        
        // Update usage
        UsageStorage.increment(req.user.id);
        
        console.log('Document generated successfully:', newSession.id);
        
        res.json({
            success: true,
            sessionId: newSession.id,
            response: 'Document created',
            filename: newSession.generatedFile
        });
        
    } catch (error) {
        console.error('Error generating document:', error);
        res.status(500).json({ error: 'Failed to generate document' });
    }
});

// Download document route
router.get('/download/:filename', requireAuth, (req, res) => {
    const filename = req.params.filename;
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    const demoContent = `Demo document content for: ${filename}\nGenerated by Shorui AI Document Generator\nUser: ${req.user.email}\nTimestamp: ${new Date().toISOString()}`;
    res.send(demoContent);
});

// Function to call Perplexity API (simulated)
async function callPerplexityAPI(topic) {
    try {
        return generateMockAIResponse(String(topic));
    } catch (error) {
        console.error('AI API Error:', error);
        throw new Error('Failed to generate document with AI');
    }
}

// Generate mock AI response for demo
function generateMockAIResponse(topic) {
    const randomId = Math.random().toString(36).substring(2, 8);
    const filename = `${String(topic).toLowerCase().replace(/\s+/g, '-')}-doc-${randomId}.docx`;
    const jsonBlock = JSON.stringify({ filename }, null, 2);
    const python = `from docx import Document\n\ndoc = Document()\ndoc.add_heading('${escapeForTemplate(String(topic))}', 0)\ndoc.add_paragraph('Auto generated for: ${escapeForTemplate(String(topic))}')\ndoc.save('${filename}')`;
    return `\`\`\`json\n${jsonBlock}\n\`\`\`\n\n\`\`\`python\n${python}\n\`\`\``;
}

// Extract filename from AI response
function extractFilenameFromResponse(response) {
    try {
        const jsonMatch = response.match(/\`\`\`json\s*([\s\S]*?)\`\`\`/);
        if (jsonMatch) {
            const jsonData = JSON.parse(jsonMatch[1]);
            if (jsonData && jsonData.filename) return jsonData.filename;
        }
    } catch (error) {
        console.error('Error extracting filename:', error);
    }
    return `document-${Date.now()}.docx`;
}

module.exports = router;
