const XLSX = require('xlsx');

// Analyze First Aid Template
console.log('\n==============================================');
console.log('ANALYZING FIRST AID TEMPLATE');
console.log('==============================================\n');

try {
  const firstAidPath = 'c:\\Users\\Aimi\\Downloads\\first aid form.xlsx';
  const wb1 = XLSX.readFile(firstAidPath);

  console.log('Sheet Names:', wb1.SheetNames);

  wb1.SheetNames.forEach((sheetName, index) => {
    console.log(`\n--- SHEET ${index + 1}: "${sheetName}" ---`);
    const sheet = wb1.Sheets[sheetName];
    const range = XLSX.utils.decode_range(sheet['!ref'] || 'A1');
    console.log(`Range: ${XLSX.utils.encode_range(range)}`);

    const data = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
    console.log('\nFirst 30 rows:');
    data.slice(0, 30).forEach((row, rowIdx) => {
      if (row.some(cell => cell !== '')) {
        console.log(`Row ${(rowIdx + 1).toString().padStart(3)}:`, JSON.stringify(row));
      }
    });

    if (sheet['!merges']) {
      console.log('\nMerged Cells:', sheet['!merges'].map(m => XLSX.utils.encode_range(m)));
    }

    if (sheet['!cols']) {
      console.log('\nColumn Widths:');
      sheet['!cols'].forEach((col, idx) => {
        if (col && col.wch) {
          console.log(`  Col ${String.fromCharCode(65 + idx)}: ${col.wch}`);
        }
      });
    }
  });
} catch (error) {
  console.error('Error reading first aid template:', error.message);
}

// Analyze Fire Extinguisher Template
console.log('\n\n==============================================');
console.log('ANALYZING FIRE EXTINGUISHER TEMPLATE');
console.log('==============================================\n');

try {
  const fireExtPath = 'c:\\Users\\Aimi\\Downloads\\fire extinguisher form.xlsx';
  const wb2 = XLSX.readFile(fireExtPath);

  console.log('Sheet Names:', wb2.SheetNames);

  wb2.SheetNames.forEach((sheetName, index) => {
    console.log(`\n--- SHEET ${index + 1}: "${sheetName}" ---`);
    const sheet = wb2.Sheets[sheetName];
    const range = XLSX.utils.decode_range(sheet['!ref'] || 'A1');
    console.log(`Range: ${XLSX.utils.encode_range(range)}`);

    const data = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
    console.log('\nFirst 30 rows:');
    data.slice(0, 30).forEach((row, rowIdx) => {
      if (row.some(cell => cell !== '')) {
        console.log(`Row ${(rowIdx + 1).toString().padStart(3)}:`, JSON.stringify(row));
      }
    });

    if (sheet['!merges']) {
      console.log('\nMerged Cells:', sheet['!merges'].map(m => XLSX.utils.encode_range(m)));
    }

    if (sheet['!cols']) {
      console.log('\nColumn Widths:');
      sheet['!cols'].forEach((col, idx) => {
        if (col && col.wch) {
          console.log(`  Col ${String.fromCharCode(65 + idx)}: ${col.wch}`);
        }
      });
    }
  });
} catch (error) {
  console.error('Error reading fire extinguisher template:', error.message);
}

console.log('\n\n==============================================');
console.log('ANALYSIS COMPLETE');
console.log('==============================================\n');
