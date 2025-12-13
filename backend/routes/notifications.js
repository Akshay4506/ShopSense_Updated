const express = require('express');
const router = express.Router();
const db = require('../db');

router.get('/', async (req, res) => {
    const userId = req.user.id;
    const notifications = [];

    try {
        // 1. Check Low Stock (Threshold: 5)
        const lowStockResult = await db.query(
            'SELECT item_name, quantity, unit FROM inventory WHERE user_id = $1 AND quantity <= 5',
            [userId]
        );

        lowStockResult.rows.forEach(item => {
            notifications.push({
                type: 'low_stock',
                message: `Low Stock: ${item.item_name} is running low (${item.quantity} ${item.unit} left).`,
                severity: 'warning'
            });
        });

        // 2. Check Profit Margin (Simple Heuristic on recent bills)
        // Get total sales and cost for current month
        const profitResult = await db.query(
            `SELECT 
                SUM(total_amount) as revenue, 
                SUM(total_cost) as cost 
             FROM bills 
             WHERE user_id = $1 
             AND created_at >= NOW() - INTERVAL '30 days'`,
            [userId]
        );

        const { revenue, cost } = profitResult.rows[0];

        if (revenue && cost) {
            const margin = revenue - cost;
            const percentage = (margin / revenue) * 100;

            if (percentage < 10) {
                notifications.push({
                    type: 'low_profit',
                    message: `Low Profit Margin: Your margin is only ${percentage.toFixed(1)}% this month.`,
                    severity: 'alert'
                });
            } else if (margin < 0) {
                notifications.push({
                    type: 'loss',
                    message: `Loss Warning: You are operating at a loss this month.`,
                    severity: 'critical'
                });
            }
        }

        res.json(notifications);

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

module.exports = router;
