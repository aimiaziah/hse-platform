// test-pdf-viewer-setup.js
// Quick test script to verify PDF.js viewer setup

const fs = require('fs');
const path = require('path');

console.log('🔍 Checking PDF.js Viewer Setup...\n');

// Check if public directory exists
const publicDir = path.join(__dirname, 'public');
const pdfViewerDir = path.join(publicDir, 'pdf-viewer', 'web');

console.log('📁 Checking directories:');
console.log(`   Public: ${fs.existsSync(publicDir) ? '✅' : '❌'} ${publicDir}`);
console.log(`   PDF Viewer: ${fs.existsSync(pdfViewerDir) ? '✅' : '❌'} ${pdfViewerDir}`);

// Check for required PDF.js files
const requiredFiles = [
  'viewer.html',
  'viewer.js',
  'viewer.css',
];

console.log('\n📄 Checking required files:');
let allFilesExist = true;

requiredFiles.forEach(file => {
  const filePath = path.join(pdfViewerDir, file);
  const exists = fs.existsSync(filePath);
  console.log(`   ${file}: ${exists ? '✅' : '❌'}`);
  if (!exists) allFilesExist = false;
});

// Check component files
console.log('\n🧩 Checking component files:');
const componentFiles = [
  { name: 'PDFJSViewer Component', path: 'src/components/PDFJSViewer.tsx' },
  { name: 'Supervisor Review Page', path: 'src/pages/supervisor/review/[id].tsx' },
  { name: 'Global Styles', path: 'src/styles/globals.css' },
];

componentFiles.forEach(({ name, path: filePath }) => {
  const fullPath = path.join(__dirname, filePath);
  const exists = fs.existsSync(fullPath);
  console.log(`   ${name}: ${exists ? '✅' : '❌'}`);
});

// Final status
console.log('\n' + '='.repeat(50));
if (allFilesExist && fs.existsSync(pdfViewerDir)) {
  console.log('✅ PDF.js Viewer Setup Complete!');
  console.log('\n📝 Next Steps:');
  console.log('   1. Start the development server: npm run dev');
  console.log('   2. Navigate to a supervisor review page');
  console.log('   3. Click the "PDF" toggle button to test the viewer');
  console.log('\n📚 Documentation: PDF_VIEWER_IMPLEMENTATION.md');
} else {
  console.log('❌ PDF.js Viewer Setup Incomplete');
  console.log('\n🔧 Required Actions:');

  if (!fs.existsSync(pdfViewerDir)) {
    console.log('\n   1. Download PDF.js from:');
    console.log('      https://github.com/mozilla/pdf.js/releases');
    console.log('\n   2. Extract to public/pdf-viewer/');
    console.log('\n   3. Verify the following structure:');
    console.log('      public/');
    console.log('        └── pdf-viewer/');
    console.log('            └── web/');
    console.log('                ├── viewer.html');
    console.log('                ├── viewer.js');
    console.log('                └── viewer.css');
  }

  console.log('\n   4. Run this test again: node test-pdf-viewer-setup.js');
}
console.log('='.repeat(50) + '\n');

// Generate installation instructions if needed
if (!allFilesExist || !fs.existsSync(pdfViewerDir)) {
  const installScript = `
# PDF.js Installation Script
# Run these commands to install PDF.js

# Option 1: Using wget (Linux/Mac)
cd public
mkdir -p pdf-viewer
cd pdf-viewer
wget https://github.com/mozilla/pdf.js/releases/download/v3.11.174/pdfjs-3.11.174-dist.zip
unzip pdfjs-3.11.174-dist.zip
mv build/* web/
cd ../..

# Option 2: Manual download
# 1. Visit: https://github.com/mozilla/pdf.js/releases
# 2. Download the latest "pdfjs-X.X.X-dist.zip"
# 3. Extract to public/pdf-viewer/
# 4. Ensure web/ directory contains viewer.html, viewer.js, etc.

# Verify installation
node test-pdf-viewer-setup.js
`;

  fs.writeFileSync(
    path.join(__dirname, 'install-pdfjs.sh'),
    installScript.trim()
  );

  console.log('💾 Installation script created: install-pdfjs.sh\n');
}
