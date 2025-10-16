const express = require('express');
const passport = require('passport');
const router = express.Router();

// Google OAuth routes
router.get('/google',
    passport.authenticate('google', { scope: ['profile', 'email'] })
);

router.get('/google/callback',
    passport.authenticate('google', { failureRedirect: '/' }),
    (req, res) => {
        if (req.user.isComplete) {
            res.redirect('/dashboard');
        } else {
            res.redirect('/complete-profile');
        }
    }
);

// Logout route
router.get('/logout', (req, res) => {
    req.logout((err) => {
        if (err) {
            console.error('Logout error:', err);
        }
        res.redirect('/');
    });
});

module.exports = router;