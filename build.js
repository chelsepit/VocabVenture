const fs = require('fs');
const path = require('path');

// Source directory (your app folder)
const sourceDir = './app';
const outputDir = './www';

console.log('🏗️  Building VocabVenture for Capacitor...');

// Create www directory if it doesn't exist
if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
}

// Function to copy directory recursively
function copyDir(src, dest) {
    if (!fs.existsSync(dest)) {
        fs.mkdirSync(dest, { recursive: true });
    }
    
    const entries = fs.readdirSync(src, { withFileTypes: true });
    
    for (let entry of entries) {
        const srcPath = path.join(src, entry.name);
        const destPath = path.join(dest, entry.name);
        
        if (entry.isDirectory()) {
            copyDir(srcPath, destPath);
        } else {
            fs.copyFileSync(srcPath, destPath);
            console.log(`  ✓ Copied ${entry.name}`);
        }
    }
}

// Copy the entire app folder to www
console.log('📁 Copying app/ to www/...');
copyDir(sourceDir, outputDir);

console.log('✅ Build complete! Files copied to www/');
console.log('📱 Ready to run: npx cap sync');