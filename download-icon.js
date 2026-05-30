const fs = require('fs');
const https = require('https');
const path = require('path');

// Handpicked premium minimalist dark gold financial asset concept from Unsplash (1024x1024 square crop)
const UNSPLASH_ICON_URL = 'https://images.unsplash.com/photo-1621416894569-0f39ed31d247?q=80&w=1024&auto=format&fit=crop&h=1024';

const assetsDir = path.join(__dirname, 'assets');
const destPath = path.join(assetsDir, 'icon.png');

// Enforce assets directory creation if it doesn't exist
if (!fs.existsSync(assetsDir)) {
  fs.mkdirSync(assetsDir, { recursive: true });
}

console.log('[Asset Pipeline]: Fetching premium dark theme app icon from Unsplash...');

https.get(UNSPLASH_ICON_URL, (response) => {
  if (response.statusCode !== 200) {
    console.error(`[Error]: Failed to fetch image stream. Status Code: ${response.statusCode}`);
    return;
  }

  const fileStream = fs.createWriteStream(destPath);
  response.pipe(fileStream);

  fileStream.on('finish', () => {
    fileStream.close();
    console.log('✓ Success! Perfect square app icon synchronized securely to ./assets/icon.png');
  });
}).on('error', (err) => {
  console.error('[Network Error]: Extraction failed:', err.message);
});