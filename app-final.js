const express = require('express');
const session = require('express-session');
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const path = require('path');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const cors = require('cors');
const FileStore = require('session-file-store')(session);
const { exec } = require('child_process');
const fs = require('fs');
const axios = require('axios');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Import storage system
const { UserStorage, ChatStorage, UsageStorage } = require('./models/storage');

// Create documents directory
const DOCS_DIR = path.join(__dirname, 'generated-documents');
if (!fs.existsSync(DOCS_DIR)) {
    fs.mkdirSync(DOCS_DIR, { recursive: true });
}

// Static files - FIRST
app.use('/css', express.static(path.join(__dirname, 'public/css')));
app.use('/js', express.static(path.join(__dirname, 'public/js')));
app.use('/documents', express.static(DOCS_DIR));
app.use(express.static(path.join(__dirname, 'public')));

// Middleware
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://cdn.tailwindcss.com", "https://cdnjs.cloudflare.com"],
            scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", "https://cdn.tailwindcss.com"],
            fontSrc: ["'self'", "https://cdnjs.cloudflare.com"],
            imgSrc: ["'self'", "data:", "https:", "*.googleusercontent.com"],
            connectSrc: ["'self'"]
        },
    }
}));

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100
});
app.use(limiter);

// Session configuration with file store
app.use(session({
    store: new FileStore({
        path: './data/sessions',
        ttl: 86400,
        retries: 3
    }),
    secret: process.env.SESSION_SECRET || 'shorui-secret-key-change-in-production',
    resave: false,
    saveUninitialized: false,
    cookie: { 
        secure: false, 
        maxAge: 24 * 60 * 60 * 1000,
        httpOnly: true
    }
}));

// Passport configuration
app.use(passport.initialize());
app.use(passport.session());

// Google OAuth Strategy with profile picture
passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID || 'your-google-client-id',
    clientSecret: process.env.GOOGLE_CLIENT_SECRET || 'your-google-client-secret',
    callbackURL: "/auth/google/callback"
}, async (accessToken, refreshToken, profile, done) => {
    try {
        console.log('Google OAuth callback for:', profile.emails[0].value);
        
        let user = UserStorage.findByGoogleId(profile.id);
        
        if (user) {
            // Update profile picture if changed
            const updatedUser = UserStorage.update(user.id, {
                profilePicture: profile.photos[0]?.value || user.profilePicture
            });
            return done(null, updatedUser);
        } else {
            const newUser = UserStorage.create({
                googleId: profile.id,
                email: profile.emails[0].value,
                firstName: profile.name.givenName,
                lastName: profile.name.familyName,
                profilePicture: profile.photos[0]?.value || '',
                phone: null,
                isComplete: false
            });
            
            return done(null, newUser);
        }
    } catch (error) {
        console.error('OAuth error:', error);
        return done(error, null);
    }
}));

passport.serializeUser((user, done) => {
    done(null, user.id);
});

passport.deserializeUser((id, done) => {
    const user = UserStorage.findById(id);
    done(null, user);
});

// Set view engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Make user data available to all templates
app.use((req, res, next) => {
    res.locals.user = req.user;
    next();
});

