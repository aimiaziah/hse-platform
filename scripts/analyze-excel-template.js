/**
 * Excel Template Analyzer
 *
 * This script analyzes an Excel template file and suggests cell mappings
 * for the template-based export system.
 *
 * Usage:
 *   node scripts/analyze-excel-template.js path/to/template.xlsx
 *
 * Example:
 *   node scripts/analyze-excel-template.js "C:\Users\Aimi\Downloads\form - fire extinguisher.xlsx"
 */

const ExcelJS = require('exceljs');
const fs = require('fs');
const path = require('path');

async function analyzeTemplate(filePath) {
  console.log('\n📊 Excel Template Analyzer\n');
  console.log('=' .repeat(60));
  console.log(`Analyzing: ${filePath}\n`);

  if (!fs.existsSync(filePath)) {
    console.error('❌ Error: File not found!');
    console.error(`   Path: ${filePath}`);
    process.exit(1);
  }

  try {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(filePath);

    console.log(`✅ File loaded successfully\n`);
    console.log(`📑 Workbook Information:`);
    console.log(`   - Total Sheets: ${workbook.worksheets.length}`);
    console.log(`   - File Size: ${(fs.statSync(filePath).size / 1024).toFixed(2)} KB\n`);

    // Analyze each worksheet
    workbook.worksheets.forEach((worksheet, index) => {
      console.log('─'.repeat(60));
      console.log(`\n📄 Sheet ${index + 1}: "${worksheet.name}"`);
      console.log(`   - Row Count: ${worksheet.rowCount}`);
      console.log(`   - Column Count: ${worksheet.columnCount}\n`);

      // Find cells with text content
      console.log('🔍 Text Content Analysis:');
      const textCells = [];
      const potentialHeaderCells = [];
      const potentialDataStartRows = [];

      worksheet.eachRow((row, rowNumber) => {
        row.eachCell((cell, colNumber) => {
          const value = cell.value;

          if (value && typeof value === 'string') {
            const cellRef = cell.address;
            textCells.push({ ref: cellRef, value: value.substring(0, 50), row: rowNumber, col: colNumber });

            // Look for potential header keywords
            const lowerValue = value.toLowerCase();
            if (lowerValue.includes('inspected by') ||
                lowerValue.includes('inspector')) {
              potentialHeaderCells.push({
                ref: cellRef,
                type: 'inspectedBy',
                value: value.substring(0, 40)
              });
            }
            if (lowerValue.includes('date') && lowerValue.includes('inspection')) {
              potentialHeaderCells.push({
                ref: cellRef,
                type: 'inspectionDate',
                value: value.substring(0, 40)
              });
            }
            if (lowerValue.includes('designation')) {
              potentialHeaderCells.push({
                ref: cellRef,
                type: 'designation',
                value: value.substring(0, 40)
              });
            }
            if (lowerValue.includes('signature')) {
              potentialHeaderCells.push({
                ref: cellRef,
                type: 'signature',
                value: value.substring(0, 40)
              });
            }

            // Look for table headers
            if (lowerValue.includes('no') && colNumber === 2 && rowNumber > 5) {
              potentialDataStartRows.push(rowNumber + 1);
            }
          }
        });
      });

      // Display potential header mappings
      if (potentialHeaderCells.length > 0) {
        console.log('\n   ✨ Detected Header Fields:');
        potentialHeaderCells.forEach(cell => {
          console.log(`      ${cell.type.padEnd(20)} → ${cell.ref.padEnd(6)} ("${cell.value}")`);
        });
      }

      // Display potential data start row
      if (potentialDataStartRows.length > 0) {
        console.log(`\n   📊 Potential Data Start Row: ${potentialDataStartRows[0]}`);
      }

      // Show merged cells
      if (worksheet.model.merges && Object.keys(worksheet.model.merges).length > 0) {
        console.log(`\n   🔗 Merged Cells: ${Object.keys(worksheet.model.merges).length} ranges`);
      }

      // Sample of text content (first 20 items)
      if (textCells.length > 0) {
        console.log('\n   📝 Sample Text Content:');
        textCells.slice(0, 20).forEach(cell => {
          console.log(`      ${cell.ref.padEnd(6)} (R${cell.row}C${cell.col}): ${cell.value}`);
        });
        if (textCells.length > 20) {
          console.log(`      ... and ${textCells.length - 20} more cells`);
        }
      }

      // Analyze column structure
      console.log('\n   📐 Column Analysis:');
      const columns = [];
      const headerRow = worksheet.getRow(9); // Typical header row
      headerRow.eachCell((cell, colNumber) => {
        if (cell.value) {
          const colLetter = String.fromCharCode(64 + colNumber);
          columns.push({
            letter: colLetter,
            number: colNumber,
            header: String(cell.value).substring(0, 30)
          });
        }
      });

      if (columns.length > 0) {
        columns.forEach(col => {
          console.log(`      Column ${col.letter.padEnd(2)} (#${col.number.toString().padStart(2)}): ${col.header}`);
        });
      }
    });

    // Generate suggested cell mapping
    console.log('\n' + '='.repeat(60));
    console.log('\n💡 Suggested Cell Mapping Configuration:\n');

    const suggestedMapping = generateMappingSuggestion(potentialHeaderCells, potentialDataStartRows);
    console.log(suggestedMapping);

    console.log('\n✅ Analysis Complete!\n');
    console.log('📋 Next Steps:');
    console.log('   1. Copy the suggested mapping above');
    console.log('   2. Paste into src/utils/templateExport.ts');
    console.log('   3. Adjust cell references as needed');
    console.log('   4. Upload template to Supabase Storage\n');

  } catch (error) {
    console.error('\n❌ Error analyzing template:');
    console.error(`   ${error.message}`);
    if (error.stack) {
      console.error('\n   Stack trace:');
      console.error(error.stack);
    }
    process.exit(1);
  }
}

