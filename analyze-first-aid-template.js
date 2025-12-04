const XLSX = require('xlsx');

// Read the first aid template
const templatePath = 'c:\\Users\\Aimi\\Downloads\\first aid item checklist form.xlsx';
console.log('Reading template from:', templatePath);

try {
  const workbook = XLSX.readFile(templatePath);

  console.log('\n==============================================');
  console.log('FIRST AID EXCEL TEMPLATE ANALYSIS');
  console.log('==============================================\n');

  console.log('Sheet Names:', workbook.SheetNames);
  console.log('Number of Sheets:', workbook.SheetNames.length);

  // Analyze each sheet
  workbook.SheetNames.forEach((sheetName, index) => {
    console.log('\n==============================================');
    console.log(`SHEET ${index + 1}: "${sheetName}"`);
    console.log('==============================================');

    const sheet = workbook.Sheets[sheetName];

    // Get the range
    const range = XLSX.utils.decode_range(sheet['!ref'] || 'A1');
    console.log(`Range: ${XLSX.utils.encode_range(range)}`);
    console.log(`Rows: ${range.e.r + 1}, Columns: ${range.e.c + 1}`);

    // Get column widths if available
    if (sheet['!cols']) {
      console.log('\nColumn Widths:');
      sheet['!cols'].forEach((col, idx) => {
        if (col.wch) {
          console.log(`  Column ${String.fromCharCode(65 + idx)}: ${col.wch} chars`);
        }
      });
    }

    // Get the data as array of arrays
    const data = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });

    console.log('\nFirst 50 rows of data:');
    console.log('─────────────────────────────────────────────');

    data.slice(0, 50).forEach((row, rowIdx) => {
      const rowNum = rowIdx + 1;
      if (row.some(cell => cell !== '')) {
        console.log(`Row ${rowNum.toString().padStart(3)}:`, JSON.stringify(row));
      }
    });

    // Check for merged cells
    if (sheet['!merges']) {
      console.log('\nMerged Cells:');
      sheet['!merges'].forEach(merge => {
        console.log(`  ${XLSX.utils.encode_range(merge)}`);
      });
    }
  });

  console.log('\n==============================================');
  console.log('ANALYSIS COMPLETE');
  console.log('==============================================\n');

} catch (error) {
  console.error('Error reading template:', error.message);
  process.exit(1);
}