// Auth routes
app.get('/auth/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

app.get('/auth/google/callback',
    passport.authenticate('google', { failureRedirect: '/' }),
    (req, res) => {
        if (req.user.isComplete) {
            res.redirect('/dashboard');
        } else {
            res.redirect('/complete-profile');
        }
    }
);

app.get('/auth/logout', (req, res) => {
    req.logout((err) => {
        if (err) console.error('Logout error:', err);
        req.session.destroy((err) => {
            if (err) console.error('Session destroy error:', err);
            res.clearCookie('connect.sid');
            res.redirect('/');
        });
    });
});

// Home route
app.get('/', (req, res) => {
    if (req.isAuthenticated() && req.user && req.user.isComplete) {
        return res.redirect('/dashboard');
    }
    
    res.send(generateHomePage());
});

// Complete profile route with fixed CSS
app.get('/complete-profile', (req, res) => {
    if (!req.isAuthenticated()) {
        return res.redirect('/');
    }
    if (req.user.isComplete) {
        return res.redirect('/dashboard');
    }
    
    res.render('complete-profile-fixed', { 
        title: 'Complete Profile - Shorui',
        user: req.user
    });
});

app.post('/complete-profile', (req, res) => {
    if (!req.isAuthenticated()) {
        return res.redirect('/');
    }
    
    const { phone } = req.body;
    
    // Check if phone number is already used
    const existingUser = UserStorage.findByPhone(phone);
    if (existingUser && existingUser.id !== req.user.id) {
        return res.render('complete-profile-fixed', { 
            error: 'Phone number is already linked to another account',
            title: 'Complete Profile - Shorui',
            user: req.user
        });
    }
    
    // Update user
    const updatedUser = UserStorage.update(req.user.id, {
        phone: phone,
        isComplete: true
    });
    
    if (updatedUser) {
        // Initialize usage limits
        UsageStorage.set(req.user.id, {
            documentsGenerated: 0,
            monthlyLimit: 10,
            resetDate: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1)
        });
        
        req.user = updatedUser;
        res.redirect('/dashboard');
    } else {
        res.render('complete-profile-fixed', { 
            error: 'Failed to update profile. Please try again.',
            title: 'Complete Profile - Shorui',
            user: req.user
        });
    }
});

// Dashboard route with profile picture
app.get('/dashboard', (req, res) => {
    if (!req.isAuthenticated() || !req.user || !req.user.isComplete) {
        return res.redirect('/');
    }
    
    const userSessions = ChatStorage.findByUserId(req.user.id);
    const usage = UsageStorage.get(req.user.id);
    
    res.send(generateDashboardPage(req.user, userSessions, usage));
});

// Chat route
app.get('/chat', (req, res) => {
    if (!req.isAuthenticated() || !req.user || !req.user.isComplete) {
        return res.redirect('/');
    }
    
    res.send(generateChatPage(req.user));
});

// Generate document with actual AI and Python execution
app.post('/chat/generate', async (req, res) => {
    if (!req.isAuthenticated() || !req.user || !req.user.isComplete) {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    
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
        
        // Call actual AI API
        const aiResponse = await callPerplexityAPI(topic);
        const pythonCode = extractPythonCode(aiResponse);
        const filename = extractFilenameFromResponse(aiResponse);
        
        // Execute Python code
        const generatedFilePath = await executePythonCode(pythonCode, filename);
        
        // Create new chat session
        const newSession = ChatStorage.create({
            userId: req.user.id,
            topic: topic,
            aiResponse: 'Document generated successfully!',
            generatedFile: filename,
            filePath: generatedFilePath,
            status: "completed"
        });
        
        // Update usage
        UsageStorage.increment(req.user.id);
        
        res.json({
            success: true,
            sessionId: newSession.id,
            message: 'Document generated successfully!',
            filename: newSession.generatedFile,
            downloadUrl: `/documents/${filename}`
        });
        
    } catch (error) {
        console.error('Error generating document:', error);
        res.status(500).json({ error: 'Failed to generate document: ' + error.message });
    }
});

// Download route for generated documents
app.get('/documents/:filename', (req, res) => {
    if (!req.isAuthenticated()) {
        return res.status(401).send('Unauthorized');
    }
    
    const filename = req.params.filename;
    const filePath = path.join(DOCS_DIR, filename);
    
    if (fs.existsSync(filePath)) {
        res.download(filePath);
    } else {
        res.status(404).send('File not found');
    }
});

