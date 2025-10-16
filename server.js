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

// Middleware
app.use(helmet({
    contentSecurityPolicy: false // Disabled for Tailwind CDN
}));
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100 // limit each IP to 100 requests per windowMs
});
app.use(limiter);

// Session configuration
app.use(session({
    secret: process.env.SESSION_SECRET || 'your-secret-key-change-in-production',
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false, maxAge: 24 * 60 * 60 * 1000 } // 24 hours
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
            // Create new user (will be completed with phone number)
            const newUser = {
                id: users.length + 1,
                googleId: profile.id,
                email: profile.emails[0].value,
                firstName: profile.name.givenName,
                lastName: profile.name.familyName,
                phone: null, // To be filled later
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

// Set view engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Make user data available to all templates
app.use((req, res, next) => {
    res.locals.user = req.user;
    next();
});

// Routes
app.use('/auth', authRoutes);
app.use('/dashboard', dashboardRoutes);
app.use('/chat', chatRoutes);

// Home route
app.get('/', (req, res) => {
    if (req.isAuthenticated() && req.user.isComplete) {
        return res.redirect('/dashboard');
    }
    res.render('index');
});

// Complete profile route
app.get('/complete-profile', (req, res) => {
    if (!req.isAuthenticated()) {
        return res.redirect('/');
    }
    if (req.user.isComplete) {
        return res.redirect('/dashboard');
    }
    res.render('complete-profile');
});

app.post('/complete-profile', (req, res) => {
    if (!req.isAuthenticated()) {
        return res.redirect('/');
    }
    
    const { phone } = req.body;
    
    // Check if phone number is already used
    const existingUser = users.find(u => u.phone === phone && u.id !== req.user.id);
    if (existingUser) {
        return res.render('complete-profile', { 
            error: 'Phone number is already linked to another account' 
        });
    }
    
    // Update user
    const userIndex = users.findIndex(u => u.id === req.user.id);
    if (userIndex !== -1) {
        users[userIndex].phone = phone;
        users[userIndex].isComplete = true;
        
        // Initialize usage limits
        usageLimits[req.user.id] = {
            documentsGenerated: 0,
            monthlyLimit: 10,
            resetDate: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1)
        };
    }
    
    res.redirect('/dashboard');
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).render('error', { message: 'Something went wrong!' });
});

// 404 handler
app.use((req, res) => {
    res.status(404).render('404');
});

app.listen(PORT, () => {
    console.log(`Shorui server running on port ${PORT}`);
    console.log(`Visit http://localhost:${PORT} to access the application`);
});

module.exports = app;