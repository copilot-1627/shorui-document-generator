const express = require('express');
const passport = require('passport');
const router = express.Router();

// Google OAuth routes
router.get('/google', (req, res, next) => {
    console.log('Initiating Google OAuth');
    passport.authenticate('google', { scope: ['profile', 'email'] })(req, res, next);
});

router.get('/google/callback',
    passport.authenticate('google', { failureRedirect: '/' }),
    (req, res) => {
        console.log('Google OAuth callback success for:', req.user.email);
        console.log('User complete status:', req.user.isComplete);
        
        if (req.user.isComplete) {
            console.log('User profile complete, redirecting to dashboard');
            res.redirect('/dashboard');
        } else {
            console.log('User profile incomplete, redirecting to complete-profile');
            res.redirect('/complete-profile');
        }
    }
);

// Logout route
router.get('/logout', (req, res) => {
    console.log('User logging out:', req.user ? req.user.email : 'unknown');
    
    req.logout((err) => {
        if (err) {
            console.error('Logout error:', err);
        }
        
        // Destroy session
        req.session.destroy((err) => {
            if (err) {
                console.error('Session destroy error:', err);
            }
            res.clearCookie('connect.sid');
            res.redirect('/');
        });
    });
});

module.exports = router;