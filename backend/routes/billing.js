const express = require('express');
const router = express.Router();
const db = require('../db');

// Create Bill
router.post('/', async (req, res) => {
    const userId = req.user.id;
    const { items, total_amount, total_cost } = req.body; // items: [{ item_name, quantity, selling_price, cost_price, inventory_id (optional), unit }]

    if (!items || items.length === 0) {
        return res.status(400).json({ error: 'No items in bill' });
    }

    try {
        await db.query('BEGIN');

        // Create Bill
        const billResult = await db.query(
            `INSERT INTO bills (user_id, total_amount, total_cost)
       VALUES ($1, $2, $3)
       RETURNING *`,
            [userId, total_amount, total_cost]
        );
        const bill = billResult.rows[0];

        // Add Bill Items and Update Inventory
        for (const item of items) {
            await db.query(
                `INSERT INTO bill_items (bill_id, inventory_id, item_name, quantity, unit, selling_price, cost_price)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
                [bill.id, item.inventory_id || null, item.item_name, item.quantity, item.unit, item.selling_price, item.cost_price]
            );

            // Decrement inventory if linked
            if (item.inventory_id) {
                await db.query(
                    `UPDATE inventory 
           SET quantity = quantity - $1, updated_at = NOW()
           WHERE id = $2 AND user_id = $3`,
                    [item.quantity, item.inventory_id, userId]
                );
            }
        }

        await db.query('COMMIT');
        res.status(201).json(bill);
    } catch (err) {
        await db.query('ROLLBACK');
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

router.get('/', async (req, res) => {
    const userId = req.user.id;
    try {
        // Basic fetch, more details could be fetched if needed
        const result = await db.query(
            'SELECT * FROM bills WHERE user_id = $1 ORDER BY created_at DESC',
            [userId]
        );
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

// Get Bill Details (with items)
router.get('/:id', async (req, res) => {
    const userId = req.user.id;
    const { id } = req.params;

    try {
        const billResult = await db.query(
            'SELECT * FROM bills WHERE id = $1 AND user_id = $2',
            [id, userId]
        );

        if (billResult.rows.length === 0) {
            return res.status(404).json({ error: 'Bill not found' });
        }

        const bill = billResult.rows[0];

        const itemsResult = await db.query(
            'SELECT * FROM bill_items WHERE bill_id = $1',
            [id]
        );

        bill.items = itemsResult.rows;
        res.json(bill);

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

module.exports = router;
