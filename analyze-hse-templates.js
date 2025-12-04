// analyze-hse-templates.js
// Script to analyze HSE Inspection and Observation templates

const ExcelJS = require('exceljs');
const path = require('path');

async function analyzeTemplate(filePath, templateName) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`📋 Analyzing: ${templateName}`);
  console.log(`${'='.repeat(60)}\n`);

  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(filePath);

  console.log(`Total sheets: ${workbook.worksheets.length}\n`);

  workbook.worksheets.forEach((sheet, index) => {
    console.log(`Sheet ${index + 1}: "${sheet.name}"`);
    console.log(`  Rows: ${sheet.rowCount}`);
    console.log(`  Columns: ${sheet.columnCount}`);

    // Show first few rows structure
    console.log(`  First 5 rows preview:`);
    for (let i = 1; i <= Math.min(5, sheet.rowCount); i++) {
      const row = sheet.getRow(i);
      const values = [];
      row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
        if (colNumber <= 5) {
          values.push(cell.value || '');
        }
      });
      console.log(`    Row ${i}: ${values.join(' | ')}`);
    }
    console.log('');
  });
}

async function main() {
  const hseInspectionPath = path.join(__dirname, 'public', 'templates', 'hse-inspection-template.xlsx');
  const observationPath = path.join(__dirname, 'public', 'templates', 'observation-template.xlsx');

  try {
    await analyzeTemplate(hseInspectionPath, 'HSE Inspection Template');
    await analyzeTemplate(observationPath, 'Observation Template');
  } catch (error) {
    console.error('Error analyzing templates:', error);
  }
}

main();
