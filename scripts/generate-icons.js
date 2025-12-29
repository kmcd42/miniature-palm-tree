// Simple icon generation script
// Run with: node scripts/generate-icons.js
// Requires: npm install sharp

const fs = require('fs');
const path = require('path');

// Check if sharp is available
try {
  const sharp = require('sharp');

  const sizes = [72, 96, 128, 144, 152, 192, 384, 512];
  const svgPath = path.join(__dirname, '../public/icons/icon.svg');
  const svgBuffer = fs.readFileSync(svgPath);

  async function generateIcons() {
    for (const size of sizes) {
      const outputPath = path.join(__dirname, `../public/icons/icon-${size}.png`);
      await sharp(svgBuffer)
        .resize(size, size)
        .png()
        .toFile(outputPath);
      console.log(`Generated: icon-${size}.png`);
    }

    // Generate favicon
    await sharp(svgBuffer)
      .resize(32, 32)
      .png()
      .toFile(path.join(__dirname, '../public/favicon.ico'));
    console.log('Generated: favicon.ico');
  }

  generateIcons().catch(console.error);
} catch (e) {
  console.log('Sharp not installed. Creating placeholder icons...');

  // Create minimal placeholder (1x1 purple pixel PNG)
  const sizes = [72, 96, 128, 144, 152, 192, 384, 512];
  const iconsDir = path.join(__dirname, '../public/icons');

  // Minimal valid PNG (1x1 transparent)
  const minimalPNG = Buffer.from([
    0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0x00, 0x00, 0x00, 0x0D,
    0x49, 0x48, 0x44, 0x52, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
    0x08, 0x06, 0x00, 0x00, 0x00, 0x1F, 0x15, 0xC4, 0x89, 0x00, 0x00, 0x00,
    0x0D, 0x49, 0x44, 0x41, 0x54, 0x08, 0xD7, 0x63, 0x60, 0x60, 0x60, 0x60,
    0x00, 0x00, 0x00, 0x05, 0x00, 0x01, 0x87, 0xA1, 0x4E, 0xD4, 0x00, 0x00,
    0x00, 0x00, 0x49, 0x45, 0x4E, 0x44, 0xAE, 0x42, 0x60, 0x82
  ]);

  for (const size of sizes) {
    fs.writeFileSync(path.join(iconsDir, `icon-${size}.png`), minimalPNG);
    console.log(`Created placeholder: icon-${size}.png`);
  }

  fs.writeFileSync(path.join(__dirname, '../public/favicon.ico'), minimalPNG);
  console.log('Created placeholder: favicon.ico');
  console.log('\nFor proper icons, run: npm install sharp && node scripts/generate-icons.js');
}
