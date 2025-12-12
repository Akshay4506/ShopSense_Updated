require('dotenv').config();
const db = require('./db');

async function debugUser() {
    const email = 'scs425114@gmail.com'; // The email from the user log
    try {
        console.log(`Checking user: ${email}`);
        const res = await db.query('SELECT id, email, otp, otp_expires_at FROM users WHERE email = $1', [email]);
        console.log('User Record:', res.rows);

        if (res.rows.length === 0) {
            console.log("No user found!");
            return;
        }

        // Simulate Update
        console.log("Simulating OTP Update...");
        const otp = '999999';
        const expiresAt = new Date(Date.now() + 600000);
        const updateRes = await db.query(
            'UPDATE users SET otp = $1, otp_expires_at = $2 WHERE email = $3 RETURNING *',
            [otp, expiresAt, email]
        );
        console.log("Update Result Row Count:", updateRes.rowCount);
        console.log("Updated Record:", updateRes.rows[0]);

        // Verify Persistence
        console.log("Verifying Persistence...");
        const verifyRes = await db.query('SELECT id, email, otp FROM users WHERE email = $1', [email]);
        console.log('User Record After Update:', verifyRes.rows);

    } catch (e) {
        console.error(e);
    } finally {
        process.exit();
    }
}

debugUser();
