const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

async function setupDatabase() {
    try {
        const sqlPath = path.join(__dirname, 'database.sql');
        const sql = fs.readFileSync(sqlPath, 'utf8');

        console.log('Running database setup...');
        await pool.query(sql);
        console.log('Database tables created successfully!');
    } catch (err) {
        console.error('Error setting up database:', err);
    } finally {
        await pool.end();
    }
}

setupDatabase();
