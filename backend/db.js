const { Pool } = require('pg');
require('dotenv').config();

if (!process.env.DATABASE_URL) {
    console.error("CRITICAL ERROR: DATABASE_URL is missing from environment variables.");
    console.error("Please ensure backend/.env exists and contains DATABASE_URL.");
} else {
    console.log("Database connection initialized with URL length:", process.env.DATABASE_URL.length);
}

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

module.exports = {
    query: (text, params) => pool.query(text, params),
};
