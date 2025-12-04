/**
 * Icon Generator Script for PWA
 * This script generates all required icon sizes from the source logo
 *
 * Prerequisites: Install sharp package
 * npm install --save-dev sharp
 *
 * Usage: node generate-icons.js
 */

const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

// Icon sizes needed for PWA
const sizes = [72, 96, 128, 144, 152, 180, 192, 384, 512];

// Source image
const sourceImage = path.join(__dirname, 'public', 'theta-logo.png');
const outputDir = path.join(__dirname, 'public');

async function generateIcons() {
  try {
    // Check if source image exists
    if (!fs.existsSync(sourceImage)) {
      console.error(`Source image not found: ${sourceImage}`);
      process.exit(1);
    }

    console.log('Starting icon generation...');
    console.log(`Source: ${sourceImage}\n`);

    // Generate icons for each size
    for (const size of sizes) {
      const outputPath = path.join(outputDir, `icon-${size}x${size}.png`);

      await sharp(sourceImage)
        .resize(size, size, {
          fit: 'contain',
          background: { r: 255, g: 255, b: 255, alpha: 0 }
        })
        .png()
        .toFile(outputPath);

      console.log(`✓ Generated: icon-${size}x${size}.png`);
    }

    console.log('\n✓ All icons generated successfully!');
    console.log('\nGenerated files:');
    sizes.forEach(size => {
      console.log(`  - icon-${size}x${size}.png`);
    });

  } catch (error) {
    console.error('Error generating icons:', error);
    process.exit(1);
  }
}

// Run the generator
generateIcons();
