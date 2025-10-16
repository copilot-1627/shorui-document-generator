const express = require('express');
const session = require('express-session');
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const path = require('path');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const cors = require('cors');
const FileStore = require('session-file-store')(session);
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Import storage system
const { UserStorage, ChatStorage, UsageStorage, SessionStorage } = require('./models/storage');

// Import routes
const authRoutes = require('./routes/auth-fixed');
const dashboardRoutes = require('./routes/dashboard-fixed');
const chatRoutes = require('./routes/chat-fixed');

// Static files - FIRST
app.use('/css', express.static(path.join(__dirname, 'public/css')));
app.use('/js', express.static(path.join(__dirname, 'public/js')));
app.use(express.static(path.join(__dirname, 'public')));

// Middleware
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://cdn.tailwindcss.com", "https://cdnjs.cloudflare.com"],
            scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", "https://cdn.tailwindcss.com"],
            fontSrc: ["'self'", "https://cdnjs.cloudflare.com"],
            imgSrc: ["'self'", "data:", "https:"],
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
        ttl: 86400, // 24 hours
        retries: 3,
        factor: 1,
        minTimeout: 1000,
        maxTimeout: 5000
    }),
    secret: process.env.SESSION_SECRET || 'shorui-secret-key-change-in-production',
    resave: false,
    saveUninitialized: false,
    cookie: { 
        secure: false, 
        maxAge: 24 * 60 * 60 * 1000, // 24 hours
        httpOnly: true
    }
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
        console.log('Google OAuth callback for:', profile.emails[0].value);
        
        let user = UserStorage.findByGoogleId(profile.id);
        
        if (user) {
            console.log('Existing user found:', user.email);
            return done(null, user);
        } else {
            console.log('Creating new user for:', profile.emails[0].value);
            const newUser = UserStorage.create({
                googleId: profile.id,
                email: profile.emails[0].value,
                firstName: profile.name.givenName,
                lastName: profile.name.familyName,
                phone: null,
                isComplete: false
            });
            
            console.log('New user created with ID:', newUser.id);
            return done(null, newUser);
        }
    } catch (error) {
        console.error('OAuth error:', error);
        return done(error, null);
    }
}));

passport.serializeUser((user, done) => {
    console.log('Serializing user:', user.id);
    done(null, user.id);
});

passport.deserializeUser((id, done) => {
    console.log('Deserializing user ID:', id);
    const user = UserStorage.findById(id);
    if (user) {
        console.log('User found:', user.email);
    } else {
        console.log('User not found for ID:', id);
    }
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

// Logging middleware
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`, {
        authenticated: req.isAuthenticated(),
        user: req.user ? req.user.email : 'none'
    });
    next();
});

// Routes
app.use('/auth', authRoutes);
app.use('/dashboard', dashboardRoutes);
app.use('/chat', chatRoutes);

// Test route
app.get('/test', (req, res) => {
    res.send(`
    <!DOCTYPE html>
    <html>
    <head>
        <title>Storage Test</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <link href="/css/custom.css" rel="stylesheet">
    </head>
    <body class="bg-blue-500 p-8">
        <div class="bg-white p-6 rounded-lg max-w-md mx-auto">
            <h1 class="text-2xl font-bold mb-4">Storage Test</h1>
            <p class="mb-4">Users in storage: ${UserStorage.getAll().length}</p>
            <p class="mb-4">Session ID: ${req.sessionID}</p>
            <p class="mb-4">Authenticated: ${req.isAuthenticated()}</p>
            <p class="mb-4">User: ${req.user ? req.user.email : 'None'}</p>
            <a href="/auth/google" class="bg-blue-500 text-white px-4 py-2 rounded">Login with Google</a>
        </div>
    </body>
    </html>
    `);
});

// Home route
app.get('/', (req, res) => {
    console.log('Home route accessed. Authenticated:', req.isAuthenticated());
    
    if (req.isAuthenticated() && req.user && req.user.isComplete) {
        console.log('Redirecting authenticated user to dashboard');
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
                    
                    <!-- Debug Info -->
                    <div class="bg-gray-100 p-4 rounded-lg max-w-md mx-auto mt-8">
                        <h3 class="font-semibold mb-2">Debug Info:</h3>
                        <p class="text-sm">Session ID: ${req.sessionID}</p>
                        <p class="text-sm">Users in DB: ${UserStorage.getAll().length}</p>
                        <p class="text-sm">Auth Status: ${req.isAuthenticated()}</p>
                        <a href="/test" class="text-blue-500 underline text-sm">Storage Test</a>
                    </div>
                </div>
            </div>
        </main>
        
        <script src="/js/app.js"></script>
    </body>
    </html>
    `);
});

// Complete profile route
app.get('/complete-profile', (req, res) => {
    console.log('Complete profile route. Auth:', req.isAuthenticated(), 'User:', req.user?.email);
    
    if (!req.isAuthenticated()) {
        console.log('User not authenticated, redirecting to home');
        return res.redirect('/');
    }
    if (req.user.isComplete) {
        console.log('User profile already complete, redirecting to dashboard');
        return res.redirect('/dashboard');
    }
    
    res.render('complete-profile', { 
        title: 'Complete Profile - Shorui',
        user: req.user
    });
});

app.post('/complete-profile', (req, res) => {
    console.log('POST complete-profile. Auth:', req.isAuthenticated(), 'User:', req.user?.email);
    
    if (!req.isAuthenticated()) {
        return res.redirect('/');
    }
    
    const { phone } = req.body;
    console.log('Updating user with phone:', phone);
    
    // Check if phone number is already used
    const existingUser = UserStorage.findByPhone(phone);
    if (existingUser && existingUser.id !== req.user.id) {
        console.log('Phone number already in use by user:', existingUser.email);
        return res.render('complete-profile', { 
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
        console.log('User updated successfully:', updatedUser.email);
        
        // Initialize usage limits
        UsageStorage.set(req.user.id, {
            documentsGenerated: 0,
            monthlyLimit: 10,
            resetDate: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1)
        });
        
        // Update session user data
        req.user = updatedUser;
        
        console.log('Redirecting to dashboard');
        res.redirect('/dashboard');
    } else {
        console.error('Failed to update user');
        res.render('complete-profile', { 
            error: 'Failed to update profile. Please try again.',
            title: 'Complete Profile - Shorui',
            user: req.user
        });
    }
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Error:', err.stack);
    res.status(500).send(`
    <div style="padding: 20px; max-width: 500px; margin: 50px auto; border: 1px solid #ccc; border-radius: 8px;">
        <h2 style="color: #e74c3c;">Something went wrong!</h2>
        <p>Error: ${err.message}</p>
        <p><a href="/">Go Home</a> | <a href="/test">Test Storage</a></p>
    </div>
    `);
});

// 404 handler
app.use((req, res) => {
    res.status(404).send(`
    <div style="padding: 20px; max-width: 500px; margin: 50px auto; text-align: center;">
        <h2>Page Not Found</h2>
        <p>The page you're looking for doesn't exist.</p>
        <p><a href="/">Go Home</a> | <a href="/test">Test Storage</a></p>
    </div>
    `);
});

app.listen(PORT, () => {
    console.log(`\n🚀 Shorui server running on port ${PORT}`);
    console.log(`📝 Visit http://localhost:${PORT} to access the application`);
    console.log(`🔧 Storage test: http://localhost:${PORT}/test`);
    console.log(`📊 Users in storage: ${UserStorage.getAll().length}\n`);
});

module.exports = app;