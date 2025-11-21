const fs = require('fs');
const path = require('path');

// Generate timestamp for cache busting
const timestamp = Date.now();

// Read the built index.html
const indexPath = path.join(__dirname, 'build', 'index.html');
let html = fs.readFileSync(indexPath, 'utf8');

// Add timestamp to all JS and CSS files
html = html.replace(/src="([^"]+\.js)"/g, `src="$1?v=${timestamp}"`);
html = html.replace(/href="([^"]+\.css)"/g, `href="$1?v=${timestamp}"`);

// Write back
fs.writeFileSync(indexPath, html);

console.log(`✅ Cache busting applied with timestamp: ${timestamp}`);
