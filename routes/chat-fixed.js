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

// Chat interface route
router.get('/', requireAuth, (req, res) => {
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
                        <span class="text-sm text-gray-700">Hello, ${req.user.firstName}!</span>
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
                <div id="chatMessages" class="p-6 space-y-4 min-h-64 max-h-96 overflow-y-auto">
                    <!-- Welcome Message -->
                    <div class="flex items-start space-x-3">
                        <div class="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                            <i class="fas fa-robot text-white text-sm"></i>
                        </div>
                        <div class="flex-1">
                            <div class="bg-gray-100 rounded-lg p-4">
                                <p class="text-gray-800">
                                    Hi! I'm your AI document generator. What kind of document would you like me to create for you today? 
                                    Just describe the topic or type of document you need.
                                </p>
                            </div>
                            <p class="text-xs text-gray-500 mt-1">AI Assistant</p>
                        </div>
                    </div>
                </div>
                
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
                            <button id="viewDocumentBtn" class="w-full bg-blue-600 text-white py-2 px-4 rounded-lg font-medium hover:bg-blue-700 transition-colors">
                                View Document Details
                            </button>
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
            let currentSessionId = null;
            let currentFilename = null;
            
            document.getElementById('documentForm').addEventListener('submit', async function(e) {
                e.preventDefault();
                
                const topic = document.getElementById('topic').value.trim();
                if (!topic) return;
                
                // Show user message
                addMessage(topic, 'user');
                
                // Clear input
                document.getElementById('topic').value = '';
                
                // Show loading
                showLoadingModal();
                
                try {
                    const response = await fetch('/chat/generate', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({ topic: topic })
                    });
                    
                    const data = await response.json();
                    
                    if (data.success) {
                        currentSessionId = data.sessionId;
                        currentFilename = data.filename;
                        
                        // Show AI response
                        hideLoadingModal();
                        addMessage(data.response, 'ai');
                        
                        // Show success modal after a short delay
                        setTimeout(() => {
                            showSuccessModal();
                        }, 1500);
                    } else {
                        hideLoadingModal();
                        addMessage('Sorry, I encountered an error generating your document: ' + data.error, 'ai');
                    }
                } catch (error) {
                    hideLoadingModal();
                    addMessage('Sorry, I encountered an error. Please try again.', 'ai');
                    console.error('Error:', error);
                }
            });
            
            function addMessage(content, type) {
                const messagesContainer = document.getElementById('chatMessages');
                const messageDiv = document.createElement('div');
                messageDiv.className = 'flex items-start space-x-3';
                
                if (type === 'user') {
                    messageDiv.innerHTML = \`
                        <div class="flex-1"></div>
                        <div class="flex-shrink-0">
                            <div class="bg-blue-600 text-white rounded-lg p-4 max-w-xs">
                                <p>\${content}</p>
                            </div>
                            <p class="text-xs text-gray-500 mt-1 text-right">You</p>
                        </div>
                        <div class="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
                            <i class="fas fa-user text-white text-sm"></i>
                        </div>
                    \`;
                } else {
                    messageDiv.innerHTML = \`
                        <div class="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                            <i class="fas fa-robot text-white text-sm"></i>
                        </div>
                        <div class="flex-1">
                            <div class="bg-gray-100 rounded-lg p-4">
                                <pre class="text-gray-800 whitespace-pre-wrap text-sm">\${content}</pre>
                            </div>
                            <p class="text-xs text-gray-500 mt-1">AI Assistant</p>
                        </div>
                    \`;
                }
                
                messagesContainer.appendChild(messageDiv);
                messagesContainer.scrollTop = messagesContainer.scrollHeight;
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
            
            // Success modal event listeners
            document.getElementById('viewDocumentBtn').addEventListener('click', function() {
                if (currentSessionId) {
                    window.location.href = \`/chat/\${currentSessionId}\`;
                }
            });
            
            document.getElementById('downloadDocumentBtn').addEventListener('click', function() {
                if (currentFilename) {
                    window.location.href = \`/chat/download/\${currentFilename}\`;
                }
            });
            
            document.getElementById('createAnotherBtn').addEventListener('click', function() {
                hideSuccessModal();
                document.getElementById('topic').focus();
            });
            
            // Auto-resize textarea
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
    <div>Chat Session Details for: ${session.topic}</div>
    <p>Generated file: ${session.generatedFile}</p>
    <a href="/dashboard">Back to Dashboard</a>
    `);
});

