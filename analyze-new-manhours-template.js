const XLSX = require('xlsx');

// Read the template
const workbook = XLSX.readFile('c:\\Users\\Aimi\\Downloads\\Monthly Summary Manhours.xlsx');

console.log('=== MANHOURS TEMPLATE ANALYSIS ===\n');
console.log('Sheet Names:', workbook.SheetNames);
console.log('\n');

const sheetName = workbook.SheetNames[0];
const worksheet = workbook.Sheets[sheetName];

console.log(`=== Sheet: ${sheetName} ===\n`);

// Get the range
const range = XLSX.utils.decode_range(worksheet['!ref']);
console.log(`Range: ${worksheet['!ref']}`);
console.log(`Rows: ${range.s.r + 1} to ${range.e.r + 1}`);
console.log(`Columns: ${String.fromCharCode(65 + range.s.c)} to ${String.fromCharCode(65 + range.e.c)}`);
console.log('\n');

// Print all rows with content
console.log('All rows with values:\n');
for (let R = range.s.r; R <= range.e.r; ++R) {
  let rowData = [];
  let hasContent = false;

  for (let C = range.s.c; C <= range.e.c; ++C) {
    const cellAddress = XLSX.utils.encode_cell({ r: R, c: C });
    const cell = worksheet[cellAddress];
    const value = cell ? (cell.v || '') : '';
    rowData.push(value);
    if (value) hasContent = true;
  }

  if (hasContent) {
    console.log(`Row ${R + 1} (${String.fromCharCode(65 + range.s.c)}${R + 1}):`, JSON.stringify(rowData));
  }
}

// Check for images/drawings
if (worksheet['!images']) {
  console.log('\n=== Images Found ===');
  console.log(worksheet['!images']);
}

// Check for merged cells
if (worksheet['!merges']) {
  console.log('\n=== Merged Cells ===');
  worksheet['!merges'].forEach((merge, idx) => {
    const start = XLSX.utils.encode_cell(merge.s);
    const end = XLSX.utils.encode_cell(merge.e);
    console.log(`Merge ${idx + 1}: ${start}:${end}`);
  });
}
