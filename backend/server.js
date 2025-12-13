const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const authRoutes = require('./routes/auth');
const profileRoutes = require('./routes/profile');
const inventoryRoutes = require('./routes/inventory');
const billingRoutes = require('./routes/billing');
const dailyOperationsRoutes = require('./routes/daily-operations');
const reportsRoutes = require('./routes/reports');
const notificationRoutes = require('./routes/notifications');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Auth Middleware to protect routes
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) return res.sendStatus(401);

    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
        if (err) return res.sendStatus(403);
        req.user = user;
        next();
    });
};

// Public Routes
app.use('/api/auth', authRoutes);

// Protected Routes
app.use('/api/profile', authenticateToken, profileRoutes);
app.use('/api/inventory', authenticateToken, inventoryRoutes);
app.use('/api/billing', authenticateToken, billingRoutes);
app.use('/api/daily-operations', authenticateToken, dailyOperationsRoutes);
app.use('/api/reports', authenticateToken, reportsRoutes);
app.use('/api/notifications', authenticateToken, notificationRoutes);

app.get('/', (req, res) => {
    res.send('ShopSense API is running');
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