// Generate document route
router.post('/generate', requireAuth, async (req, res) => {
    console.log('Generate document request from:', req.user.email);
    
    try {
        const { topic } = req.body;
        
        if (!topic || topic.trim() === '') {
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
            topic: topic,
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
            response: aiResponse,
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
    
    // In a real application, you would serve the actual file
    // For demo purposes, we'll simulate a download
    res.setHeader('Content-Disposition', \`attachment; filename="\${filename}"\`);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    
    // Simulate file content
    const demoContent = \`Demo document content for: \${filename}\nGenerated by Shorui AI Document Generator\nUser: \${req.user.email}\nTimestamp: \${new Date().toISOString()}\`;
    res.send(demoContent);
});

// Function to call Perplexity API (simulated)
async function callPerplexityAPI(topic) {
    // In production, replace this with actual Perplexity API call
    const systemPrompt = \`You are a document generator. Generate Python code that creates professional documents based on the given topic. Your response should ONLY contain: 1) A JSON object with the filename (format: topic-doc-{random6digits}.docx), 2) Python code block that uses python-docx library to create the document. Do not provide any other text or explanations.\`;
    
    try {
        // Simulate API call - in production use actual Perplexity API
        const mockResponse = generateMockAIResponse(topic);
        return mockResponse;
        
        /* Uncomment and configure for actual Perplexity API usage:
        const response = await axios.post('https://api.perplexity.ai/chat/completions', {
            model: 'claude-3.5-sonnet',
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: \`Generate a document about: \${topic}\` }
            ]
        }, {
            headers: {
                'Authorization': \`Bearer \${process.env.PERPLEXITY_API_KEY}\`,
                'Content-Type': 'application/json'
            }
        });
        
        return response.data.choices[0].message.content;
        */
    } catch (error) {
        console.error('AI API Error:', error);
        throw new Error('Failed to generate document with AI');
    }
}

// Generate mock AI response for demo
function generateMockAIResponse(topic) {
    const randomId = Math.random().toString(36).substring(2, 8);
    const filename = \`\${topic.toLowerCase().replace(/\\s+/g, '-')}-doc-\${randomId}.docx\`;
    
    const responses = {
        'business proposal': {
            json: { filename: filename },
            python: \`from docx import Document\nfrom docx.shared import Inches\nfrom docx.enum.text import WD_ALIGN_PARAGRAPH\n\ndoc = Document()\n\n# Title\ntitle = doc.add_heading('Business Proposal', 0)\ntitle.alignment = WD_ALIGN_PARAGRAPH.CENTER\n\n# Executive Summary\ndoc.add_heading('Executive Summary', level=1)\ndoc.add_paragraph('This business proposal outlines a comprehensive strategy for market expansion and growth.')\n\n# Market Analysis\ndoc.add_heading('Market Analysis', level=1)\ndoc.add_paragraph('Current market conditions show significant opportunities for growth in our target sector.')\n\n# Financial Projections\ndoc.add_heading('Financial Projections', level=1)\ntable = doc.add_table(rows=4, cols=3)\nhdr_cells = table.rows[0].cells\nhdr_cells[0].text = 'Year'\nhdr_cells[1].text = 'Revenue'\nhdr_cells[2].text = 'Profit'\n\ndoc.save('\${filename}')\nprint('Business proposal document generated successfully!')\`
        },
        'project report': {
            json: { filename: filename },
            python: \`from docx import Document\nfrom docx.shared import Inches\n\ndoc = Document()\n\n# Title\ndoc.add_heading('Project Report', 0)\n\n# Introduction\ndoc.add_heading('1. Introduction', level=1)\ndoc.add_paragraph('This report provides a comprehensive overview of the project objectives and outcomes.')\n\n# Methodology\ndoc.add_heading('2. Methodology', level=1)\ndoc.add_paragraph('The project followed a structured approach with defined phases and milestones.')\n\n# Results\ndoc.add_heading('3. Results', level=1)\ndoc.add_paragraph('Key findings and achievements are outlined in this section.')\n\n# Conclusion\ndoc.add_heading('4. Conclusion', level=1)\ndoc.add_paragraph('The project was completed successfully within the specified timeframe.')\n\ndoc.save('\${filename}')\nprint('Project report generated successfully!')\`
        }
    };
    
    // Find matching template or use default
    const matchedKey = Object.keys(responses).find(key => 
        topic.toLowerCase().includes(key)
    );
    
    const template = responses[matchedKey] || {
        json: { filename: filename },
        python: \`from docx import Document\n\ndoc = Document()\ndoc.add_heading('\${topic}', 0)\ndoc.add_paragraph('This document was automatically generated based on the topic: \${topic}')\ndoc.add_paragraph('Content goes here...')\ndoc.save('\${filename}')\nprint('Document generated successfully!')\`
    };
    
    return \`\\\`\\\`\\\`json\n\${JSON.stringify(template.json, null, 2)}\n\\\`\\\`\\\`\n\n\\\`\\\`\\\`python\n\${template.python}\n\\\`\\\`\\\`\`;
}

// Extract filename from AI response
function extractFilenameFromResponse(response) {
    try {
        const jsonMatch = response.match(/\\\`\\\`\\\`json\\s*([\\s\\S]*?)\\\`\\\`\\\`/);
        if (jsonMatch) {
            const jsonData = JSON.parse(jsonMatch[1]);
            return jsonData.filename;
        }
    } catch (error) {
        console.error('Error extracting filename:', error);
    }
    return \`document-\${Date.now()}.docx\`;
}

module.exports = router;