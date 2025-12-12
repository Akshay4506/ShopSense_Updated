const express = require('express');
const router = express.Router();
const db = require('../db');

// Get Profile
router.get('/', async (req, res) => {
    const userId = req.user.id;
    try {
        const result = await db.query('SELECT * FROM profiles WHERE user_id = $1', [userId]);
        res.json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

// Update Profile
router.put('/', async (req, res) => {
    const userId = req.user.id;
    const { shopkeeper_name, shop_name, address, phone_number } = req.body;

    try {
        const result = await db.query(
            `UPDATE profiles 
       SET shopkeeper_name = $1, shop_name = $2, address = $3, phone_number = $4, updated_at = NOW()
       WHERE user_id = $5 
       RETURNING *`,
            [shopkeeper_name, shop_name, address, phone_number, userId]
        );
        res.json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

module.exports = router;
