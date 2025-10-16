const express = require('express');
const session = require('express-session');
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const path = require('path');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Import routes
const authRoutes = require('./routes/auth');
const dashboardRoutes = require('./routes/dashboard');
const chatRoutes = require('./routes/chat');

// Import models (in-memory storage)
const { users, chatSessions, usageLimits } = require('./models/data');

// Static files - FIRST and MOST IMPORTANT
app.use('/css', express.static(path.join(__dirname, 'public/css')));
app.use('/js', express.static(path.join(__dirname, 'public/js')));
app.use(express.static(path.join(__dirname, 'public')));

// Middleware with relaxed CSP for testing
app.use(helmet({
    contentSecurityPolicy: false // Completely disable for testing
}));
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100
});
app.use(limiter);

// Session configuration
app.use(session({
    secret: process.env.SESSION_SECRET || 'your-secret-key-change-in-production',
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false, maxAge: 24 * 60 * 60 * 1000 }
}));

// Passport configuration
app.use(passport.initialize());
app.use(passport.session());

// Google OAuth Strategy
passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID || 'your-google-client-id',
    clientSecret: process.env.GOOGLE_CLIENT_SECRET || 'your-google-client-secret',
    callbackURL: "/auth/google/callback"
}, async (accessToken, refreshToken, profile, done) => {
    try {
        let user = users.find(u => u.googleId === profile.id);
        
        if (user) {
            return done(null, user);
        } else {
            const newUser = {
                id: users.length + 1,
                googleId: profile.id,
                email: profile.emails[0].value,
                firstName: profile.name.givenName,
                lastName: profile.name.familyName,
                phone: null,
                createdAt: new Date().toISOString(),
                isComplete: false
            };
            
            users.push(newUser);
            return done(null, newUser);
        }
    } catch (error) {
        return done(error, null);
    }
}));

passport.serializeUser((user, done) => {
    done(null, user.id);
});

passport.deserializeUser((id, done) => {
    const user = users.find(u => u.id === id);
    done(null, user);
});

// Set view engine WITHOUT layouts initially
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Make user data available to all templates
app.use((req, res, next) => {
    res.locals.user = req.user;
    next();
});

// Test route to verify CSS loading
app.get('/test', (req, res) => {
    res.send(`
    <!DOCTYPE html>
    <html>
    <head>
        <title>CSS Test</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css" rel="stylesheet">
        <link href="/css/custom.css" rel="stylesheet">
    </head>
    <body class="bg-blue-500">
        <div class="container mx-auto p-8">
            <h1 class="text-4xl font-bold text-white mb-4">
                <i class="fas fa-file-alt mr-2"></i>CSS Test - Shorui
            </h1>
            <p class="text-white text-xl">If you see this styled properly, CSS is working!</p>
            <div class="bg-white p-4 rounded-lg mt-4 text-gray-800">
                <p>White box with rounded corners and padding</p>
            </div>
        </div>
    </body>
    </html>
    `);
});

// Routes
app.use('/auth', authRoutes);
app.use('/dashboard', dashboardRoutes);
app.use('/chat', chatRoutes);

// Home route with inline CSS for testing
app.get('/', (req, res) => {
    if (req.isAuthenticated() && req.user.isComplete) {
        return res.redirect('/dashboard');
    }
    
    res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Shorui - AI Document Generator</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css" rel="stylesheet">
        <link href="/css/custom.css" rel="stylesheet">
        <script>
            tailwind.config = {
                theme: {
                    extend: {
                        colors: {
                            primary: '#3B82F6',
                            secondary: '#1E40AF',
                            accent: '#F59E0B'
                        }
                    }
                }
            }
        </script>
    </head>
    <body class="bg-gradient-to-br from-blue-50 to-indigo-100 min-h-screen">
        <!-- Header -->
        <header class="bg-white shadow-sm border-b">
            <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div class="flex justify-between items-center h-16">
                    <div class="flex items-center">
                        <a href="/" class="text-2xl font-bold text-primary">
                            <i class="fas fa-file-alt mr-2"></i>Shorui
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
        <main class="py-24">
            <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div class="text-center">
                    <h1 class="text-4xl md:text-6xl font-bold text-gray-900 mb-6">
                        Welcome to <span class="text-primary">Shorui</span>
                    </h1>
                    <p class="text-xl md:text-2xl text-gray-600 mb-8 max-w-3xl mx-auto">
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
        <footer class="bg-gray-800 text-white py-8">
            <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div class="text-center">
                    <p>&copy; 2025 Shorui - AI Document Generator. All rights reserved.</p>
                    <p class="text-sm text-gray-400 mt-2">Built with Node.js, EJS, and Tailwind CSS</p>
                </div>
            </div>
        </footer>
        
        <script src="/js/app.js"></script>
    </body>
    </html>
    `);
});

// Complete profile route
app.get('/complete-profile', (req, res) => {
    if (!req.isAuthenticated()) {
        return res.redirect('/');
    }
    if (req.user.isComplete) {
        return res.redirect('/dashboard');
    }
    res.render('complete-profile', { 
        title: 'Complete Profile - Shorui'
    });
});

app.post('/complete-profile', (req, res) => {
    if (!req.isAuthenticated()) {
        return res.redirect('/');
    }
    
    const { phone } = req.body;
    
    const existingUser = users.find(u => u.phone === phone && u.id !== req.user.id);
    if (existingUser) {
        return res.render('complete-profile', { 
            error: 'Phone number is already linked to another account',
            title: 'Complete Profile - Shorui'
        });
    }
    
    const userIndex = users.findIndex(u => u.id === req.user.id);
    if (userIndex !== -1) {
        users[userIndex].phone = phone;
        users[userIndex].isComplete = true;
        
        usageLimits[req.user.id] = {
            documentsGenerated: 0,
            monthlyLimit: 10,
            resetDate: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1)
        };
    }
    
    res.redirect('/dashboard');
});

// Error handling
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).send('Something went wrong!');
});

app.use((req, res) => {
    res.status(404).send('Page not found');
});

app.listen(PORT, () => {
    console.log(`Shorui server running on port ${PORT}`);
    console.log(`Visit http://localhost:${PORT} to access the application`);
    console.log(`CSS Test available at http://localhost:${PORT}/test`);
});

module.exports = app;