const express = require('express');
const router = express.Router();
const db = require('../db');

// Get All Items
router.get('/', async (req, res) => {
    const userId = req.user.id;
    try {
        const result = await db.query('SELECT * FROM inventory WHERE user_id = $1 ORDER BY item_name', [userId]);
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

// Add Item
router.post('/', async (req, res) => {
    const userId = req.user.id;
    const { item_name, quantity, unit, cost_price, selling_price } = req.body;

    try {
        const result = await db.query(
            `INSERT INTO inventory (user_id, item_name, quantity, unit, cost_price, selling_price)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
            [userId, item_name, quantity, unit, cost_price, selling_price]
        );
        res.status(201).json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

// Update Item
router.put('/:id', async (req, res) => {
    const userId = req.user.id;
    const { id } = req.params;
    const { item_name, quantity, unit, cost_price, selling_price } = req.body;

    try {
        const result = await db.query(
            `UPDATE inventory 
       SET item_name = $1, quantity = $2, unit = $3, cost_price = $4, selling_price = $5, updated_at = NOW()
       WHERE id = $6 AND user_id = $7
       RETURNING *`,
            [item_name, quantity, unit, cost_price, selling_price, id, userId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Item not found' });
        }
        res.json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

// Delete Item
router.delete('/:id', async (req, res) => {
    const userId = req.user.id;
    const { id } = req.params;

    try {
        const result = await db.query('DELETE FROM inventory WHERE id = $1 AND user_id = $2 RETURNING *', [id, userId]);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Item not found' });
        }
        res.json({ message: 'Item deleted' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

module.exports = router;