// Function to call actual Perplexity API
async function callPerplexityAPI(topic) {
    const systemPrompt = `You are a professional document generator. Create Python code using the python-docx library that generates a comprehensive, well-structured document based on the given topic. 

Your response must be in this exact format:
{"filename": "topic-name-doc-123456.docx"}

from docx import Document
from docx.shared import Inches
from docx.enum.text import WD_ALIGN_PARAGRAPH

# Your Python code here to create a professional document
# Include proper headings, paragraphs, tables if relevant
# Make it comprehensive and professional

Do not include any explanatory text, just the JSON and Python code.`;
    
    try {
        // Use actual Perplexity API if key is provided
        if (process.env.PERPLEXITY_API_KEY && process.env.PERPLEXITY_API_KEY !== 'your-perplexity-api-key') {
            const response = await axios.post('https://api.perplexity.ai/chat/completions', {
                model: 'llama-3.1-sonar-large-128k-online',
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: `Generate a professional document about: ${topic}` }
                ]
            }, {
                headers: {
                    'Authorization': `Bearer ${process.env.PERPLEXITY_API_KEY}`,
                    'Content-Type': 'application/json'
                },
                timeout: 30000
            });
            
            return response.data.choices[0].message.content;
        } else {
            // Fallback to mock response
            return generateMockAIResponse(topic);
        }
    } catch (error) {
        console.error('AI API Error:', error);
        // Fallback to mock response on error
        return generateMockAIResponse(topic);
    }
}

// Execute Python code and return generated file path
async function executePythonCode(pythonCode, filename) {
    return new Promise((resolve, reject) => {
        // Create a temporary Python file
        const tempPyFile = path.join(DOCS_DIR, `temp_${Date.now()}.py`);
        const fullFilePath = path.join(DOCS_DIR, filename);
        
        // Modify Python code to save in correct directory
        const modifiedCode = pythonCode.replace(
            /doc\.save\(['"](.*?)['"]\)/g,
            `doc.save('${fullFilePath}')`
        );
        
        // Write Python code to temp file
        fs.writeFileSync(tempPyFile, modifiedCode);
        
        // Execute Python code
        exec(`python "${tempPyFile}"`, { cwd: DOCS_DIR }, (error, stdout, stderr) => {
            // Clean up temp file
            try {
                fs.unlinkSync(tempPyFile);
            } catch (e) {
                console.warn('Failed to delete temp file:', e.message);
            }
            
            if (error) {
                console.error('Python execution error:', error);
                console.error('stderr:', stderr);
                reject(new Error('Failed to execute document generation code'));
                return;
            }
            
            console.log('Python output:', stdout);
            
            // Check if file was created
            if (fs.existsSync(fullFilePath)) {
                console.log('Document generated successfully:', fullFilePath);
                resolve(fullFilePath);
            } else {
                reject(new Error('Document file was not created'));
            }
        });
    });
}

// Extract Python code from AI response
function extractPythonCode(response) {
    const pythonMatch = response.match(/```python\s*([\s\S]*?)```/i) || 
                       response.match(/from docx import[\s\S]*?doc\.save\([^)]+\)/i);
    
    if (pythonMatch) {
        return pythonMatch[1] || pythonMatch[0];
    }
    
    throw new Error('No valid Python code found in AI response');
}

// Extract filename from AI response
function extractFilenameFromResponse(response) {
    try {
        const jsonMatch = response.match(/\{[^}]*"filename"[^}]*\}/);
        if (jsonMatch) {
            const jsonData = JSON.parse(jsonMatch[0]);
            return jsonData.filename;
        }
    } catch (error) {
        console.log('Using fallback filename generation');
    }
    return `document-${Date.now()}.docx`;
}

