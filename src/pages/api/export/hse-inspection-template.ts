// API endpoint for template-based HSE Inspection Checklist export
import type { NextApiRequest, NextApiResponse } from 'next';
import { getServiceSupabase } from '@/lib/supabase';
import ExcelJS from 'exceljs';
import { convertExcelToPDF } from '@/utils/excelToPdfConverter';

interface HSEInspectionItem {
  key: string;
  categoryId: number;
  item: string;
  rating: string | null;
  comment: string;
}

interface ObservationData {
  id: string;
  itemNo: string;
  categoryId: number;
  categoryName: string;
  itemName: string;
  photos: string[];
  observation: string;
  location: string;
  actionNeeded: string;
  time: string;
  date: string;
  status: string;
  hazards: string;
  remarks: string;
  preparedBy?: string;
  preparedByDate?: string;
  reviewedBy?: string;
  reviewedByDate?: string;
}

interface HSEInspectionFormData {
  contractor: string;
  location: string;
  date: string;
  inspectedBy: string;
  workActivity: string;
  tablePersons: Array<{
    no: number;
    name: string;
    designation: string;
    signature: string;
  }>;
  inspectionItems: HSEInspectionItem[];
  commentsRemarks?: string; // Additional comments/remarks section
  observations?: ObservationData[]; // HSE Observation Forms
  format?: 'excel' | 'pdf';
  reviewedBy?: string;
  reviewedAt?: string;
  reviewerSignature?: string;
}

