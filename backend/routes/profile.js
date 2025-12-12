const express = require('express');
const router = express.Router();
const db = require('../db');

// Get Profile
// Get Profile
router.get('/', async (req, res) => {
    const userId = req.user.id;
    try {
        const result = await db.query('SELECT shopkeeper_name, shop_name, shop_address AS address, phone AS phone_number FROM users WHERE id = $1', [userId]);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }
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
            `UPDATE users 
       SET shopkeeper_name = $1, shop_name = $2, shop_address = $3, phone = $4
       WHERE id = $5 
       RETURNING shopkeeper_name, shop_name, shop_address AS address, phone AS phone_number`,
            [shopkeeper_name, shop_name, address, phone_number, userId]
        );
        res.json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

module.exports = router;