function generateMappingSuggestion(headerCells, dataStartRows) {
  const mapping = {
    inspectedBy: 'J6',
    inspectionDate: 'O6',
    designation: 'J7',
    signature: 'O7',
    dataStartRow: dataStartRows[0] || 11
  };

  // Update based on detected cells
  headerCells.forEach(cell => {
    if (cell.type) {
      mapping[cell.type] = cell.ref;
    }
  });

  return `const TEMPLATE_MAPPING = {
  // Header Information
  inspectedBy: '${mapping.inspectedBy}',      // Inspector name cell
  inspectionDate: '${mapping.inspectionDate}',  // Inspection date cell
  designation: '${mapping.designation}',      // Designation cell
  signature: '${mapping.signature}',        // Signature cell (optional)

  // Data Table Configuration
  dataStartRow: ${mapping.dataStartRow},           // First row of data entries

  // Column Letters (adjust based on your template)
  columns: {
    no: 'B',                    // Column for extinguisher number
    serialNo: 'C',              // Column for serial number
    location: 'D',              // Column for location
    typeSize: 'E',              // Column for type/size
    shell: 'F',                 // Column for shell condition
    hose: 'G',                  // Column for hose condition
    nozzle: 'H',                // Column for nozzle condition
    pressureGauge: 'I',         // Column for pressure gauge
    safetyPin: 'J',             // Column for safety pin
    pinSeal: 'K',               // Column for pin seal
    accessible: 'L',            // Column for accessible
    missingNotInPlace: 'M',     // Column for missing/not in place
    emptyPressureLow: 'N',      // Column for empty/pressure low
    servicingTags: 'O',         // Column for servicing tags
    expiryDate: 'P',            // Column for expiry date
    remarks: 'Q'                // Column for remarks
  }
};

// To use this mapping:
// await exportFireExtinguisherWithTemplate(formData, 'templates', 'your-template.xlsx', TEMPLATE_MAPPING);`;
}

// Main execution
const args = process.argv.slice(2);

if (args.length === 0) {
  console.log('\n📊 Excel Template Analyzer\n');
  console.log('Usage:');
  console.log('  node scripts/analyze-excel-template.js <path-to-excel-file>\n');
  console.log('Example:');
  console.log('  node scripts/analyze-excel-template.js "C:\\Users\\Aimi\\Downloads\\form - fire extinguisher.xlsx"');
  console.log('  node scripts/analyze-excel-template.js ./templates/fire-extinguisher.xlsx\n');
  process.exit(1);
}

const templatePath = args[0];
analyzeTemplate(templatePath).catch(error => {
  console.error('Unexpected error:', error);
  process.exit(1);
});
