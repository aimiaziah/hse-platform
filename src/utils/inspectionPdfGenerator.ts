// src/utils/inspectionPdfGenerator.ts
// Comprehensive PDF generation for all inspection types

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { generateFirstAidPDF } from './firstAidExport';

interface InspectionData {
  id: string;
  inspection_number: string;
  inspection_type: 'fire_extinguisher' | 'first_aid' | 'hse_general' | string;
  inspector_id: string;
  inspected_by: string;
  designation?: string | null;
  inspection_date: string;
  submitted_at?: string | null;
  reviewed_at?: string | null;
  status: 'draft' | 'pending_review' | 'approved' | 'rejected' | 'completed';
  reviewer_id?: string | null;
  review_comments?: string | null;
  form_data: any;
  signature?: string | null;
  remarks?: string | null;
}

interface SupervisorOverviewData {
  inspections: InspectionData[];
  supervisorName: string;
  generatedDate: string;
  filterCriteria?: {
    startDate?: string;
    endDate?: string;
    inspectionType?: string;
    status?: string;
  };
}

/**
 * Generate a single inspection PDF report
 */
export function generateInspectionPDF(inspection: InspectionData): jsPDF {
  // Use specialized template for first aid inspections
  if (inspection.inspection_type === 'first_aid') {
    return generateFirstAidPDF({
      inspectedBy: inspection.inspected_by,
      designation: inspection.designation || 'HSE',
      inspectionDate: inspection.inspection_date,
      signature: inspection.signature || undefined,
      kits: inspection.form_data.kits || []
    });
  }

  // Default format for other inspection types
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  let yPosition = 20;

  // Add company logo/header
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('Inspection Report', pageWidth / 2, yPosition, { align: 'center' });

  yPosition += 10;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(getInspectionTypeName(inspection.inspection_type), pageWidth / 2, yPosition, { align: 'center' });

  yPosition += 15;

  // Inspection Details Section
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('Inspection Information', 14, yPosition);
  yPosition += 8;

  const inspectionInfo = [
    ['Inspection Number:', inspection.inspection_number],
    ['Type:', getInspectionTypeName(inspection.inspection_type)],
    ['Inspector:', inspection.inspected_by],
    ['Designation:', inspection.designation || 'N/A'],
    ['Inspection Date:', formatDate(inspection.inspection_date)],
    ['Submitted At:', inspection.submitted_at ? formatDate(inspection.submitted_at) : 'Not submitted'],
    ['Status:', inspection.status.toUpperCase().replace('_', ' ')],
  ];

  if (inspection.reviewed_at) {
    inspectionInfo.push(['Reviewed At:', formatDate(inspection.reviewed_at)]);
  }

  if (inspection.review_comments) {
    inspectionInfo.push(['Review Comments:', inspection.review_comments]);
  }

  autoTable(doc, {
    startY: yPosition,
    head: [],
    body: inspectionInfo,
    theme: 'plain',
    styles: { fontSize: 10 },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 45 },
      1: { cellWidth: 'auto' }
    },
  });

  yPosition = (doc as any).lastAutoTable.finalY + 15;

  // Type-specific inspection details
  switch (inspection.inspection_type) {
    case 'fire_extinguisher':
      yPosition = addFireExtinguisherDetails(doc, inspection.form_data, yPosition);
      break;
    case 'first_aid':
      yPosition = addFirstAidDetails(doc, inspection.form_data, yPosition);
      break;
    case 'hse_general':
      yPosition = addHSEInspectionDetails(doc, inspection.form_data, yPosition);
      break;
  }

  // Add signature if available
  if (inspection.signature) {
    if (yPosition > 240) {
      doc.addPage();
      yPosition = 20;
    }
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Inspector Signature:', 14, yPosition);
    yPosition += 10;
    try {
      doc.addImage(inspection.signature, 'PNG', 14, yPosition, 60, 30);
      yPosition += 35;
    } catch (error) {
      doc.setFontSize(10);
      doc.setFont('helvetica', 'italic');
      doc.text('Signature image unavailable', 14, yPosition);
      yPosition += 10;
    }
  }

  // Add footer
  addFooter(doc);

  return doc;
}

/**
 * Generate supervisor overview PDF with multiple inspections
 */
