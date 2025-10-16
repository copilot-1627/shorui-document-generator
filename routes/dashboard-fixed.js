const express = require('express');
const router = express.Router();
const { ChatStorage, UsageStorage } = require('../models/storage');

// Middleware to check authentication
const requireAuth = (req, res, next) => {
    console.log('Dashboard auth check:', {
        authenticated: req.isAuthenticated(),
        user: req.user ? req.user.email : 'none',
        complete: req.user ? req.user.isComplete : false
    });
    
    if (!req.isAuthenticated() || !req.user || !req.user.isComplete) {
        console.log('Dashboard access denied, redirecting to home');
        return res.redirect('/');
    }
    next();
};

// Dashboard route
router.get('/', requireAuth, (req, res) => {
    console.log('Loading dashboard for user:', req.user.email);
    
    try {
        const userSessions = ChatStorage.findByUserId(req.user.id);
        const usage = UsageStorage.get(req.user.id);
        
        console.log('Dashboard data loaded:', {
            sessionsCount: userSessions.length,
            usage: usage
        });
        
        res.send(`
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Dashboard - Shorui</title>
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
                            <span class="text-sm text-gray-700">Hello, ${req.user.firstName}!</span>
                            <a href="/auth/logout" class="bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 transition-colors">
                                <i class="fas fa-sign-out-alt mr-1"></i>Logout
                            </a>
                        </div>
                    </div>
                </div>
            </header>
            
            <!-- Main Content -->
            <main class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <!-- Welcome Section -->
                <div class="bg-white rounded-lg shadow-sm p-6 mb-8">
                    <div class="flex items-center justify-between">
                        <div>
                            <h1 class="text-2xl font-bold text-gray-900 mb-2">
                                Welcome back, ${req.user.firstName}!
                            </h1>
                            <p class="text-gray-600">Manage your documents and track your usage</p>
                        </div>
                        <a href="/chat" class="bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors">
                            <i class="fas fa-plus mr-2"></i>New Document
                        </a>
                    </div>
                </div>
                
                <!-- Usage Stats -->
                <div class="grid md:grid-cols-3 gap-6 mb-8">
                    <!-- Documents Generated -->
                    <div class="bg-white rounded-lg shadow-sm p-6">
                        <div class="flex items-center">
                            <div class="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                                <i class="fas fa-file-alt text-blue-600 text-xl"></i>
                            </div>
                            <div class="ml-4">
                                <p class="text-sm font-medium text-gray-500">Documents Generated</p>
                                <div class="flex items-center">
                                    <span class="text-2xl font-bold text-gray-900">${usage.documentsGenerated}</span>
                                    <span class="text-gray-500 ml-1">/ ${usage.monthlyLimit}</span>
                                </div>
                            </div>
                        </div>
                        
                        <!-- Progress Bar -->
                        <div class="mt-4">
                            <div class="flex items-center justify-between text-sm text-gray-500 mb-1">
                                <span>Monthly Usage</span>
                                <span>${Math.round((usage.documentsGenerated / usage.monthlyLimit) * 100)}%</span>
                            </div>
                            <div class="w-full bg-gray-200 rounded-full h-2">
                                <div class="bg-blue-600 h-2 rounded-full" style="width: ${(usage.documentsGenerated / usage.monthlyLimit) * 100}%"></div>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Remaining Credits -->
                    <div class="bg-white rounded-lg shadow-sm p-6">
                        <div class="flex items-center">
                            <div class="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                                <i class="fas fa-credit-card text-green-600 text-xl"></i>
                            </div>
                            <div class="ml-4">
                                <p class="text-sm font-medium text-gray-500">Remaining Credits</p>
                                <span class="text-2xl font-bold text-gray-900">${usage.monthlyLimit - usage.documentsGenerated}</span>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Account Status -->
                    <div class="bg-white rounded-lg shadow-sm p-6">
                        <div class="flex items-center">
                            <div class="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                                <i class="fas fa-crown text-purple-600 text-xl"></i>
                            </div>
                            <div class="ml-4">
                                <p class="text-sm font-medium text-gray-500">Account Status</p>
                                <span class="text-2xl font-bold text-gray-900">Free</span>
                            </div>
                        </div>
                    </div>
                </div>
                
                <!-- Chat History -->
                <div class="bg-white rounded-lg shadow-sm">
                    <div class="p-6 border-b border-gray-200">
                        <h2 class="text-xl font-semibold text-gray-900">Recent Documents</h2>
                        <p class="text-gray-600">Your document generation history</p>
                    </div>
                    
                    <div class="p-6">
                        ${userSessions.length > 0 ? 
                            userSessions.reverse().map(session => `
                                <div class="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors mb-4">
                                    <div class="flex items-center justify-between">
                                        <div class="flex-1">
                                            <h3 class="font-medium text-gray-900 mb-1">
                                                <i class="fas fa-file-alt text-gray-400 mr-2"></i>
                                                ${session.topic}
                                            </h3>
                                            <div class="flex items-center text-sm text-gray-500 space-x-4">
                                                <span>
                                                    <i class="far fa-calendar-alt mr-1"></i>
                                                    ${new Date(session.timestamp).toLocaleDateString()}
                                                </span>
                                                <span>
                                                    <i class="far fa-clock mr-1"></i>
                                                    ${new Date(session.timestamp).toLocaleTimeString()}
                                                </span>
                                                <span class="inline-flex items-center px-2 py-1 rounded-full text-xs bg-green-100 text-green-800">
                                                    <i class="fas fa-check-circle mr-1"></i>
                                                    ${session.status || 'completed'}
                                                </span>
                                            </div>
                                        </div>
                                        <div class="flex items-center space-x-2 ml-4">
                                            <a href="/chat/${session.id}" class="text-blue-600 hover:text-blue-700">
                                                <i class="fas fa-eye"></i>
                                            </a>
                                            <a href="/chat/download/${session.generatedFile}" class="text-green-600 hover:text-green-700">
                                                <i class="fas fa-download"></i>
                                            </a>
                                        </div>
                                    </div>
                                </div>
                            `).join('') :
                            `<div class="text-center py-8">
                                <i class="fas fa-file-alt text-gray-300 text-4xl mb-4"></i>
                                <h3 class="text-lg font-medium text-gray-900 mb-2">No documents yet</h3>
                                <p class="text-gray-600 mb-4">Create your first document to get started</p>
                                <a href="/chat" class="bg-blue-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors">
                                    Create Document
                                </a>
                            </div>`
                        }
                    </div>
                </div>
            </main>
            
            <script src="/js/app.js"></script>
        </body>
        </html>
        `);
        
    } catch (error) {
        console.error('Dashboard error:', error);
        res.status(500).send('Error loading dashboard');
    }
});

module.exports = router;