// Category definitions matching the HSE Inspection form
const categories = [
  {
    id: 1,
    name: 'WORKING AREAS',
    items: [
      'Housekeeping',
      'Proper barrier/ safety signs',
      'Lighting adequacy',
      'Site layout arrangement',
      'Ventilation',
      'Floor/ ground-edge/ opening condition',
      'Escape/ working route condition',
      'Material storage/ stacking',
    ],
  },
  {
    id: 2,
    name: 'SITE OFFICE',
    items: [
      'Office ergonomics',
      'Location and maintenance',
      'Fire extinguishers condition',
      'First aid box facility',
      "Worker's legality / age",
      'Green card (CIDB)/ NIOSH cert.',
      'PMA/ PMT/ JBE/ DOE approval',
      'Competent scaffolder',
    ],
  },
  {
    id: 3,
    name: 'HOT WORK/ ELECTRICAL',
    items: [
      'Gas cylinders secured and upright',
      'Gauge functionality',
      'Flashback arrestors availability',
      'Cables insulation/ earthing',
      'Wiring condition-plugs, joints, DB',
    ],
  },
  {
    id: 4,
    name: 'PERSONAL PROTECTIVE EQUIPMENT',
    items: [
      'Safety helmets',
      'Safety footwear',
      'Safety vest',
      'Proper attire',
      'Other; as per job requirements',
    ],
  },
  {
    id: 5,
    name: 'EXCAVATIONS',
    items: [
      'Safely secured-sign, barrier covered',
      'No material at 1m from edge',
      'Proper & adequate access & egress',
      'Adequate slope protection',
      'Check for underground hazard',
      'Inspection checklist',
    ],
  },
  {
    id: 6,
    name: 'SCAFFOLDING',
    items: [
      'PE design requirement',
      'Access condition',
      'Walkways/ platform condition',
      'Adequate slope protection',
      'Means of fall protection',
      'Ground/base condition',
      'Inspection checklist',
    ],
  },
  {
    id: 7,
    name: 'MACHINERY & PLANT',
    items: [
      'Machinery guarding',
      'Machinery/ plant service record',
      'Properly and safely sited',
      'Skid tank condition',
      'Lifting process/ gear condition',
      "Vehicle's condition",
    ],
  },
  {
    id: 8,
    name: 'TRAFFIC MANAGEMENT',
    items: [
      'Flagman availability & adequacy',
      'Signages availability & adequacy',
      'Vehicle route maintenance',
      'Public road maintenance',
      'Loads protection',
      'Method of controlling',
    ],
  },
  {
    id: 9,
    name: 'HEALTH',
    items: [
      'First aid box/ facility',
      'First aider availability',
      'Vector/ Pest control',
      'Washing/ clean water facility',
      'Toilet condition / availability',
    ],
  },
  {
    id: 10,
    name: 'ENVIRONMENTAL',
    items: [
      'Control of oil pollution',
      'Control of dust pollution / emission',
      'Control of noise pollution / emission',
      'Control of open burning',
      'Control of debris / rubbish',
      'Silt trap/drainage/culvert maintenance',
    ],
  },
  {
    id: 11,
    name: 'SECURITY',
    items: [
      'Security personal adequacy',
      'Security sign condition/ availability',
      'Control of site access/ exit',
      'Hoarding/ fencing condition',
      'Emergency contact list',
    ],
  },
  {
    id: 12,
    name: 'PUBLIC SAFETY',
    items: [
      'Warning signs',
      'Control of public entry',
      'Proper work planning toward public safety',
      'Communication establishment',
      'Training on public safety to worker',
      'Catch platform',
      'Pedestrian protection',
    ],
  },
];

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    console.log('[HSE Export] Starting HSE inspection export...');
    const formData: HSEInspectionFormData = req.body;
    const format = formData.format || 'excel';
    console.log('[HSE Export] Format:', format);
    console.log('[HSE Export] Form data keys:', Object.keys(formData));

    // Validate required fields
    if (!formData.contractor || !formData.location || !formData.date || !formData.inspectedBy) {
      console.error('[HSE Export] Missing required fields');
      return res.status(400).json({
        error: 'Missing required fields: contractor, location, date, inspectedBy',
      });
    }

    // Ensure arrays are actually arrays (prevent "forEach is not a function" errors)
    if (!Array.isArray(formData.tablePersons)) {
      console.warn('[HSE Export] tablePersons is not an array, defaulting to []');
      formData.tablePersons = [];
    }
    if (!Array.isArray(formData.inspectionItems)) {
      console.error('[HSE Export] inspectionItems is not an array:', typeof formData.inspectionItems);
      formData.inspectionItems = [];
    }
    if (formData.observations && !Array.isArray(formData.observations)) {
      console.warn('[HSE Export] observations is not an array, defaulting to []');
      formData.observations = [];
    }

    // Import template loader (uses local templates first, Supabase as fallback)
    console.log('[HSE Export] Loading template...');
    const { loadTemplate } = await import('../../../utils/templateLoader');

    // Load template with caching (local -> Supabase fallback)
    const templateBuffer = await loadTemplate('templates', 'hse inspection form.xlsx');
    console.log('[HSE Export] Template loaded, size:', templateBuffer.byteLength);

    console.log('[HSE Export] Parsing template with ExcelJS...');
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(templateBuffer);
    console.log('[HSE Export] Template parsed successfully');

    // Get the first worksheet
    const worksheet = workbook.worksheets[0];
    if (!worksheet) {
      console.error('[HSE Export] No worksheet found in template');
      return res.status(500).json({ error: 'No worksheet found in template' });
    }
    console.log('[HSE Export] Worksheet found:', worksheet.name);

    // // Set column widths for proper display
    // worksheet.getColumn('A').width = 5;   // NO column
    // worksheet.getColumn('B').width = 5;   // NO column
    // worksheet.getColumn('C').width = 35;  // NAME/ITEM column (wider for inspection items)
    // worksheet.getColumn('D').width = 3;   // Separator
    // worksheet.getColumn('E').width = 20;  // Additional info
    // worksheet.getColumn('F').width = 3;   // Separator
    // worksheet.getColumn('G').width = 5;   // G (Good)
    // worksheet.getColumn('H').width = 5;   // A (Acceptable)
    // worksheet.getColumn('I').width = 20;  // DESIGNATION / P (Poor)
    // worksheet.getColumn('J').width = 5;   // I (Irrelevant)
    // worksheet.getColumn('K').width = 6;   // SIN
    // worksheet.getColumn('L').width = 6;   // SPS
    // worksheet.getColumn('M').width = 6;   // SWD/SWO
    // worksheet.getColumn('N').width = 20;  // SIGNED/COMMENTS column

    // Fill header information (adjust cell references based on your template)
    // These are example cell references - adjust based on your actual template
    console.log('[HSE Export] Filling header information...');
    worksheet.getCell('E7').value = formData.contractor;
    worksheet.getCell('N8').value = formData.date;
    worksheet.getCell('E8').value = formData.location;
    worksheet.getCell('E9').value = formData.inspectedBy;
    worksheet.getCell('E10').value = formData.workActivity;
    console.log('[HSE Export] Header information filled');

    // Fill personnel table (adjust starting row based on your template)
    console.log('[HSE Export] Filling personnel table...');
    let personnelStartRow = 13; // Example starting row
    formData.tablePersons.forEach((person, index) => {
      if (person.name || person.designation) {
        const row = personnelStartRow + index;

        // Set values with proper alignment
        worksheet.getCell(`B${row}`).value = person.no;
        worksheet.getCell(`B${row}`).alignment = { vertical: 'middle', horizontal: 'center' };

        worksheet.getCell(`C${row}`).value = person.name;
        worksheet.getCell(`C${row}`).alignment = { vertical: 'middle', horizontal: 'left' };

        worksheet.getCell(`I${row}`).value = person.designation;
        worksheet.getCell(`I${row}`).alignment = { vertical: 'middle', horizontal: 'left' };

        // Add signature image instead of "Signed" text
        if (person.signature) {
          try {
            // Convert base64 signature to image
            const base64Data = person.signature.replace(/^data:image\/\w+;base64,/, '');
            const imageId = workbook.addImage({
              base64: base64Data,
              extension: 'png',
            });

            // Add image to the signature column (column N)
            // Adjust the position and size as needed
            worksheet.addImage(imageId, {
              tl: { col: 13, row: row - 1 }, // Column N is index 13 (0-based)
              ext: { width: 100, height: 40 }, // Adjust width and height as needed
            });
          } catch (error) {
            console.error('Error adding signature image to Excel:', error);
            // Fallback to text if image addition fails
            worksheet.getCell(`N${row}`).value = 'Signed';
            worksheet.getCell(`N${row}`).alignment = { vertical: 'middle', horizontal: 'center' };
          }
        }

        // Set row height to accommodate signature image
        worksheet.getRow(row).height = 45;
      }
    });
    console.log('[HSE Export] Personnel table filled');

    // Map items to their row numbers in the template
    // The template already has all categories and items pre-filled
    // We only need to fill in the ratings and comments
    const itemRowMapping: { [key: string]: number } = {
      // Category 1: WORKING AREAS (rows 25-32)
      '1-Housekeeping': 25,
      '1-Proper barrier/ safety signs': 26,
      '1-Lighting adequacy': 27,
      '1-Site layout arrangement': 28,
      '1-Ventilation': 29,
      '1-Floor/ ground-edge/ opening condition': 30,
      '1-Escape/ working route condition': 31,
      '1-Material storage/ stacking': 32,

      // Category 2: SITE OFFICE (rows 36-43) - All 8 items with "2-" prefix
      '2-Office ergonomics': 36,
      '2-Location and maintenance': 37,
      '2-Fire extinguishers condition': 38,
      '2-First aid box facility': 39,
      "2-Worker's legality / age": 43,
      '2-Green card (CIDB)/ NIOSH cert.': 44,
      '2-PMA/ PMT/ JBE/ DOE approval': 45,
      '2-Competent scaffolder': 46,

      // Category 3: HOT WORK/ ELECTRICAL (rows 50-54)
      '3-Gas cylinders secured and upright': 50,
      '3-Gauge functionality': 51,
      '3-Flashback arrestors availability': 52,
      '3-Cables insulation/ earthing': 53,
      '3-Wiring condition-plugs, joints, DB': 54,

      // Category 4: PERSONAL PROTECTIVE EQUIPMENT (rows 58-62)
      '4-Safety helmets': 58,
      '4-Safety footwear': 59,
      '4-Safety vest': 60,
      '4-Proper attire': 61,
      '4-Other; as per job requirements': 62,

      // Category 5: EXCAVATIONS (rows 66-71)
      '5-Safely secured-sign, barrier covered': 66,
      '5-No material at 1m from edge': 67,
      '5-Proper & adequate access & egress': 68,
      '5-Adequate slope protection': 69,
      '5-Check for underground hazard': 70,
      '5-Inspection checklist': 71,

      // Category 6: SCAFFOLDING (rows 75-81)
      '6-PE design requirement': 75,
      '6-Access condition': 76,
      '6-Walkways/ platform condition': 77,
      '6-Adequate slope protection': 78,
      '6-Means of fall protection': 79,
      '6-Ground/base condition': 80,
      '6-Inspection checklist': 81,

      // Category 7: MACHINERY & PLANT (rows 85-90)
      '7-Machinery guarding': 85,
      '7-Machinery/ plant service record': 86,
      '7-Properly and safely sited': 87,
      '7-Skid tank condition': 88,
      '7-Lifting process/ gear condition': 89,
      "7-Vehicle's condition": 90,

      // Category 8: TRAFFIC MANAGEMENT (rows 94-99)
      '8-Flagman availability & adequacy': 94,
      '8-Signages availability & adequacy': 95,
      '8-Vehicle route maintenance': 96,
      '8-Public road maintenance': 97,
      '8-Loads protection': 98,
      '8-Method of controlling': 99,

      // Category 9: HEALTH (rows 103-107)
      '9-First aid box/ facility': 103,
      '9-First aider availability': 104,
      '9-Vector/ Pest control': 105,
      '9-Washing/ clean water facility': 106,
      '9-Toilet condition / availability': 107,

      // Category 10: ENVIRONMENTAL (rows 111-116)
      '10-Control of oil pollution': 111,
      '10-Control of dust pollution / emission': 112,
      '10-Control of noise pollution / emission': 113,
      '10-Control of open burning': 114,
      '10-Control of debris / rubbish': 115,
      '10-Silt trap/drainage/culvert maintenance': 116,

      // Category 11: SECURITY (rows 120-124)
      '11-Security personal adequacy': 120,
      '11-Security sign condition/ availability': 121,
      '11-Control of site access/ exit': 122,
      '11-Hoarding/ fencing condition': 123,
      '11-Emergency contact list': 124,

      // Category 12: PUBLIC SAFETY (rows 128-134)
      '12-Warning signs': 128,
      '12-Control of public entry': 129,
      '12-Proper work planning toward public safety': 130,
      '12-Communication establishment': 131,
      '12-Training on public safety to worker': 132,
      '12-Catch platform': 133,
      '12-Pedestrian protection': 134,
    };

    // Fill in only the ratings and comments for each item
    console.log('[HSE Export] Filling inspection items...');
    formData.inspectionItems.forEach((item) => {
      const rowNumber = itemRowMapping[item.key];
      if (!rowNumber) {
        console.warn(`No row mapping found for item: ${item.key}`);
        return;
      }

      const rating = item.rating;
      const comment = item.comment || '';

      // Fill in rating checkmarks (columns G-M)
      worksheet.getCell(`G${rowNumber}`).value = rating === 'G' ? '✓' : '';
      worksheet.getCell(`G${rowNumber}`).alignment = { vertical: 'middle', horizontal: 'center' };

      worksheet.getCell(`H${rowNumber}`).value = rating === 'A' ? '✓' : '';
      worksheet.getCell(`H${rowNumber}`).alignment = { vertical: 'middle', horizontal: 'center' };

      worksheet.getCell(`I${rowNumber}`).value = rating === 'P' ? '✓' : '';
      worksheet.getCell(`I${rowNumber}`).alignment = { vertical: 'middle', horizontal: 'center' };

      worksheet.getCell(`J${rowNumber}`).value = rating === 'I' ? '✓' : '';
      worksheet.getCell(`J${rowNumber}`).alignment = { vertical: 'middle', horizontal: 'center' };

      worksheet.getCell(`K${rowNumber}`).value = rating === 'SIN' ? '✓' : '';
      worksheet.getCell(`K${rowNumber}`).alignment = { vertical: 'middle', horizontal: 'center' };

      worksheet.getCell(`L${rowNumber}`).value = rating === 'SPS' ? '✓' : '';
      worksheet.getCell(`L${rowNumber}`).alignment = { vertical: 'middle', horizontal: 'center' };

      worksheet.getCell(`M${rowNumber}`).value = rating === 'SWO' ? '✓' : '';
      worksheet.getCell(`M${rowNumber}`).alignment = { vertical: 'middle', horizontal: 'center' };

      // Fill in comment (column N)
      const commentCell = worksheet.getCell(`N${rowNumber}`);
      commentCell.value = comment;
      commentCell.alignment = { vertical: 'middle', horizontal: 'left', wrapText: true };
    });
    console.log('[HSE Export] Inspection items filled');

    // // Add Comments/Remarks section (starting after all categories, around row 137)
    let commentsRow = 138;
    // worksheet.getCell(`B${commentsRow}`).value = 'COMMENTS / REMARKS:';
    // worksheet.getCell(`B${commentsRow}`).font = { bold: true, size: 12 };
    // commentsRow++;

    // Add the comments/remarks content if provided
    if (formData.commentsRemarks) {
      worksheet.getCell(`B${commentsRow}`).value = formData.commentsRemarks;
      worksheet.getCell(`B${commentsRow}`).alignment = { vertical: 'top', horizontal: 'left', wrapText: true };
      commentsRow++;
    }

    // Add blank lines for manual comments
    for (let i = 0; i < 5; i++) {
      worksheet.getCell(`A${commentsRow}`).value = '';
      commentsRow++;
    }

    // Add supervisor review information if available
    if (formData.reviewedBy && formData.reviewedAt) {
      const reviewDate = new Date(formData.reviewedAt).toLocaleDateString('en-GB');
      commentsRow += 2;

      // Add "Reviewed by" section
      worksheet.getCell(`A${commentsRow}`).value = 'Reviewed by:';
      worksheet.getCell(`A${commentsRow}`).font = { bold: true, size: 11 };

      worksheet.getCell(`B${commentsRow}`).value = formData.reviewedBy;
      worksheet.getCell(`E${commentsRow}`).value = `Date: ${reviewDate}`;

      // Add signature if available
      if (formData.reviewerSignature) {
        try {
          // Convert base64 signature to image
          const base64Data = formData.reviewerSignature.replace(/^data:image\/\w+;base64,/, '');
          const imageId = workbook.addImage({
            base64: base64Data,
            extension: 'png',
          });

          worksheet.addImage(imageId, {
            tl: { col: 9, row: commentsRow - 1 },
            ext: { width: 150, height: 50 },
          });

          worksheet.getCell(`J${commentsRow}`).value = 'Supervisor Signature';
          worksheet.getCell(`J${commentsRow}`).font = { size: 9, italic: true };
        } catch (error) {
          console.error('Error adding signature to Excel:', error);
        }
      }
    }

    // Add Observations worksheet if observations exist
    console.log('[HSE Export] Checking for observations...');
    if (formData.observations && formData.observations.length > 0) {
      console.log(`[HSE Export] Adding ${formData.observations.length} observations to worksheet...`);

      // Check if worksheet already exists and remove it to avoid conflicts
      const existingObsSheet = workbook.getWorksheet('HSE Observations');
      if (existingObsSheet) {
        console.log('[HSE Export] Removing existing HSE Observations worksheet...');
        workbook.removeWorksheet(existingObsSheet.id);
      }

      const observationsSheet = workbook.addWorksheet('HSE Observations');

      // Set column widths
      observationsSheet.columns = [
        { width: 8 },   // A - Item No
        { width: 25 },  // B - Category
        { width: 25 },  // C - Item Name
        { width: 40 },  // D - Observation
        { width: 30 },  // E - Action Needed
        { width: 20 },  // F - Location
        { width: 15 },  // G - Date/Time
        { width: 12 },  // H - Status
        { width: 25 },  // I - Hazards
        { width: 30 },  // J - Remarks
      ];

      // Header row
      const headerRow = observationsSheet.addRow([
        'Item No.',
        'Category',
        'Item Name',
        'Observation',
        'Action Needed',
        'Location',
        'Date/Time',
        'Status',
        'Hazards',
        'Remarks'
      ]);

      // Style header row
      headerRow.font = { bold: true, size: 11, color: { argb: 'FFFFFFFF' } };
      headerRow.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF4472C4' }
      };
      headerRow.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
      headerRow.height = 25;

      // Add observation data
      formData.observations.forEach((obs) => {
        const row = observationsSheet.addRow([
          obs.itemNo,
          obs.categoryName,
          obs.itemName,
          obs.observation,
          obs.actionNeeded || '',
          obs.location || '',
          `${obs.date} ${obs.time}`,
          obs.status,
          obs.hazards || '',
          obs.remarks || ''
        ]);

        // Style data rows
        row.alignment = { vertical: 'top', wrapText: true };
        row.height = 50;

        // Color code status
        const statusCell = row.getCell(8);
        if (obs.status === 'Open') {
          statusCell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFFFC7CE' } // Light red
          };
          statusCell.font = { color: { argb: 'FF9C0006' }, bold: true };
        } else if (obs.status === 'Closed') {
          statusCell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFC6EFCE' } // Light green
          };
          statusCell.font = { color: { argb: 'FF006100' }, bold: true };
        } else {
          statusCell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFFFF2CC' } // Light yellow
          };
          statusCell.font = { color: { argb: 'FF9C6500' }, bold: true };
        }

        // Add borders to all cells
        row.eachCell((cell) => {
          cell.border = {
            top: { style: 'thin' },
            left: { style: 'thin' },
            bottom: { style: 'thin' },
            right: { style: 'thin' }
          };
        });

        // Try to add photos if they exist
        if (obs.photos && obs.photos.length > 0) {
          console.log(`[HSE Export] Adding ${obs.photos.length} photos for observation ${obs.itemNo}...`);
          obs.photos.slice(0, 3).forEach((photo, photoIndex) => {
            try {
              const base64Data = photo.replace(/^data:image\/\w+;base64,/, '');
              const imageId = workbook.addImage({
                base64: base64Data,
                extension: 'png',
              });

              // Add image in a comment-like position
              const rowNumber = row.number;
              observationsSheet.addImage(imageId, {
                tl: { col: 10 + photoIndex, row: rowNumber - 1 },
                ext: { width: 80, height: 60 }
              });
            } catch (error) {
              console.error('Error adding observation photo to Excel:', error);
            }
          });
        }
      });

      // Add summary at the top
      observationsSheet.insertRow(1, ['HSE OBSERVATION FORMS']);
      const titleRow = observationsSheet.getRow(1);
      titleRow.font = { bold: true, size: 14, color: { argb: 'FF1F4E78' } };
      titleRow.height = 25;
      observationsSheet.mergeCells('A1:J1');
      titleRow.alignment = { vertical: 'middle', horizontal: 'center' };

      observationsSheet.insertRow(2, [
        `Total Observations: ${formData.observations.length}`,
        '',
        '',
        `Inspection Date: ${formData.date}`,
        '',
        '',
        `Location: ${formData.location}`
      ]);
      const summaryRow = observationsSheet.getRow(2);
      summaryRow.font = { size: 10 };
      summaryRow.height = 20;
      observationsSheet.mergeCells('A2:C2');
      observationsSheet.mergeCells('D2:F2');
      observationsSheet.mergeCells('G2:J2');

      // Add blank row
      observationsSheet.addRow([]);
      console.log('[HSE Export] Observations worksheet created successfully');
    } else {
      console.log('[HSE Export] No observations to add');
    }

    // Prepare filename
    const filename = `HSE_Inspection_Checklist_${formData.location.replace(/[^a-z0-9]/gi, '_')}_${
      formData.date
    }.xlsx`;

    if (format === 'pdf') {
      // Generate PDF from the filled Excel template
      try {
        const excelBuffer = await workbook.xlsx.writeBuffer();

        // Convert Excel to PDF maintaining all formatting
        const pdfBuffer = await convertExcelToPDF(excelBuffer as Buffer, {
          includeImages: true,
          maintainColors: true,
          pageSize: 'A4',
          orientation: 'portrait',
        });

        const pdfFilename = filename.replace('.xlsx', '.pdf');

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="${pdfFilename}"`);
        res.setHeader('Content-Length', (pdfBuffer as Buffer).length);
        res.status(200).send(pdfBuffer);
      } catch (pdfError) {
        console.error('PDF generation error:', pdfError);
        res.status(500).json({
          error: 'Failed to generate PDF from template',
          message: pdfError instanceof Error ? pdfError.message : 'Unknown error',
        });
      }
    } else {
      // Generate Excel buffer
      try {
        console.log('[HSE Export] Generating Excel buffer...');
        const buffer = await workbook.xlsx.writeBuffer();
        console.log('[HSE Export] Excel buffer generated successfully, size:', buffer.byteLength);

        res.setHeader(
          'Content-Type',
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        );
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.setHeader('Content-Length', (buffer as Buffer).length);
        res.status(200).send(buffer);
      } catch (bufferError) {
        console.error('[HSE Export] Error writing Excel buffer:', bufferError);
        throw new Error(`Excel buffer generation failed: ${bufferError instanceof Error ? bufferError.message : 'Unknown error'}`);
      }
    }
  } catch (error) {
    console.error('Error generating template-based export:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorStack = error instanceof Error ? error.stack : '';
    console.error('Error stack:', errorStack);
    res.status(500).json({
      error: 'Failed to generate export',
      message: errorMessage,
      details: errorStack,
    });
  }
}
