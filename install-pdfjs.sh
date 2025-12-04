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