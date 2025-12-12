const express = require('express');
const router = express.Router();
const pool = require('../db');
const auth = require('../middleware/auth'); // Assuming you have an auth middleware

// Get active session
router.get('/active', auth, async (req, res) => {
    try {
        const result = await pool.query(
            'SELECT * FROM daily_sessions WHERE user_id = $1 AND status = $2 LIMIT 1',
            [req.user.userId, 'active']
        );
        res.json(result.rows[0] || null);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// Get bills for current active session
router.get('/today-bills', auth, async (req, res) => {
    try {
        const { startTime } = req.query;
        if (!startTime) return res.json([]);

        const result = await pool.query(
            'SELECT total_amount, total_cost, created_at FROM bills WHERE user_id = $1 AND created_at >= $2',
            [req.user.userId, startTime]
        );
        res.json(result.rows);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// Get past sessions
router.get('/past', auth, async (req, res) => {
    try {
        const result = await pool.query(
            'SELECT * FROM daily_sessions WHERE user_id = $1 AND status = $2 ORDER BY end_time DESC LIMIT 7',
            [req.user.userId, 'closed']
        );
        res.json(result.rows);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// Start Day
router.post('/start', auth, async (req, res) => {
    try {
        // Check if already active
        const active = await pool.query(
            'SELECT * FROM daily_sessions WHERE user_id = $1 AND status = $2',
            [req.user.userId, 'active']
        );
        if (active.rows.length > 0) {
            return res.status(400).json({ message: 'Day already started' });
        }

        const newSession = await pool.query(
            'INSERT INTO daily_sessions (user_id, status, start_time) VALUES ($1, $2, NOW()) RETURNING *',
            [req.user.userId, 'active']
        );
        res.json(newSession.rows[0]);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// End Day
router.put('/end', auth, async (req, res) => {
    try {
        const { id, total_sales, total_cost } = req.body;

        const result = await pool.query(
            'UPDATE daily_sessions SET status = $1, end_time = NOW(), total_sales = $2, total_cost = $3 WHERE id = $4 AND user_id = $5 RETURNING *',
            ['closed', total_sales, total_cost, id, req.user.userId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Session not found or unauthorized' });
        }

        res.json(result.rows[0]);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

module.exports = router;
