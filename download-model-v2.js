const fs = require('fs');
const https = require('https');
const path = require('path');

const dir = path.join(__dirname, 'frontend', 'public');
if (!fs.existsSync(dir)){
    fs.mkdirSync(dir, { recursive: true });
}

// URL for the tar.gz model which might be preferred or just a second attempt
const modelUrl = "https://alphacephei.com/vosk/models/vosk-model-small-en-us-0.15.zip"; 
// Wait, alphacephei has zip. 
// Let's try the one from the vosk-browser demo page which is guaranteed to work with it.
// https://github.com/ccoreilly/vosk-browser uses:
// https://ccoreilly.github.io/vosk-browser/models/vosk-model-small-en-us-0.15.zip

// If the previous one failed, maybe redirects?
// Let's use a robust downloader that handles redirects (https module doesn't handle redirects automatically without logic).

function download(url, dest, cb) {
  const file = fs.createWriteStream(dest);
  const request = https.get(url, function(response) {
    if (response.statusCode === 301 || response.statusCode === 302) {
       console.log("Redirecting to:", response.headers.location);
       download(response.headers.location, dest, cb);
       return;
    }
    
    if (response.statusCode !== 200) {
       console.error(`Failed to download: ${response.statusCode}`);
       fs.unlink(dest, () => {}); // Delete partial
       return;
    }

    response.pipe(file);
    file.on('finish', function() {
      file.close(cb);  // close() is async, call cb after close completes.
    });
  }).on('error', function(err) { // Handle errors
    fs.unlink(dest, () => {}); // Delete the file async. (But we don't check the result)
    if (cb) cb(err.message);
  });
}

const destPath = path.join(dir, 'model.tar.gz');
// Using official Vosk small model tar.gz
// Note: Browser might need zip? The error said "downloaded.tar.gz". 
// Let's download the tar.gz version this time.
download("https://alphacephei.com/vosk/models/vosk-model-small-en-us-0.15.tar.gz", destPath, (err) => {
    if (err) console.error("Download failed:", err);
    else console.log("Download completed: model.tar.gz");
});
