const XLSX = require('xlsx');
const path = require('path');

// Read the Excel file
const workbook = XLSX.readFile('c:\\Users\\Aimi\\OneDrive\\Documents\\manhours.xlsx');

console.log('=== MANHOURS TEMPLATE ANALYSIS ===\n');
console.log('Sheet Names:', workbook.SheetNames);
console.log('\n');

workbook.SheetNames.forEach((sheetName) => {
  console.log(`\n=== Sheet: ${sheetName} ===`);
  const worksheet = workbook.Sheets[sheetName];
  const data = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });

  console.log('\nAll rows:');
  data.forEach((row, idx) => {
    console.log(`Row ${idx}:`, JSON.stringify(row));
  });

  console.log('\n\nTotal rows:', data.length);
  console.log('\nColumn headers (assumed from row 0):');
  console.log(JSON.stringify(data[0], null, 2));
});