export function generateSupervisorOverviewPDF(data: SupervisorOverviewData): jsPDF {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  let yPosition = 20;

  // Header
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('Supervisor Review Report', pageWidth / 2, yPosition, { align: 'center' });

  yPosition += 10;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Generated for: ${data.supervisorName}`, pageWidth / 2, yPosition, { align: 'center' });

  yPosition += 5;
  doc.text(`Generated on: ${formatDate(data.generatedDate)}`, pageWidth / 2, yPosition, { align: 'center' });

  yPosition += 15;

  // Filter criteria if provided
  if (data.filterCriteria) {
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('Filter Criteria:', 14, yPosition);
    yPosition += 6;
    doc.setFont('helvetica', 'normal');

    if (data.filterCriteria.startDate || data.filterCriteria.endDate) {
      const dateRange = `${data.filterCriteria.startDate ? formatDate(data.filterCriteria.startDate) : 'Start'} - ${data.filterCriteria.endDate ? formatDate(data.filterCriteria.endDate) : 'End'}`;
      doc.text(`Date Range: ${dateRange}`, 14, yPosition);
      yPosition += 5;
    }

    if (data.filterCriteria.inspectionType) {
      doc.text(`Type: ${getInspectionTypeName(data.filterCriteria.inspectionType as any)}`, 14, yPosition);
      yPosition += 5;
    }

    if (data.filterCriteria.status) {
      doc.text(`Status: ${data.filterCriteria.status.toUpperCase().replace('_', ' ')}`, 14, yPosition);
      yPosition += 5;
    }

    yPosition += 10;
  }

  // Summary statistics
  const stats = calculateStatistics(data.inspections);

  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('Summary Statistics', 14, yPosition);
  yPosition += 8;

  const statsData = [
    ['Total Inspections:', stats.total.toString()],
    ['Pending Review:', stats.pending.toString()],
    ['Approved:', stats.approved.toString()],
    ['Rejected:', stats.rejected.toString()],
    ['Fire Extinguisher:', stats.fireExtinguisher.toString()],
    ['First Aid:', stats.firstAid.toString()],
    ['HSE General:', stats.hseGeneral.toString()],
  ];

  autoTable(doc, {
    startY: yPosition,
    head: [],
    body: statsData,
    theme: 'plain',
    styles: { fontSize: 10 },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 50 },
      1: { cellWidth: 'auto' }
    },
  });

  yPosition = (doc as any).lastAutoTable.finalY + 15;

  // Inspections table
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('Inspections List', 14, yPosition);
  yPosition += 8;

  const tableData = data.inspections.map(inspection => [
    inspection.inspection_number,
    getInspectionTypeName(inspection.inspection_type),
    inspection.inspected_by,
    formatDate(inspection.inspection_date),
    inspection.submitted_at ? formatDate(inspection.submitted_at) : 'Not submitted',
    formatStatus(inspection.status),
  ]);

  autoTable(doc, {
    startY: yPosition,
    head: [['Inspection #', 'Type', 'Inspector', 'Date', 'Submitted', 'Status']],
    body: tableData,
    theme: 'grid',
    styles: { fontSize: 8, cellPadding: 2 },
    headStyles: { fillColor: [41, 128, 185], textColor: 255, fontStyle: 'bold' },
    columnStyles: {
      0: { cellWidth: 25 },
      1: { cellWidth: 35 },
      2: { cellWidth: 30 },
      3: { cellWidth: 25 },
      4: { cellWidth: 30 },
      5: { cellWidth: 25 },
    },
    didDrawPage: (data) => {
      // Add page numbers
      const pageCount = doc.getNumberOfPages();
      const currentPage = (doc as any).internal.getCurrentPageInfo().pageNumber;
      doc.setFontSize(8);
      doc.text(
        `Page ${currentPage} of ${pageCount}`,
        pageWidth / 2,
        doc.internal.pageSize.getHeight() - 10,
        { align: 'center' }
      );
    },
  });

  // Add footer
  addFooter(doc);

  return doc;
}

/**
 * Add fire extinguisher inspection details
 */
function addFireExtinguisherDetails(doc: jsPDF, formData: any, yPosition: number): number {
  if (yPosition > 200) {
    doc.addPage();
    yPosition = 20;
  }

  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('Fire Extinguisher Inspection Details', 14, yPosition);
  yPosition += 8;

  const extinguishers = formData.extinguishers || [];

  if (extinguishers.length === 0) {
    doc.setFontSize(10);
    doc.setFont('helvetica', 'italic');
    doc.text('No extinguisher data available', 14, yPosition);
    return yPosition + 10;
  }

  // Create table for extinguishers
  const tableData = extinguishers.map((ext: any) => {
    const issues = [];
    if (ext.shellRusted) issues.push('Shell Rusted');
    if (ext.hosePerished) issues.push('Hose Perished');
    if (ext.nozzleBlocked) issues.push('Nozzle Blocked');
    if (ext.pressureGaugeFaulty) issues.push('Pressure Faulty');
    if (ext.safetyPinMissing) issues.push('Pin Missing');
    if (ext.pinSealBroken) issues.push('Seal Broken');
    if (!ext.accessible) issues.push('Not Accessible');
    if (ext.missingOrNotInPlace) issues.push('Missing/Not in Place');
    if (ext.emptyOrPressureLow) issues.push('Empty/Low Pressure');

    return [
      ext.serialNumber || ext.assetNumber || 'N/A',
      ext.location || 'N/A',
      ext.typeSize || 'N/A',
      ext.expiryDate || 'N/A',
      issues.length > 0 ? issues.join(', ') : 'OK',
      ext.remarks || '-'
    ];
  });

  autoTable(doc, {
    startY: yPosition,
    head: [['Serial #', 'Location', 'Type/Size', 'Expiry', 'Issues', 'Remarks']],
    body: tableData,
    theme: 'grid',
    styles: { fontSize: 8, cellPadding: 2 },
    headStyles: { fillColor: [231, 76, 60], textColor: 255, fontStyle: 'bold' },
    columnStyles: {
      0: { cellWidth: 25 },
      1: { cellWidth: 30 },
      2: { cellWidth: 25 },
      3: { cellWidth: 25 },
      4: { cellWidth: 45 },
      5: { cellWidth: 30 },
    },
    didDrawPage: (data) => {
      // Add page numbers on new pages
      if ((doc as any).internal.getCurrentPageInfo().pageNumber > 1) {
        const pageWidth = doc.internal.pageSize.getWidth();
        const pageCount = doc.getNumberOfPages();
        const currentPage = (doc as any).internal.getCurrentPageInfo().pageNumber;
        doc.setFontSize(8);
        doc.text(
          `Page ${currentPage}`,
          pageWidth / 2,
          doc.internal.pageSize.getHeight() - 10,
          { align: 'center' }
        );
      }
    },
  });

  return (doc as any).lastAutoTable.finalY + 10;
}

/**
 * Add first aid kit inspection details
 */
function addFirstAidDetails(doc: jsPDF, formData: any, yPosition: number): number {
  if (yPosition > 200) {
    doc.addPage();
    yPosition = 20;
  }

  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('First Aid Kit Inspection Details', 14, yPosition);
  yPosition += 8;

  const kits = formData.kits || [];

  if (kits.length === 0) {
    doc.setFontSize(10);
    doc.setFont('helvetica', 'italic');
    doc.text('No first aid kit data available', 14, yPosition);
    return yPosition + 10;
  }

  // For each kit, show items
  kits.forEach((kit: any, kitIndex: number) => {
    if (yPosition > 250) {
      doc.addPage();
      yPosition = 20;
    }

    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text(`Kit Location: ${kit.location || `Kit ${kitIndex + 1}`}`, 14, yPosition);
    yPosition += 6;

    const items = kit.items || [];
    const tableData = items.map((item: any) => [
      item.itemName || 'N/A',
      item.quantity?.toString() || '0',
      item.expiryDate || 'N/A',
      item.status || 'OK'
    ]);

    autoTable(doc, {
      startY: yPosition,
      head: [['Item Name', 'Quantity', 'Expiry Date', 'Status']],
      body: tableData,
      theme: 'grid',
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [46, 204, 113], textColor: 255, fontStyle: 'bold' },
      columnStyles: {
        0: { cellWidth: 80 },
        1: { cellWidth: 25 },
        2: { cellWidth: 35 },
        3: { cellWidth: 40 },
      },
    });

    yPosition = (doc as any).lastAutoTable.finalY + 10;
  });

  return yPosition;
}

/**
 * Add HSE general inspection details
 */
function addHSEInspectionDetails(doc: jsPDF, formData: any, yPosition: number): number {
  if (yPosition > 200) {
    doc.addPage();
    yPosition = 20;
  }

  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('HSE General Inspection Details', 14, yPosition);
  yPosition += 8;

  // Add contractor info if available
  if (formData.contractorInfo) {
    const info = formData.contractorInfo;
    const contractorData = [
      ['Contractor:', info.contractorName || 'N/A'],
      ['Location:', info.location || 'N/A'],
      ['Work Activity:', info.workActivity || 'N/A'],
    ];

    autoTable(doc, {
      startY: yPosition,
      head: [],
      body: contractorData,
      theme: 'plain',
      styles: { fontSize: 9 },
      columnStyles: {
        0: { fontStyle: 'bold', cellWidth: 40 },
        1: { cellWidth: 'auto' }
      },
    });

    yPosition = (doc as any).lastAutoTable.finalY + 10;
  }

  // Add inspection categories
  const categories = formData.categories || [];

  if (categories.length > 0) {
    categories.forEach((category: any) => {
      if (yPosition > 250) {
        doc.addPage();
        yPosition = 20;
      }

      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text(category.name || 'Category', 14, yPosition);
      yPosition += 6;

      const items = category.items || [];
      const tableData = items.map((item: any) => [
        item.question || item.label || 'N/A',
        item.answer || item.rating || 'N/A',
        item.notes || item.remarks || '-'
      ]);

      if (tableData.length > 0) {
        autoTable(doc, {
          startY: yPosition,
          head: [['Item', 'Rating', 'Notes']],
          body: tableData,
          theme: 'grid',
          styles: { fontSize: 8, cellPadding: 2 },
          headStyles: { fillColor: [52, 152, 219], textColor: 255, fontStyle: 'bold' },
          columnStyles: {
            0: { cellWidth: 80 },
            1: { cellWidth: 25 },
            2: { cellWidth: 75 },
          },
        });

        yPosition = (doc as any).lastAutoTable.finalY + 10;
      }
    });
  }

  // Add observations if available
  if (formData.observations && formData.observations.length > 0) {
    if (yPosition > 250) {
      doc.addPage();
      yPosition = 20;
    }

    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('Observations:', 14, yPosition);
    yPosition += 6;

    const obsData = formData.observations.map((obs: any, idx: number) => [
      (idx + 1).toString(),
      obs.observation || obs.note || 'N/A'
    ]);

    autoTable(doc, {
      startY: yPosition,
      head: [['#', 'Observation']],
      body: obsData,
      theme: 'grid',
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [155, 89, 182], textColor: 255, fontStyle: 'bold' },
      columnStyles: {
        0: { cellWidth: 15 },
        1: { cellWidth: 'auto' },
      },
    });

    yPosition = (doc as any).lastAutoTable.finalY + 10;
  }

  return yPosition;
}

/**
 * Calculate statistics from inspections
 */
function calculateStatistics(inspections: InspectionData[]) {
  return {
    total: inspections.length,
    pending: inspections.filter(i => i.status === 'pending_review').length,
    approved: inspections.filter(i => i.status === 'approved').length,
    rejected: inspections.filter(i => i.status === 'rejected').length,
    fireExtinguisher: inspections.filter(i => i.inspection_type === 'fire_extinguisher').length,
    firstAid: inspections.filter(i => i.inspection_type === 'first_aid').length,
    hseGeneral: inspections.filter(i => i.inspection_type === 'hse_general').length,
  };
}

/**
 * Add footer to PDF
 */
function addFooter(doc: jsPDF) {
  const pageCount = doc.getNumberOfPages();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(128);
    doc.text(
      `Generated by PWA Inspection Platform - ${new Date().toLocaleString()}`,
      pageWidth / 2,
      pageHeight - 10,
      { align: 'center' }
    );
  }
}

/**
 * Format date string
 */
function formatDate(dateString: string): string {
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  } catch {
    return dateString;
  }
}

/**
 * Get human-readable inspection type name
 */
function getInspectionTypeName(type: string): string {
  switch (type) {
    case 'fire_extinguisher':
      return 'Fire Extinguisher Inspection';
    case 'first_aid':
      return 'First Aid Kit Inspection';
    case 'hse_general':
      return 'HSE General Inspection';
    default:
      return type;
  }
}

/**
 * Format status for display
 */
function formatStatus(status: string): string {
  return status.toUpperCase().replace('_', ' ');
}

/**
 * Download PDF
 */
export function downloadPDF(doc: jsPDF, filename: string) {
  doc.save(filename);
}

/**
 * Convenience function to generate and download single inspection PDF
 */
export function generateAndDownloadInspectionPDF(inspection: InspectionData) {
  const pdf = generateInspectionPDF(inspection);
  const filename = `Inspection_${inspection.inspection_number}_${formatDate(inspection.inspection_date)}.pdf`;
  downloadPDF(pdf, filename);
}

/**
 * Convenience function to generate and download supervisor overview PDF
 */
export function generateAndDownloadSupervisorOverviewPDF(data: SupervisorOverviewData) {
  const pdf = generateSupervisorOverviewPDF(data);
  const filename = `Supervisor_Overview_${formatDate(data.generatedDate)}.pdf`;
  downloadPDF(pdf, filename);
}
