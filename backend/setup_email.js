const fs = require('fs');
const path = require('path');
const readline = require('readline');

const envPath = path.join(__dirname, '.env');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

console.log("\n--- Gmail App Password Setup only for ShopSense ---");
console.log("To send real emails, you need an App Password.");
console.log("1. Go to https://myaccount.google.com/security");
console.log("2. Enable 2-Step Verification if not on.");
console.log("3. Search for 'App Passwords'.");
console.log("4. Create one named 'ShopSense'.");
console.log("5. Copy the 16-character code.");

rl.question('\nEnter your GMAIL Address: ', (email) => {
    rl.question('Enter your 16-char APP PASSWORD: ', (pass) => {

        let envContent = fs.readFileSync(envPath, 'utf8');

        // Remove old keys if they exist
        envContent = envContent.replace(/EMAIL_USER=.*\n/g, '');
        envContent = envContent.replace(/EMAIL_PASS=.*\n/g, '');

        // Add new keys
        envContent += `\nEMAIL_USER=${email.trim()}`;
        envContent += `\nEMAIL_PASS=${pass.trim()}`;

        fs.writeFileSync(envPath, envContent);
        console.log("\nSuccess! .env file updated.");
        console.log("Please restart your server: 'node server.js'");
        rl.close();
    });
});
