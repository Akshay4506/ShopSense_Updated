const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

async function clearDb() {
    try {
        console.log("Fetching table list...");
        const res = await pool.query(`
      SELECT tablename FROM pg_tables WHERE schemaname = 'public';
    `);

        const tables = res.rows
            .map(row => row.tablename)
            .filter(t => t !== 'migrations'); // Safety check, though probably no migrations table yet

        if (tables.length === 0) {
            console.log("No tables found to clear.");
            process.exit(0);
        }

        console.log(`Clearing tables: ${tables.join(', ')}`);

        // Truncate all tables with CASCADE to handle foreign keys
        await pool.query(`TRUNCATE TABLE ${tables.join(', ')} CASCADE;`);

        console.log("All data cleared successfully.");
        process.exit(0);
    } catch (err) {
        console.error("Error clearing database:", err);
        process.exit(1);
    }
}

clearDb();
