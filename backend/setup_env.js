const fs = require('fs');
const path = require('path');
const readline = require('readline');
const { execSync } = require('child_process');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

const envPath = path.join(__dirname, '.env');

console.log("\n--- ShopSense Environment Setup ---\n");
console.log("It seems your .env file is missing or not saved correctly.");
console.log("I will create it for you.\n");

rl.question('Please paste your full DATABASE_URL (e.g., postgres://postgres:password@localhost:5432/shopsense): ', (answer) => {
    const dbUrl = answer.trim();

    if (!dbUrl) {
        console.error("Error: URL cannot be empty.");
        rl.close();
        return;
    }

    const content = `DATABASE_URL=${dbUrl}\nJWT_SECRET=supersecretkey123\n# Add EMAIL_USER and EMAIL_PASS here for forgot password functionality\n`;

    fs.writeFileSync(envPath, content);
    console.log(`\nSuccess! .env file created at: ${envPath}`);

    console.log("\nAttempting to run schema update now...\n");

    try {
        execSync('node updateSchema.js', { stdio: 'inherit' });
        console.log("\nSchema update verified! You can now restart your server with 'node server.js'");
    } catch (error) {
        console.error("\nSchema update failed. Please check your connection string and try again.");
    }

    rl.close();
});
