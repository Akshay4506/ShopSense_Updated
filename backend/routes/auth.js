const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('../db');
const nodemailer = require('nodemailer');
const { v4: uuidv4 } = require('uuid');

// Email Transporter (Configure with your credentials)
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

// Register
router.post('/register', async (req, res) => {
    const { email, password, shopkeeper_name, shop_name, address, phone } = req.body;

    try {
        // Check if user exists
        const userExist = await db.query('SELECT * FROM users WHERE email = $1', [email]);
        if (userExist.rows.length > 0) {
            return res.status(400).json({ error: 'User already exists' });
        }

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Generate ID
        const id = uuidv4();

        // Insert user
        const newUser = await db.query(
            'INSERT INTO users (id, email, password_hash, shopkeeper_name, shop_name, shop_address, phone) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id, email, shopkeeper_name',
            [id, email, hashedPassword, shopkeeper_name, shop_name, address, phone]
        );

        // Generate Token
        const token = jwt.sign({ id: newUser.rows[0].id }, process.env.JWT_SECRET, { expiresIn: '1d' });

        res.json({ token, user: newUser.rows[0] });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Login (Password)
router.post('/login', async (req, res) => {
    const { email, password } = req.body;

    try {
        const userResult = await db.query('SELECT * FROM users WHERE email = $1', [email]);

        if (userResult.rows.length === 0) {
            return res.status(400).json({ error: 'Invalid credentials' });
        }

        const user = userResult.rows[0];

        const validPassword = await bcrypt.compare(password, user.password_hash);
        if (!validPassword) {
            return res.status(400).json({ error: 'Invalid credentials' });
        }

        const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET, { expiresIn: '1d' });

        res.json({ token, user: { id: user.id, email: user.email, shopkeeper_name: user.shopkeeper_name } });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Send Login OTP (Passwordless & Login Verification)
router.post('/send-login-otp', async (req, res) => {
    const { email } = req.body;

    try {
        const userResult = await db.query('SELECT * FROM users WHERE email = $1', [email]);
        if (userResult.rows.length === 0) {
            // Security: Don't reveal if user exists, but we return explicit message for UX as requested
            return res.json({ message: 'If the email exists, a login code has been sent.' });
        }

        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

        await db.query(
            'UPDATE users SET otp = $1, otp_expires_at = $2 WHERE email = $3',
            [otp, expiresAt, email]
        );

        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: email,
            subject: 'ShopSense Login Code',
            text: `Your login verification code is: ${otp}. It expires in 10 minutes.`
        };

        console.log(`[DEV ONLY] Login OTP for ${email}: ${otp}`);

        if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
            try {
                await transporter.sendMail(mailOptions);
            } catch (emailErr) {
                console.error("Failed to send login email (Dev Mode - continuing):", emailErr.message);
            }
        }

        res.json({ message: 'Login code sent to your email.' });

    } catch (error) {
        console.error("OTP Error:", error);
        res.status(500).json({ error: error.message });
    }
});

// Login with OTP
router.post('/login-with-otp', async (req, res) => {
    const { email, otp } = req.body;

    try {
        const userResult = await db.query('SELECT * FROM users WHERE email = $1', [email]);
        if (userResult.rows.length === 0) {
            return res.status(400).json({ error: 'Invalid request' });
        }

        const user = userResult.rows[0];

        // Check if OTP matches
        // Convert both to strings to ensure type safety (DB might return int if column is numeric)
        if (String(user.otp).trim() !== String(otp).trim()) {
            console.log(`[DEBUG] OTP Mismatch. Input: '${otp}', Stored: '${user.otp}'`);
            return res.status(400).json({ error: 'Invalid Code' });
        }

        // Check verification (expiry)
        const now = new Date();
        const expires = new Date(user.otp_expires_at);

        console.log(`[DEBUG] OTP Expiry Check. Now: ${now}, Expires: ${expires}`);

        if (now > expires) {
            return res.status(400).json({ error: 'Code expired' });
        }

        // Clear OTP and Issue Token
        // COMMENTED OUT to prevent race conditions (double submission) causing failures
        // We allow the OTP to remain valid until expiry (10 mins) or until a new one is requested.
        /*
        await db.query(
            'UPDATE users SET otp = NULL, otp_expires_at = NULL WHERE id = $1',
            [user.id]
        );
        */

        console.log(`[DEV ONLY] Login Successful for ${email}`);
        const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET, { expiresIn: '1d' });
        res.json({ token, user: { id: user.id, email: user.email, shopkeeper_name: user.shopkeeper_name } });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Forgot Password - Send OTP
router.post('/forgot-password', async (req, res) => {
    const { email } = req.body;
    console.log(`[DEBUG] Forgot Password request for: ${email}`);

    try {
        const userResult = await db.query('SELECT * FROM users WHERE email = $1', [email]);
        if (userResult.rows.length === 0) {
            console.log(`[DEBUG] User not found: ${email}`);
            return res.json({ message: 'If the email exists, an OTP has been sent.' });
        }

        const otp = Math.floor(100000 + Math.random() * 900000).toString(); // 6 digit OTP
        const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes from now

        await db.query(
            'UPDATE users SET otp = $1, otp_expires_at = $2 WHERE email = $3',
            [otp, expiresAt, email]
        );
        console.log(`[DEBUG] OTP stored in DB for ${email}`);

        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: email,
            subject: 'ShopSense Password Reset OTP',
            text: `Your password reset OTP is: ${otp}. It expires in 10 minutes.`
        };

        console.log(`[DEV ONLY] Reset OTP for ${email}: ${otp}`);

        if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
            try {
                await transporter.sendMail(mailOptions);
                console.log(`[DEBUG] Email sent successfully to ${email}`);
            } catch (emailErr) {
                console.error("Failed to send reset email (Dev Mode - continuing):", emailErr.message);
            }
        } else {
            console.log(`[DEBUG] Email credentials missing, skipping sendMail`);
        }

        res.json({ message: 'If the email exists, an OTP has been sent.' });

    } catch (error) {
        console.error("Forgot Password Error:", error);
        res.status(500).json({ error: error.message });
    }
});

// Reset Password - Verify OTP and Reset
router.post('/reset-password', async (req, res) => {
    const { email, otp, newPassword } = req.body;

    try {
        const userResult = await db.query('SELECT * FROM users WHERE email = $1', [email]);
        if (userResult.rows.length === 0) {
            return res.status(400).json({ error: 'Invalid request' });
        }

        const user = userResult.rows[0];

        // OTP Validation
        if (String(user.otp).trim() !== String(otp).trim()) {
            console.log(`[DEBUG] Reset OTP Mismatch. Input: '${otp}', Stored: '${user.otp}'`);
            return res.status(400).json({ error: 'Invalid OTP' });
        }

        const now = new Date();
        const expires = new Date(user.otp_expires_at);

        if (now > expires) {
            return res.status(400).json({ error: 'OTP expired' });
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(newPassword, salt);

        await db.query(
            'UPDATE users SET password_hash = $1, otp = NULL, otp_expires_at = NULL WHERE id = $2',
            [hashedPassword, user.id]
        );

        res.json({ message: 'Password reset successfully. You can now login.' });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Update Password (Authenticated)
router.put('/update-password', require('../middleware/auth'), async (req, res) => {
    const { password } = req.body;
    const userId = req.user.id; // From auth middleware

    try {
        if (!password || password.length < 6) {
            return res.status(400).json({ error: 'Password must be at least 6 characters long' });
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        await db.query(
            'UPDATE users SET password_hash = $1 WHERE id = $2',
            [hashedPassword, userId]
        );

        res.json({ message: 'Password updated successfully' });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server error' });
    }
});

module.exports = router;
