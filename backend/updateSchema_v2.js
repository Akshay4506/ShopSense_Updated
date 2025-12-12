const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

async function updateSchema() {
    try {
        console.log("Updating users table schema (v2)...");

        await pool.query(`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS shop_name VARCHAR(255),
      ADD COLUMN IF NOT EXISTS shop_address TEXT,
      ADD COLUMN IF NOT EXISTS phone VARCHAR(20);
    `);

        console.log("Schema updated successfully: Added shop_name, shop_address, phone.");
        process.exit(0);
    } catch (err) {
        console.error("Error updating schema:", err);
        process.exit(1);
    }
}

updateSchema();
