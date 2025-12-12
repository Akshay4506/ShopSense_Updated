const express = require('express');
const router = express.Router();
const pool = require('../db');
const auth = require('../middleware/auth');

// Get all bills for analytics (simplified for now, ideally should use specific queries)
router.get('/bills', auth, async (req, res) => {
    try {
        const result = await pool.query(
            'SELECT id, total_amount, total_cost, created_at FROM bills WHERE user_id = $1 ORDER BY created_at DESC',
            [req.user.userId]
        );

        // For top sellers, we might need bill items. 
        // Optimization: separate endpoint or join. 
        // For now, let's just return bills and handle client side aggregation or correct top sellers query.
        res.json(result.rows);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// Top Sellers
router.get('/top-sellers', auth, async (req, res) => {
    try {
        // Join bill_items with bills to ensure user_id match
        const result = await pool.query(`
      SELECT bi.item_name, SUM(bi.quantity) as quantity, SUM(bi.selling_price * bi.quantity) as revenue
      FROM bill_items bi
      JOIN bills b ON bi.bill_id = b.id
      WHERE b.user_id = $1
      GROUP BY bi.item_name
      ORDER BY revenue DESC
      LIMIT 5
    `, [req.user.userId]);

        res.json(result.rows);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// GST Data / Monthly Stats
// This can be calculated on frontend from /bills or done here. 
// Let's stick to /bills for raw data to match frontend logic for now, or add specific aggregation if needed.

module.exports = router;
