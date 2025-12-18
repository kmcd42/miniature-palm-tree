/**
 * Creates placeholder image files for the portfolio site
 * This is a simple placeholder - replace with actual images
 */

const fs = require('fs');
const path = require('path');

const placeholders = [
  'hero-image.jpg',
  'about-photo.jpg',
  'project-1.jpg',
  'project-2.jpg',
  'project-3.jpg',
  'contact-1.jpg',
  'contact-2.jpg',
  'projects/bolton-hotel.jpg',
  'projects/karawhiua.jpg',
  'projects/silverstripe.jpg',
  'projects/wearableart.jpg',
  'projects/doctor-who.jpg',
  'projects/nice-little-palaces.jpg',
  'projects/project-zero.jpg',
  'photography/abstract-cover.jpg',
  'photography/urban-cover.jpg',
  'photography/documentary-cover.jpg',
];

// Add numbered photography images
for (let i = 1; i <= 8; i++) {
  placeholders.push(`photography/abstract-${i}.jpg`);
  placeholders.push(`photography/urban-${i}.jpg`);
  placeholders.push(`photography/documentary-${i}.jpg`);
}

const publicDir = path.join(__dirname, '..', 'public', 'images');

// Create a simple SVG placeholder
const createSvgPlaceholder = (filename) => {
  const basename = path.basename(filename, path.extname(filename));
  const width = 1200;
  const height = 800;

  const svg = `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
  <rect width="${width}" height="${height}" fill="#1a1a1a"/>
  <text x="50%" y="50%" font-family="Arial, sans-serif" font-size="24" fill="#F4D03F" text-anchor="middle" dominant-baseline="middle">
    ${basename}
  </text>
  <text x="50%" y="55%" font-family="Arial, sans-serif" font-size="16" fill="#666" text-anchor="middle" dominant-baseline="middle">
    Replace with actual image
  </text>
</svg>`;

  const filepath = path.join(publicDir, filename.replace('.jpg', '.svg'));
  const dir = path.dirname(filepath);

  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  fs.writeFileSync(filepath, svg);
  console.log(`Created: ${filename.replace('.jpg', '.svg')}`);
};

// Create all placeholders
placeholders.forEach(createSvgPlaceholder);

console.log('\nPlaceholder images created successfully!');
console.log('Replace these SVG files with your actual images in public/images/');
