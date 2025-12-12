const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

async function updateSchema() {
    try {
        console.log("Updating users table schema (v3)...");

        await pool.query(`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS shopkeeper_name VARCHAR(255);
    `);

        console.log("Schema updated successfully: Added shopkeeper_name.");
        process.exit(0);
    } catch (err) {
        console.error("Error updating schema:", err);
        process.exit(1);
    }
}

updateSchema();
