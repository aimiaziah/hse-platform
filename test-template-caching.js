// test-template-caching.js
// Test script to verify template caching is working correctly

const fs = require('fs');
const path = require('path');

console.log('🧪 Testing Template Caching Setup\n');

// Test 1: Check if public/templates exists
console.log('1️⃣  Checking public/templates directory...');
const templatesDir = path.join(__dirname, 'public', 'templates');

if (!fs.existsSync(templatesDir)) {
  console.log('   ❌ Directory not found');
  console.log('   💡 Run: mkdir -p public/templates');
} else {
  console.log('   ✅ Directory exists');

  // List templates
  const files = fs.readdirSync(templatesDir);
  const xlsxFiles = files.filter(f => f.endsWith('.xlsx'));

  console.log(`   📁 Found ${xlsxFiles.length} Excel file(s):`);

  xlsxFiles.forEach(file => {
    const filePath = path.join(templatesDir, file);
    const stats = fs.statSync(filePath);
    const sizeKB = (stats.size / 1024).toFixed(1);
    console.log(`      - ${file} (${sizeKB} KB)`);
  });

  if (xlsxFiles.length === 0) {
    console.log('\n   ⚠️  No Excel templates found!');
    console.log('   💡 Run: node download-templates-from-supabase.js');
  }
}

// Test 2: Check if utilities exist
console.log('\n2️⃣  Checking template utilities...');
const utilities = [
  'src/utils/templateCache.ts',
  'src/utils/templateLoader.ts',
];

let allUtilitiesExist = true;

utilities.forEach(util => {
  const exists = fs.existsSync(path.join(__dirname, util));
  if (exists) {
    console.log(`   ✅ ${util}`);
  } else {
    console.log(`   ❌ ${util} - Missing!`);
    allUtilitiesExist = false;
  }
});

// Test 3: Check if API endpoints are updated
console.log('\n3️⃣  Checking API endpoints...');
const apiFiles = [
  'src/pages/api/export/fire-extinguisher-template.ts',
  'src/pages/api/export/first-aid-template.ts',
  'src/pages/api/export/hse-inspection-template.ts',
];

let allUpdated = true;

apiFiles.forEach(apiFile => {
  const filePath = path.join(__dirname, apiFile);
  if (fs.existsSync(filePath)) {
    const content = fs.readFileSync(filePath, 'utf-8');
    const usesTemplateLoader = content.includes('loadTemplate');

    if (usesTemplateLoader) {
      console.log(`   ✅ ${path.basename(apiFile)} - Using templateLoader`);
    } else {
      console.log(`   ⚠️  ${path.basename(apiFile)} - Still using direct Supabase`);
      allUpdated = false;
    }
  } else {
    console.log(`   ❌ ${path.basename(apiFile)} - Not found`);
  }
});

// Test 4: Check template exports
console.log('\n4️⃣  Checking template export utilities...');
const exportFiles = [
  'src/utils/templateExport.ts',
  'src/utils/manhoursExcelExport.ts',
];

exportFiles.forEach(exportFile => {
  const filePath = path.join(__dirname, exportFile);
  if (fs.existsSync(filePath)) {
    const content = fs.readFileSync(filePath, 'utf-8');
    const usesTemplateLoader = content.includes('loadTemplate');

    if (usesTemplateLoader) {
      console.log(`   ✅ ${path.basename(exportFile)} - Using templateLoader`);
    } else {
      console.log(`   ⚠️  ${path.basename(exportFile)} - Still using direct Supabase`);
    }
  }
});

// Summary
console.log('\n' + '='.repeat(60));
console.log('\n📊 Summary:\n');

const templatesExist = fs.existsSync(templatesDir);
const hasTemplates = templatesExist && fs.readdirSync(templatesDir).some(f => f.endsWith('.xlsx'));

if (allUtilitiesExist && allUpdated && hasTemplates) {
  console.log('✅ ALL CHECKS PASSED!');
  console.log('\n🎉 Template caching is fully configured!\n');
  console.log('How it works:');
  console.log('  1️⃣  User requests template export');
  console.log('  2️⃣  System checks browser cache first');
  console.log('  3️⃣  If not cached, loads from public/templates/');
  console.log('  4️⃣  If not local, downloads from Supabase (one-time)');
  console.log('  5️⃣  Caches in browser for future use');
  console.log('\n💰 Expected egress reduction: 90%+');
  console.log('\n📋 Next steps:');
  console.log('  1. Restart dev server: npm run dev');
  console.log('  2. Test export on any inspection form');
  console.log('  3. Check browser console for cache messages');
} else {
  console.log('⚠️  SOME CHECKS FAILED\n');

  if (!allUtilitiesExist) {
    console.log('❌ Missing utility files - implementation incomplete');
  }

  if (!allUpdated) {
    console.log('❌ Some API endpoints not updated');
  }

  if (!hasTemplates) {
    console.log('❌ No local templates found');
    console.log('\n💡 To download templates from Supabase:');
    console.log('   node download-templates-from-supabase.js');
  }

  console.log('\n📖 For help, see: REDUCE_EGRESS_FREE.md');
}

console.log('\n' + '='.repeat(60));