// Generate mock AI response for demo
function generateMockAIResponse(topic) {
    const randomId = Math.random().toString(36).substring(2, 8);
    const filename = `${topic.toLowerCase().replace(/\s+/g, '-')}-doc-${randomId}.docx`;
    
    const pythonTemplate = `from docx import Document
from docx.shared import Inches
from docx.enum.text import WD_ALIGN_PARAGRAPH
from datetime import datetime

doc = Document()

# Title
title = doc.add_heading('${topic}', 0)
title.alignment = WD_ALIGN_PARAGRAPH.CENTER

# Add date
date_para = doc.add_paragraph(f'Generated on: {datetime.now().strftime("%B %d, %Y")}')
date_para.alignment = WD_ALIGN_PARAGRAPH.CENTER

# Introduction
doc.add_heading('Introduction', level=1)
doc.add_paragraph('This document was automatically generated based on the topic: ${topic}')

# Main Content
doc.add_heading('Content', level=1)
doc.add_paragraph('This section contains the main content related to ${topic}.')
doc.add_paragraph('Additional details and information would be included here in a real document.')

# Conclusion
doc.add_heading('Conclusion', level=1)
doc.add_paragraph('This document provides a comprehensive overview of ${topic}.')

# Footer
footer_section = doc.sections[0]
footer = footer_section.footer
footer_para = footer.paragraphs[0]
footer_para.text = 'Generated by Shorui AI Document Generator - Flaxa Technologies'

doc.save('${filename}')
print('Document generated successfully!')`;
    
    return `{"filename": "${filename}"}

\`\`\`python
${pythonTemplate}
\`\`\``;
}

