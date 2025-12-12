const db = require('./db');

async function checkSchema() {
    try {
        const res = await db.query(`
      SELECT column_name, data_type, column_default 
      FROM information_schema.columns 
      WHERE table_name = 'daily_sessions';
    `);
        console.log('Daily Sessions Columns:', res.rows);
    } catch (err) {
        console.error(err);
    }
}

checkSchema();
