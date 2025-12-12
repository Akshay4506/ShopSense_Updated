require('dotenv').config();
const db = require('./db');

async function updateSchema() {
    try {
        console.log("Updating users table schema...");

        // Add otp and otp_expires_at columns if they don't exist
        await db.query(`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS otp VARCHAR(6),
      ADD COLUMN IF NOT EXISTS otp_expires_at TIMESTAMP;
    `);

        console.log("Schema updated successfully.");
        process.exit(0);
    } catch (err) {
        console.error("Error updating schema:", err);
        process.exit(1);
    }
}

updateSchema();
