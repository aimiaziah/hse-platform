// clear-backup-exports.js
// Run this in browser console to clear backup_exports and free up localStorage space

console.log('Checking localStorage usage...');

// Show current storage usage
const showStorageUsage = () => {
  let totalSize = 0;
  for (let key in localStorage) {
    if (localStorage.hasOwnProperty(key)) {
      const size = (localStorage[key].length + key.length) * 2; // UTF-16 = 2 bytes per char
      totalSize += size;
      if (size > 10000) { // Show items larger than 10KB
        console.log(`${key}: ${(size / 1024).toFixed(2)} KB`);
      }
    }
  }
  console.log(`Total localStorage usage: ${(totalSize / 1024).toFixed(2)} KB / ~5120 KB limit`);
  return totalSize;
};

const beforeSize = showStorageUsage();

// Clear backup_exports
if (localStorage.getItem('backup_exports')) {
  const backups = JSON.parse(localStorage.getItem('backup_exports'));
  console.log(`Found ${backups.length} backup exports`);
  localStorage.removeItem('backup_exports');
  console.log('✅ Cleared backup_exports');
} else {
  console.log('No backup_exports found');
}

// Also limit google_drive_exports to last 50 records
if (localStorage.getItem('google_drive_exports')) {
  const exports = JSON.parse(localStorage.getItem('google_drive_exports'));
  console.log(`Found ${exports.length} Google Drive export records`);
  if (exports.length > 50) {
    const limited = exports.slice(-50); // Keep last 50
    localStorage.setItem('google_drive_exports', JSON.stringify(limited));
    console.log(`✅ Reduced to last 50 records`);
  }
}

console.log('\n--- After cleanup ---');
const afterSize = showStorageUsage();
console.log(`\nFreed up: ${((beforeSize - afterSize) / 1024).toFixed(2)} KB`);
console.log('\n✅ Done! You can now approve inspections without quota errors.');