// Generate homepage HTML
function generateHomePage() {
    return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Shorui - AI Document Generator</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css" rel="stylesheet">
        <script>
            tailwind.config = {
                theme: {
                    extend: {
                        colors: {
                            primary: '#3B82F6',
                            secondary: '#1E40AF'
                        }
                    }
                }
            }
        </script>
    </head>
    <body class="bg-gradient-to-br from-blue-50 to-indigo-100 min-h-screen flex flex-col">
        <!-- Header -->
        <header class="bg-white shadow-sm border-b">
            <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div class="flex justify-between items-center h-16">
                    <div class="flex items-center">
                        <a href="/" class="text-2xl font-bold text-primary">
                            <i class="fas fa-file-alt mr-2"></i>Shorui <span class="text-sm text-gray-500">Beta v0.1</span>
                        </a>
                    </div>
                    <div class="flex items-center space-x-4">
                        <a href="/auth/google" class="bg-primary text-white px-4 py-2 rounded-lg hover:bg-secondary transition-colors">
                            <i class="fab fa-google mr-2"></i>Login with Google
                        </a>
                    </div>
                </div>
            </div>
        </header>
        
        <!-- Main Content -->
        <main class="flex-grow py-12 sm:py-24">
            <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div class="text-center">
                    <h1 class="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 mb-6">
                        Welcome to <span class="text-primary">Shorui</span>
                    </h1>
                    <p class="text-xl sm:text-2xl text-gray-600 mb-8 max-w-3xl mx-auto">
                        AI-Powered Automatic Document Generator
                    </p>
                    <p class="text-lg text-gray-600 mb-12 max-w-2xl mx-auto">
                        Generate professional documents instantly using advanced AI technology. 
                        Simply provide a topic, and our AI will create comprehensive documents for you.
                    </p>
                    <div class="mb-16">
                        <a href="/auth/google" class="bg-primary text-white px-8 py-4 rounded-lg text-lg font-semibold hover:bg-secondary transition-all duration-300 shadow-lg hover:shadow-xl inline-flex items-center">
                            <i class="fab fa-google mr-3 text-xl"></i>
                            Get Started with Google
                        </a>
                    </div>
                </div>
            </div>
        </main>
        
        <!-- Footer -->
        <footer class="bg-gray-800 text-white py-6">
            <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div class="text-center">
                    <p class="text-sm">&copy; 2025 Shorui - AI Document Generator <span class="text-blue-400">Beta v0.1</span></p>
                    <p class="text-xs text-gray-400 mt-1">Made with ❤️ by <span class="text-blue-400">Flaxa Technologies</span></p>
                </div>
            </div>
        </footer>
    </body>
    </html>`;
}

// Generate dashboard HTML with profile picture
function generateDashboardPage(user, sessions, usage) {
    const profilePicture = user.profilePicture || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(user.firstName + '+' + user.lastName) + '&background=3B82F6&color=fff';
    
    return `
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
    <body class="bg-gray-50 min-h-screen flex flex-col">
        <!-- Header -->
        <header class="bg-white shadow-sm border-b">
            <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div class="flex justify-between items-center h-16">
                    <div class="flex items-center">
                        <a href="/" class="text-xl sm:text-2xl font-bold text-primary">
                            <i class="fas fa-file-alt mr-2"></i>Shorui <span class="text-xs sm:text-sm text-gray-500">Beta v0.1</span>
                        </a>
                    </div>
                    <div class="flex items-center space-x-2 sm:space-x-4">
                        <a href="/chat" class="hidden sm:block text-gray-700 hover:text-primary">New Document</a>
                        <div class="flex items-center space-x-2">
                            <img src="${profilePicture}" alt="Profile" class="w-8 h-8 rounded-full">
                            <span class="text-sm text-gray-700 hidden sm:inline">${user.firstName}</span>
                        </div>
                        <a href="/auth/logout" class="bg-red-500 text-white px-2 sm:px-4 py-2 rounded-lg hover:bg-red-600 transition-colors">
                            <i class="fas fa-sign-out-alt sm:mr-1"></i><span class="hidden sm:inline">Logout</span>
                        </a>
                    </div>
                </div>
            </div>
        </header>
        
        <!-- Main Content -->
        <main class="flex-grow">
            <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
                <!-- Welcome Section -->
                <div class="bg-white rounded-lg shadow-sm p-4 sm:p-6 mb-6 sm:mb-8">
                    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                        <div class="flex items-center space-x-4 mb-4 sm:mb-0">
                            <img src="${profilePicture}" alt="${user.firstName} ${user.lastName}" class="w-12 h-12 sm:w-16 sm:h-16 rounded-full border-2 border-primary">
                            <div>
                                <h1 class="text-xl sm:text-2xl font-bold text-gray-900">
                                    Welcome back, ${user.firstName}!
                                </h1>
                                <p class="text-sm sm:text-base text-gray-600">Manage your documents and track your usage</p>
                            </div>
                        </div>
                        <a href="/chat" class="w-full sm:w-auto bg-primary text-white px-4 sm:px-6 py-3 rounded-lg font-medium hover:bg-secondary transition-colors text-center">
                            <i class="fas fa-plus mr-2"></i>New Document
                        </a>
                    </div>
                </div>
                
                <!-- Usage Stats -->
                <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mb-6 sm:mb-8">
                    <!-- Documents Generated -->
                    <div class="bg-white rounded-lg shadow-sm p-4 sm:p-6">
                        <div class="flex items-center">
                            <div class="w-10 h-10 sm:w-12 sm:h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                                <i class="fas fa-file-alt text-blue-600 text-lg sm:text-xl"></i>
                            </div>
                            <div class="ml-3 sm:ml-4">
                                <p class="text-xs sm:text-sm font-medium text-gray-500">Documents Generated</p>
                                <div class="flex items-center">
                                    <span class="text-xl sm:text-2xl font-bold text-gray-900">${usage.documentsGenerated}</span>
                                    <span class="text-gray-500 ml-1">/ ${usage.monthlyLimit}</span>
                                </div>
                            </div>
                        </div>
                        
                        <!-- Progress Bar -->
                        <div class="mt-3 sm:mt-4">
                            <div class="flex items-center justify-between text-xs sm:text-sm text-gray-500 mb-1">
                                <span>Monthly Usage</span>
                                <span>${Math.round((usage.documentsGenerated / usage.monthlyLimit) * 100)}%</span>
                            </div>
                            <div class="w-full bg-gray-200 rounded-full h-2">
                                <div class="bg-primary h-2 rounded-full transition-all duration-1000" style="width: ${(usage.documentsGenerated / usage.monthlyLimit) * 100}%"></div>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Remaining Credits -->
                    <div class="bg-white rounded-lg shadow-sm p-4 sm:p-6">
                        <div class="flex items-center">
                            <div class="w-10 h-10 sm:w-12 sm:h-12 bg-green-100 rounded-lg flex items-center justify-center">
                                <i class="fas fa-credit-card text-green-600 text-lg sm:text-xl"></i>
                            </div>
                            <div class="ml-3 sm:ml-4">
                                <p class="text-xs sm:text-sm font-medium text-gray-500">Remaining Credits</p>
                                <span class="text-xl sm:text-2xl font-bold text-gray-900">${usage.monthlyLimit - usage.documentsGenerated}</span>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Account Status -->
                    <div class="bg-white rounded-lg shadow-sm p-4 sm:p-6">
                        <div class="flex items-center">
                            <div class="w-10 h-10 sm:w-12 sm:h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                                <i class="fas fa-crown text-purple-600 text-lg sm:text-xl"></i>
                            </div>
                            <div class="ml-3 sm:ml-4">
                                <p class="text-xs sm:text-sm font-medium text-gray-500">Account Status</p>
                                <span class="text-xl sm:text-2xl font-bold text-gray-900">Free</span>
                            </div>
                        </div>
                    </div>
                </div>
                
                <!-- Chat History -->
                <div class="bg-white rounded-lg shadow-sm">
                    <div class="p-4 sm:p-6 border-b border-gray-200">
                        <h2 class="text-lg sm:text-xl font-semibold text-gray-900">Recent Documents</h2>
                        <p class="text-sm sm:text-base text-gray-600">Your document generation history</p>
                    </div>
                    
                    <div class="p-4 sm:p-6">
                        ${sessions.length > 0 ? 
                            sessions.reverse().map(session => `
                                <div class="border border-gray-200 rounded-lg p-3 sm:p-4 hover:bg-gray-50 transition-colors mb-4 last:mb-0">
                                    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                                        <div class="flex-1 mb-3 sm:mb-0">
                                            <h3 class="font-medium text-gray-900 mb-1 flex items-center">
                                                <i class="fas fa-file-alt text-gray-400 mr-2"></i>
                                                <span class="truncate">${session.topic}</span>
                                            </h3>
                                            <div class="flex flex-wrap items-center text-xs sm:text-sm text-gray-500 gap-2 sm:gap-4">
                                                <span class="flex items-center">
                                                    <i class="far fa-calendar-alt mr-1"></i>
                                                    ${new Date(session.timestamp).toLocaleDateString()}
                                                </span>
                                                <span class="flex items-center">
                                                    <i class="far fa-clock mr-1"></i>
                                                    ${new Date(session.timestamp).toLocaleTimeString()}
                                                </span>
                                                <span class="inline-flex items-center px-2 py-1 rounded-full text-xs bg-green-100 text-green-800">
                                                    <i class="fas fa-check-circle mr-1"></i>
                                                    ${session.status || 'completed'}
                                                </span>
                                            </div>
                                        </div>
                                        <div class="flex items-center space-x-2">
                                            <a href="/documents/${session.generatedFile}" class="bg-green-600 text-white px-3 py-2 rounded-lg hover:bg-green-700 transition-colors text-sm">
                                                <i class="fas fa-download mr-1 sm:mr-2"></i><span class="hidden sm:inline">Download</span>
                                            </a>
                                        </div>
                                    </div>
                                </div>
                            `).join('') :
                            `<div class="text-center py-8 sm:py-12">
                                <i class="fas fa-file-alt text-gray-300 text-4xl mb-4"></i>
                                <h3 class="text-lg font-medium text-gray-900 mb-2">No documents yet</h3>
                                <p class="text-gray-600 mb-4">Create your first document to get started</p>
                                <a href="/chat" class="bg-primary text-white px-6 py-2 rounded-lg font-medium hover:bg-secondary transition-colors">
                                    Create Document
                                </a>
                            </div>`
                        }
                    </div>
                </div>
            </div>
        </main>
        
        <!-- Footer -->
        <footer class="bg-gray-800 text-white py-6">
            <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div class="text-center">
                    <p class="text-sm">&copy; 2025 Shorui - AI Document Generator <span class="text-blue-400">Beta v0.1</span></p>
                    <p class="text-xs text-gray-400 mt-1">Made with ❤️ by <span class="text-blue-400">Flaxa Technologies</span></p>
                </div>
            </div>
        </footer>
    </body>
    </html>`;
}

// Generate chat page HTML
function generateChatPage(user) {
    const profilePicture = user.profilePicture || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(user.firstName + '+' + user.lastName) + '&background=3B82F6&color=fff';
    
    return `
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
    <body class="bg-gray-50 min-h-screen flex flex-col">
        <!-- Header -->
        <header class="bg-white shadow-sm border-b">
            <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div class="flex justify-between items-center h-16">
                    <div class="flex items-center">
                        <a href="/" class="text-xl sm:text-2xl font-bold text-blue-600">
                            <i class="fas fa-file-alt mr-2"></i>Shorui <span class="text-xs sm:text-sm text-gray-500">Beta v0.1</span>
                        </a>
                    </div>
                    <div class="flex items-center space-x-2 sm:space-x-4">
                        <a href="/dashboard" class="text-gray-700 hover:text-blue-600 text-sm sm:text-base">Dashboard</a>
                        <div class="flex items-center space-x-2">
                            <img src="${profilePicture}" alt="Profile" class="w-8 h-8 rounded-full">
                            <span class="text-sm text-gray-700 hidden sm:inline">${user.firstName}</span>
                        </div>
                        <a href="/auth/logout" class="bg-red-500 text-white px-2 sm:px-4 py-2 rounded-lg hover:bg-red-600 transition-colors">
                            <i class="fas fa-sign-out-alt sm:mr-1"></i><span class="hidden sm:inline">Logout</span>
                        </a>
                    </div>
                </div>
            </div>
        </header>
        
        <!-- Main Content -->
        <main class="flex-grow">
            <div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
                <!-- Header -->
                <div class="bg-white rounded-lg shadow-sm p-4 sm:p-6 mb-6">
                    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                        <div class="mb-4 sm:mb-0">
                            <h1 class="text-xl sm:text-2xl font-bold text-gray-900 mb-2">Create New Document</h1>
                            <p class="text-sm sm:text-base text-gray-600">Describe what kind of document you need, and our AI will generate it for you</p>
                        </div>
                        <a href="/dashboard" class="text-gray-500 hover:text-gray-700 flex items-center">
                            <i class="fas fa-arrow-left mr-2"></i>Back
                        </a>
                    </div>
                </div>
                
                <!-- Chat Interface -->
                <div class="bg-white rounded-lg shadow-sm">
                    <!-- Chat Messages Area -->
                    <div id="chatMessages" class="p-4 sm:p-6 space-y-4 min-h-64 max-h-96 overflow-y-auto">
                        <!-- Welcome Message -->
                        <div class="flex items-start space-x-3">
                            <div class="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
                                <i class="fas fa-robot text-white text-sm"></i>
                            </div>
                            <div class="flex-1">
                                <div class="bg-gray-100 rounded-lg p-3 sm:p-4">
                                    <p class="text-sm sm:text-base text-gray-800">
                                        Hi ${user.firstName}! I'm your AI document generator. What kind of document would you like me to create for you today? 
                                        Just describe the topic or type of document you need.
                                    </p>
                                </div>
                                <p class="text-xs text-gray-500 mt-1">AI Assistant</p>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Input Area -->
                    <div class="border-t border-gray-200 p-4 sm:p-6">
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
                            
                            <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                                <div class="text-xs sm:text-sm text-gray-500">
                                    <i class="fas fa-info-circle mr-1"></i>
                                    Be specific for best results
                                </div>
                                <button 
                                    type="submit" 
                                    id="generateBtn"
                                    class="w-full sm:w-auto bg-blue-600 text-white px-4 sm:px-6 py-2 sm:py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    <i class="fas fa-magic mr-2"></i>Generate Document
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
                
                <!-- Loading Modal -->
                <div id="loadingModal" class="hidden fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div class="bg-white rounded-lg p-6 sm:p-8 max-w-sm w-full">
                        <div class="text-center">
                            <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                            <h3 class="text-lg font-medium text-gray-900 mb-2">Generating Document</h3>
                            <p class="text-sm sm:text-base text-gray-600">AI is creating and processing your document...</p>
                        </div>
                    </div>
                </div>
                
                <!-- Success Modal -->
                <div id="successModal" class="hidden fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div class="bg-white rounded-lg p-6 sm:p-8 max-w-md w-full">
                        <div class="text-center">
                            <div class="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                <i class="fas fa-check text-green-600 text-2xl"></i>
                            </div>
                            <h3 class="text-lg font-medium text-gray-900 mb-2">Document Generated!</h3>
                            <p class="text-gray-600 mb-6">Your document has been successfully created and is ready for download.</p>
                            <div class="space-y-3">
                                <button id="downloadDocumentBtn" class="w-full bg-green-600 text-white py-2 px-4 rounded-lg font-medium hover:bg-green-700 transition-colors">
                                    <i class="fas fa-download mr-2"></i>Download Document
                                </button>
                                <button id="createAnotherBtn" class="w-full border border-gray-300 text-gray-700 py-2 px-4 rounded-lg font-medium hover:bg-gray-50 transition-colors">
                                    Create Another Document
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </main>
        
        <!-- Footer -->
        <footer class="bg-gray-800 text-white py-6">
            <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div class="text-center">
                    <p class="text-sm">&copy; 2025 Shorui - AI Document Generator <span class="text-blue-400">Beta v0.1</span></p>
                    <p class="text-xs text-gray-400 mt-1">Made with ❤️ by <span class="text-blue-400">Flaxa Technologies</span></p>
                </div>
            </div>
        </footer>
        
        <script>
            let currentFilename = null;
            let downloadUrl = null;
            
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
                        currentFilename = data.filename;
                        downloadUrl = data.downloadUrl;
                        
                        // Show AI response
                        hideLoadingModal();
                        addMessage('Perfect! I\'ve created your document: ' + data.filename + '. You can now download it.', 'ai');
                        
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
                    addMessage('Sorry, I encountered a technical error. Please try again.', 'ai');
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
                        <div class="flex-shrink-0 max-w-xs sm:max-w-sm">
                            <div class="bg-blue-600 text-white rounded-lg p-3 sm:p-4">
                                <p class="text-sm sm:text-base">\${content}</p>
                            </div>
                            <p class="text-xs text-gray-500 mt-1 text-right">You</p>
                        </div>
                        <div class="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center flex-shrink-0">
                            <i class="fas fa-user text-white text-sm"></i>
                        </div>
                    \`;
                } else {
                    messageDiv.innerHTML = \`
                        <div class="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
                            <i class="fas fa-robot text-white text-sm"></i>
                        </div>
                        <div class="flex-1">
                            <div class="bg-gray-100 rounded-lg p-3 sm:p-4">
                                <p class="text-sm sm:text-base text-gray-800">\${content}</p>
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
            document.getElementById('downloadDocumentBtn').addEventListener('click', function() {
                if (downloadUrl) {
                    window.location.href = downloadUrl;
                    hideSuccessModal();
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
    </html>`;
}

app.listen(PORT, () => {
    console.log(`\n🚀 Shorui Beta v0.1 - AI Document Generator`);
    console.log(`📝 Server running on port ${PORT}`);
    console.log(`🌐 Visit http://localhost:${PORT}`);
    console.log(`❤️  Made by Flaxa Technologies\n`);
});

module.exports = app;