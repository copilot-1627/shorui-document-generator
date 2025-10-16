const express = require('express');
const router = express.Router();
const { getChatSessionsByUserId, getUserUsage } = require('../models/data');

// Middleware to check authentication
const requireAuth = (req, res, next) => {
    if (!req.isAuthenticated() || !req.user.isComplete) {
        return res.redirect('/');
    }
    next();
};

// Dashboard route
router.get('/', requireAuth, (req, res) => {
    const userSessions = getChatSessionsByUserId(req.user.id);
    const usage = getUserUsage(req.user.id);
    
    res.render('dashboard', {
        user: req.user,
        chatSessions: userSessions,
        usage: usage,
        title: 'Dashboard - Shorui'
    });
});

module.exports = router;