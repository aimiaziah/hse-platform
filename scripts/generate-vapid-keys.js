// =====================================================
// GENERATE VAPID KEYS FOR PUSH NOTIFICATIONS
// =====================================================
// Run this script to generate VAPID keys for Web Push
// Add the generated keys to your .env file
// =====================================================

const crypto = require('crypto');

function generateVAPIDKeys() {
  const keyPair = crypto.generateKeyPairSync('ec', {
    namedCurve: 'prime256v1',
    publicKeyEncoding: {
      type: 'spki',
      format: 'der',
    },
    privateKeyEncoding: {
      type: 'pkcs8',
      format: 'der',
    },
  });

  // Convert to base64url format
  const publicKeyBase64 = keyPair.publicKey
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');

  const privateKeyBase64 = keyPair.privateKey
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');

  // Extract the uncompressed point from the public key (65 bytes starting at offset 26)
  const publicKeyBytes = keyPair.publicKey.slice(26);
  const publicKeyUrl = publicKeyBytes
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');

  console.log('\n' + '='.repeat(60));
  console.log('VAPID KEYS GENERATED SUCCESSFULLY!');
  console.log('='.repeat(60));
  console.log('\n📋 Add these to your .env file:\n');
  console.log('# VAPID keys for Web Push notifications');
  console.log(`VAPID_PUBLIC_KEY=${publicKeyUrl}`);
  console.log(`VAPID_PRIVATE_KEY=${privateKeyBase64}`);
  console.log(`VAPID_SUBJECT=mailto:${process.env.ADMIN_EMAIL || 'admin@yourdomain.com'}`);
  console.log('\n' + '='.repeat(60));
  console.log('⚠️  IMPORTANT: Keep the private key SECRET!');
  console.log('✅ The public key can be shared with clients.');
  console.log('='.repeat(60) + '\n');
}

// Run the generator
generateVAPIDKeys();
