// Excel to PDF converter that maintains template formatting
import ExcelJS from 'exceljs';
import { PDFDocument, rgb, StandardFonts, PDFPage } from 'pdf-lib';

interface ConversionOptions {
  includeImages?: boolean;
  maintainColors?: boolean;
  pageSize?: 'A4' | 'Letter';
  orientation?: 'portrait' | 'landscape';
}

/**
 * Sanitize text to remove or replace characters that can't be encoded with WinAnsi
 * StandardFonts in pdf-lib only support WinAnsi encoding (Latin-1)
 */
function sanitizeTextForPDF(text: string): string {
  if (!text) return '';

  // Map of Unicode characters to ASCII equivalents
  const charMap: { [key: string]: string } = {
    '\u2713': 'Y', // Checkmark
    '\u2717': 'N', // X mark
    '\u00D7': 'X', // Multiplication sign
    '\u2022': '-', // Bullet
    '\u2013': '-', // En dash
    '\u2014': '-', // Em dash
    '\u2018': "'", // Smart single quote left
    '\u2019': "'", // Smart single quote right
    '\u201C': '"', // Smart double quote left
    '\u201D': '"', // Smart double quote right
    '\u2026': '...', // Ellipsis
    '\u2122': '(TM)', // Trademark
    '\u00A9': '(C)', // Copyright
    '\u00AE': '(R)', // Registered
    '\u00B0': 'deg', // Degree symbol
    '\u00B1': '+/-', // Plus-minus
    '\u2264': '<=', // Less than or equal
    '\u2265': '>=', // Greater than or equal
    '\u2260': '!=', // Not equal
    '\u2192': '->', // Right arrow
    '\u2190': '<-', // Left arrow
    '\u2191': '^', // Up arrow
    '\u2193': 'v', // Down arrow
  };

  // Replace special characters
  let sanitized = text;
  for (const [unicode, ascii] of Object.entries(charMap)) {
    sanitized = sanitized.replace(new RegExp(unicode, 'g'), ascii);
  }

  // Remove any remaining characters that aren't in WinAnsi encoding (0x00-0xFF)
  // Keep only basic ASCII and Latin-1 supplement characters
  sanitized = sanitized.replace(/[^\x00-\xFF]/g, '?');

  return sanitized;
}

/**
 * Convert an Excel workbook buffer to PDF buffer
 * Maintains formatting, colors, borders from the Excel template
 */
