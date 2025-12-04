// test-digitalocean.js
// Test DigitalOcean Spaces connection and configuration
require('dotenv').config({ path: '.env.local' });
const { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3');

const doSpacesName = process.env.DO_SPACES_NAME;
const doSpacesRegion = process.env.DO_SPACES_REGION || 'sgp1';
const doSpacesKey = process.env.DO_SPACES_KEY;
const doSpacesSecret = process.env.DO_SPACES_SECRET;
const doSpacesEndpoint = process.env.DO_SPACES_ENDPOINT;

console.log('🧪 Testing DigitalOcean Spaces Configuration...\n');

// Check environment variables
console.log('📋 Checking configuration...');
const checks = {
  'DO_SPACES_NAME': doSpacesName,
  'DO_SPACES_REGION': doSpacesRegion,
  'DO_SPACES_KEY': doSpacesKey,
  'DO_SPACES_SECRET': doSpacesSecret ? '✓ Set' : undefined,
};

let allConfigured = true;
for (const [key, value] of Object.entries(checks)) {
  if (value) {
    console.log(`  ✅ ${key}: ${value}`);
  } else {
    console.log(`  ❌ ${key}: Missing`);
    allConfigured = false;
  }
}

if (!allConfigured) {
  console.log('\n❌ Missing required environment variables!');
  console.log('\nAdd these to your .env.local file:');
  console.log('  DO_SPACES_NAME=your-space-name');
  console.log('  DO_SPACES_KEY=your_access_key');
  console.log('  DO_SPACES_SECRET=your_secret_key');
  console.log('  DO_SPACES_REGION=sgp1  # Optional');
  console.log('  DO_SPACES_ENDPOINT=https://sgp1.digitaloceanspaces.com  # Optional\n');
  console.log('📖 See DIGITALOCEAN_SETUP.md for setup instructions\n');
  process.exit(1);
}

// Create S3 client
const doClient = new S3Client({
  region: doSpacesRegion,
  endpoint: doSpacesEndpoint || `https://${doSpacesRegion}.digitaloceanspaces.com`,
  credentials: {
    accessKeyId: doSpacesKey,
    secretAccessKey: doSpacesSecret,
  },
  forcePathStyle: false,
});

const testFileName = `test-${Date.now()}.txt`;
const testContent = 'DigitalOcean Spaces test file created by PWA Inspection App';

async function runTests() {
  try {
    // Test 1: Upload
    console.log('\n🔼 Test 1: Upload file...');
    await doClient.send(
      new PutObjectCommand({
        Bucket: doSpacesName,
        Key: testFileName,
        Body: Buffer.from(testContent),
        ContentType: 'text/plain',
        ACL: 'public-read',
      })
    );
    console.log('  ✅ Upload successful!');

    // Test 2: Download
    console.log('\n🔽 Test 2: Download file...');
    const downloadResponse = await doClient.send(
      new GetObjectCommand({
        Bucket: doSpacesName,
        Key: testFileName,
      })
    );
    const downloadedContent = await streamToString(downloadResponse.Body);
    if (downloadedContent === testContent) {
      console.log('  ✅ Download successful and content matches!');
    } else {
      console.log('  ⚠️  Downloaded but content mismatch');
    }

    // Test 3: Delete
    console.log('\n🗑️  Test 3: Delete file...');
    await doClient.send(
      new DeleteObjectCommand({
        Bucket: doSpacesName,
        Key: testFileName,
      })
    );
    console.log('  ✅ Delete successful!');

    // Generate CDN URL
    const cdnUrl = `https://${doSpacesName}.${doSpacesRegion}.cdn.digitaloceanspaces.com/${testFileName}`;

    console.log('\n' + '='.repeat(60));
    console.log('✅ All tests passed!');
    console.log('='.repeat(60));
    console.log('\n📦 Your Space Details:');
    console.log(`  Name: ${doSpacesName}`);
    console.log(`  Region: ${doSpacesRegion}`);
    console.log(`  Endpoint: ${doSpacesEndpoint || `https://${doSpacesRegion}.digitaloceanspaces.com`}`);
    console.log(`  CDN URL: https://${doSpacesName}.${doSpacesRegion}.cdn.digitaloceanspaces.com`);

    console.log('\n🎉 DigitalOcean Spaces is ready to use!');
    console.log('\n📝 Next steps:');
    console.log('  1. Run migration: npm run migrate:digitalocean');
    console.log('  2. Monitor Supabase egress reduction');
    console.log('  3. Check images loading from CDN\n');

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.error('\n🔧 Troubleshooting:');

    if (error.message.includes('Access Denied')) {
      console.error('  - Check your DO_SPACES_KEY and DO_SPACES_SECRET');
      console.error('  - Verify API key has Spaces read/write permissions');
      console.error('  - Check Space name is correct (case-sensitive)');
    } else if (error.message.includes('NoSuchBucket')) {
      console.error('  - Space name might be wrong: ' + doSpacesName);
      console.error('  - Check Space exists in DigitalOcean dashboard');
      console.error('  - Verify DO_SPACES_NAME in .env.local');
    } else if (error.message.includes('network')) {
      console.error('  - Check your internet connection');
      console.error('  - Verify endpoint URL is correct');
      console.error('  - Try again in a few moments');
    } else {
      console.error('  - Full error:', error);
    }

    console.error('\n📖 See DIGITALOCEAN_SETUP.md for detailed setup guide\n');
    process.exit(1);
  }
}

// Helper function to convert stream to string
async function streamToString(stream) {
  const chunks = [];
  for await (const chunk of stream) {
    chunks.push(chunk);
  }
  return Buffer.concat(chunks).toString('utf-8');
}

// Run tests
runTests();
