// merge-hse-templates.js
// Script to add HSE Observation sheet as second sheet to HSE Inspection template

const ExcelJS = require('exceljs');
const path = require('path');

async function copySheet(sourceWorkbook, targetWorkbook, sourceSheetName, targetSheetName) {
  const sourceSheet = sourceWorkbook.getWorksheet(sourceSheetName);
  if (!sourceSheet) {
    throw new Error(`Source sheet "${sourceSheetName}" not found`);
  }

  console.log(`📋 Copying sheet: ${sourceSheetName} -> ${targetSheetName}`);

  // Add new sheet to target workbook
  const targetSheet = targetWorkbook.addWorksheet(targetSheetName);

  // Copy all properties
  targetSheet.properties = { ...sourceSheet.properties };
  targetSheet.pageSetup = { ...sourceSheet.pageSetup };

  // Copy column widths
  sourceSheet.columns.forEach((column, index) => {
    if (column.width) {
      targetSheet.getColumn(index + 1).width = column.width;
    }
  });

  // Copy all rows with formatting
  sourceSheet.eachRow({ includeEmpty: true }, (sourceRow, rowNumber) => {
    const targetRow = targetSheet.getRow(rowNumber);

    // Copy row height
    if (sourceRow.height) {
      targetRow.height = sourceRow.height;
    }

    // Copy each cell
    sourceRow.eachCell({ includeEmpty: true }, (sourceCell, colNumber) => {
      const targetCell = targetRow.getCell(colNumber);

      // Copy value
      targetCell.value = sourceCell.value;

      // Copy style
      targetCell.style = { ...sourceCell.style };

      // Copy merge info (we'll apply merges separately)
    });

    targetRow.commit();
  });

  // Copy merged cells
  if (sourceSheet.model && sourceSheet.model.merges) {
    sourceSheet.model.merges.forEach(merge => {
      targetSheet.mergeCells(merge);
    });
  }

  console.log(`✅ Sheet copied successfully`);
  console.log(`   Rows: ${targetSheet.rowCount}`);
  console.log(`   Columns: ${targetSheet.columnCount}`);
}

async function main() {
  const hseInspectionPath = path.join(__dirname, 'public', 'templates', 'hse-inspection-template.xlsx');
  const observationPath = path.join(__dirname, 'public', 'templates', 'observation-template.xlsx');
  const outputPath = path.join(__dirname, 'public', 'templates', 'hse-inspection-template.xlsx');
  const backupPath = path.join(__dirname, 'public', 'templates', 'hse-inspection-template.backup.xlsx');

  try {
    console.log('\n🚀 Merging HSE Templates\n');

    // Load both workbooks
    console.log('📖 Loading HSE Inspection template...');
    const hseWorkbook = new ExcelJS.Workbook();
    await hseWorkbook.xlsx.readFile(hseInspectionPath);
    console.log(`   ✅ Loaded (${hseWorkbook.worksheets.length} sheets)`);

    console.log('📖 Loading Observation template...');
    const obsWorkbook = new ExcelJS.Workbook();
    await obsWorkbook.xlsx.readFile(observationPath);
    console.log(`   ✅ Loaded (${obsWorkbook.worksheets.length} sheets)`);

    // Create backup
    console.log('\n💾 Creating backup...');
    await hseWorkbook.xlsx.writeFile(backupPath);
    console.log(`   ✅ Backup saved to: ${backupPath}`);

    // Check if second sheet already exists
    if (hseWorkbook.worksheets.length > 1) {
      console.log('\n⚠️  Warning: HSE Inspection template already has multiple sheets');
      console.log('   Existing sheets:');
      hseWorkbook.worksheets.forEach((sheet, index) => {
        console.log(`     ${index + 1}. ${sheet.name}`);
      });
      console.log('   Removing existing second sheet...');
      // Remove all sheets except the first one
      while (hseWorkbook.worksheets.length > 1) {
        hseWorkbook.removeWorksheet(hseWorkbook.worksheets[1].id);
      }
      console.log('   ✅ Cleaned up');
    }

    // Copy observation sheet as second sheet
    console.log('\n📋 Adding HSE Observations sheet...');
    const observationSheet = obsWorkbook.worksheets[0];
    await copySheet(obsWorkbook, hseWorkbook, observationSheet.name, 'HSE Observations');

    // Save the merged workbook
    console.log('\n💾 Saving merged template...');
    await hseWorkbook.xlsx.writeFile(outputPath);
    console.log(`   ✅ Saved to: ${outputPath}`);

    console.log('\n✅ Success! HSE Inspection template now has 2 sheets:');
    hseWorkbook.worksheets.forEach((sheet, index) => {
      console.log(`   ${index + 1}. ${sheet.name}`);
    });

    console.log('\n📋 Next steps:');
    console.log('   1. Verify the template looks correct');
    console.log('   2. Run upload script to push to Supabase');
    console.log('   3. Test in the application');

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error(error);
    process.exit(1);
  }
}

main();