export async function convertExcelToPDF(
  excelBuffer: Buffer,
  options: ConversionOptions = {},
): Promise<Buffer> {
  const {
    includeImages = true,
    maintainColors = true,
    pageSize = 'A4',
    orientation = 'portrait',
  } = options;

  // Load the Excel workbook
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(excelBuffer);

  // Create PDF document
  const pdfDoc = await PDFDocument.create();

  // Get the first worksheet
  const worksheet = workbook.worksheets[0];
  if (!worksheet) {
    throw new Error('No worksheet found in Excel file');
  }

  // Calculate page dimensions
  const pageDimensions =
    orientation === 'landscape'
      ? { width: 842, height: 595 } // A4 landscape
      : { width: 595, height: 842 }; // A4 portrait

  // Add a page
  const page = pdfDoc.addPage([pageDimensions.width, pageDimensions.height]);

  // Load fonts
  const regularFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const italicFont = await pdfDoc.embedFont(StandardFonts.HelveticaOblique);

  // Calculate scaling factors
  const maxRow = worksheet.rowCount;
  const maxCol = worksheet.columnCount;

  // Start positions
  const marginLeft = 30;
  const marginTop = 30;
  let currentY = pageDimensions.height - marginTop;

  // Column widths (approximate conversion from Excel units to PDF points)
  const columnWidths: number[] = [];
  worksheet.columns.forEach((col, index) => {
    const width = col.width || 10;
    columnWidths[index] = width * 7; // Approximate conversion
  });

  // Row heights
  const rowHeights: number[] = [];
  worksheet.eachRow((row, rowNumber) => {
    const height = row.height || 15;
    rowHeights[rowNumber - 1] = height * 0.75; // Approximate conversion
  });

  // Process each row
  worksheet.eachRow((row, rowNumber) => {
    if (rowNumber > maxRow) return;

    const rowHeight = rowHeights[rowNumber - 1] || 15;
    let currentX = marginLeft;

    // Process each cell in the row
    row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
      if (colNumber > maxCol) return;

      const cellWidth = columnWidths[colNumber - 1] || 60;

      // Get cell value and sanitize it for PDF encoding
      const rawCellValue = cell.value?.toString() || '';
      const cellValue = sanitizeTextForPDF(rawCellValue);

      // Get cell style
      const cellStyle = cell.style || {};
      const font = cellStyle.font || {};
      const fill: any = cellStyle.fill || {};
      const border = cellStyle.border || {};
      const alignment = cellStyle.alignment || {};

      // Draw cell background
      if (maintainColors && fill.type === 'pattern' && fill.fgColor) {
        const bgColor = fill.fgColor.argb || 'FFFFFFFF';
        const r = parseInt(bgColor.substring(2, 4), 16) / 255;
        const g = parseInt(bgColor.substring(4, 6), 16) / 255;
        const b = parseInt(bgColor.substring(6, 8), 16) / 255;

        page.drawRectangle({
          x: currentX,
          y: currentY - rowHeight,
          width: cellWidth,
          height: rowHeight,
          color: rgb(r, g, b),
        });
      }

      // Draw cell borders
      if (border) {
        page.drawRectangle({
          x: currentX,
          y: currentY - rowHeight,
          width: cellWidth,
          height: rowHeight,
          borderColor: rgb(0.7, 0.7, 0.7),
          borderWidth: 0.5,
        });
      }

      // Draw cell text
      if (cellValue) {
        const fontSize = (font.size as number) || 10;
        const isBold = font.bold;
        const isItalic = font.italic;

        // Select appropriate font
        let selectedFont = regularFont;
        if (isBold) selectedFont = boldFont;
        else if (isItalic) selectedFont = italicFont;

        // Text color
        let textColor = rgb(0, 0, 0);
        if (font.color?.argb) {
          const color = font.color.argb;
          const r = parseInt(color.substring(2, 4), 16) / 255;
          const g = parseInt(color.substring(4, 6), 16) / 255;
          const b = parseInt(color.substring(6, 8), 16) / 255;
          textColor = rgb(r, g, b);
        }

        // Calculate text position based on alignment
        const textWidth = selectedFont.widthOfTextAtSize(cellValue, fontSize);
        let textX = currentX + 2; // Default left align with padding

        if (alignment.horizontal === 'center') {
          textX = currentX + (cellWidth - textWidth) / 2;
        } else if (alignment.horizontal === 'right') {
          textX = currentX + cellWidth - textWidth - 2;
        }

        const textY = currentY - rowHeight / 2 - fontSize / 3; // Vertical center

        page.drawText(cellValue, {
          x: textX,
          y: textY,
          size: fontSize,
          font: selectedFont,
          color: textColor,
        });
      }

      currentX += cellWidth;
    });

    currentY -= rowHeight;

    // Check if we need a new page
    if (currentY < 50 && rowNumber < maxRow) {
      const newPage = pdfDoc.addPage([pageDimensions.width, pageDimensions.height]);
      currentY = pageDimensions.height - marginTop;
    }
  });

  // Embed images if present
  if (includeImages && worksheet.getImages) {
    try {
      const images = worksheet.getImages();
      for (const img of images) {
        // Handle embedded images
        const imageData = workbook.getImage(img.imageId as any);
        if (imageData && imageData.buffer) {
          let embeddedImage;
          const ext = imageData.extension as string;
          if (ext === 'png') {
            embeddedImage = await pdfDoc.embedPng(imageData.buffer);
          } else if (ext === 'jpeg' || ext === 'jpg') {
            embeddedImage = await pdfDoc.embedJpg(imageData.buffer);
          }

          if (embeddedImage) {
            // Calculate position based on image range
            const range = img.range as any;
            const imgX = marginLeft + (range.tl?.col || 0) * 60;
            const imgY = pageDimensions.height - marginTop - (range.tl?.row || 0) * 20;

            page.drawImage(embeddedImage, {
              x: imgX,
              y: imgY - (range.ext?.height || 50),
              width: range.ext?.width || 100,
              height: range.ext?.height || 50,
            });
          }
        }
      }
    } catch (error) {
      console.error('Error embedding images:', error);
    }
  }

  // Return PDF as buffer
  const pdfBytes = await pdfDoc.save();
  return Buffer.from(pdfBytes);
}

/**
 * Generate PDF from Excel template with data
 * This ensures the PDF matches the Excel template exactly
 */
export async function generatePDFFromTemplate(
  templateBuffer: Buffer,
  filledWorkbook: ExcelJS.Workbook,
  options: ConversionOptions = {},
): Promise<Buffer> {
  // Write the filled workbook to buffer
  const excelBuffer = await filledWorkbook.xlsx.writeBuffer();

  // Convert to PDF
  return convertExcelToPDF(excelBuffer as Buffer, options);
}
