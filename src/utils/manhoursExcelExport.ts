// Monthly Manhours Report Export Utility
// Uses existing template from local storage (with Supabase fallback) and fills in the values
// Template: "monthly manhours.xlsx" with logo and complete formatting

import ExcelJS from 'exceljs';
import { loadTemplate } from './templateLoader';

interface MonthlyData {
  month: string;
  manPower: string;
  manHours: string;
  accidents: string;
}

interface ManhoursReportData {
  id: string;
  // Header Info
  preparedBy: string;
  preparedDate: string;
  reviewedBy: string;
  reviewedDate: string;
  reportMonth: string;
  reportYear: string;

  // Section 1: Statistics
  numEmployees: string;
  monthlyManHours: string;
  yearToDateManHours: string;
  totalAccumulatedManHours: string;
  annualTotalManHours: string;
  workdaysLost: string;
  ltiCases: string;
  noLTICases: string;
  nearMissAccidents: string;
  dangerousOccurrences: string;
  occupationalDiseases: string;

  // Formula values
  formulaLtiCases: string;
  formulaAnnualAvgEmployees: string;
  formulaAnnualTotalManHours: string;
  formulaWorkdaysLost: string;

  // Section 2: Project and Monthly Data
  projectName: string;
  monthlyData: MonthlyData[];

  // Meta
  status: 'draft' | 'completed' | 'pending_review';
  createdAt: string;
  remarks: string;
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/**
 * Fetch Excel template from local storage (with Supabase fallback and caching)
 * This replaces direct Supabase downloads to reduce egress costs
 */
async function fetchTemplateFromStorage(
  bucketName: string,
  filePath: string,
): Promise<ArrayBuffer> {
  try {
    // Use the new template loader which:
    // 1. Checks browser cache first
    // 2. Tries local /public/templates folder
    // 3. Falls back to Supabase if needed
    // 4. Caches the result for future use
    return await loadTemplate(bucketName, filePath);
  } catch (error) {
    console.error('Error fetching template:', error);
    throw error;
  }
}

/**
 * Load template and fill in values
 * Template preserves logo, formatting, colors, and all styling
 */
export async function generateManhoursExcel(data: ManhoursReportData): Promise<ExcelJS.Workbook> {
  try {
    // Load the template file from Supabase Storage
    console.log('Fetching template from Supabase Storage...');
    const templateBuffer = await fetchTemplateFromStorage('templates', 'monthly manhours.xlsx');

    // Load the template with ExcelJS
    console.log('Loading template with ExcelJS...');
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(templateBuffer);

    // Get the first worksheet (HSE Statistic)
    const ws = wb.worksheets[0];

    if (!ws) {
      throw new Error('No worksheet found in template');
    }

    // ==========================================
    // HEADER SECTION
    // ==========================================

    // Row 4: Prepared by (Column L) and Sign & Date (Column N)
    if (data.preparedBy) {
      ws.getCell('L4').value = data.preparedBy;
    }
    if (data.preparedDate) {
      ws.getCell('N4').value = formatDate(data.preparedDate);
    }

    // Row 7: Reviewed by (Column L) and Sign & Date (Column N)
    if (data.reviewedBy) {
      ws.getCell('L7').value = data.reviewedBy;
    }
    if (data.reviewedDate) {
      ws.getCell('N7').value = formatDate(data.reviewedDate);
    }

    // Row 10: Month (Column K)
    if (data.reportMonth && data.reportYear) {
      ws.getCell('K10').value = `${data.reportMonth} ${data.reportYear}`;
    }

    // ==========================================
    // STATISTICS SECTION (Column H, Rows 17-26)
    // ==========================================

    ws.getCell('H17').value = data.numEmployees || ''; // No. of Employees
    ws.getCell('H18').value = data.monthlyManHours || ''; // Monthly Man-hours
    ws.getCell('H19').value = data.yearToDateManHours || ''; // Year to Date
    ws.getCell('H20').value = data.totalAccumulatedManHours || ''; // Total Accumulated
    ws.getCell('H21').value = data.workdaysLost || ''; // Workdays Lost
    ws.getCell('H22').value = data.ltiCases || '0'; // LTI cases
    ws.getCell('H23').value = data.noLTICases || '0'; // No LTI
    ws.getCell('H24').value = data.nearMissAccidents || '0'; // Near Miss
    ws.getCell('H25').value = data.dangerousOccurrences || '0'; // Dangerous Occurrence
    ws.getCell('H26').value = data.occupationalDiseases || '0'; // Occupational Disease

    // ==========================================
    // FORMULAS SECTION
    // ==========================================

    // LTI Incident Rate (Rows 28-29)
    const ltiRate = calculateLTIIncidentRate(data);
    ws.getCell('E28').value = `No of Accidents [ ${data.formulaLtiCases || 0} ]`;
    ws.getCell('E29').value = `Annual Average of No. of Employee [${
      data.formulaAnnualAvgEmployees || 0
    }]`;
    ws.getCell('O28').value = ltiRate;

    // Incident Frequency Rate (Rows 31-32)
    const freqRate = calculateIncidentFrequencyRate(data);
    ws.getCell('E31').value = `No of Accidents [ ${data.formulaLtiCases || 0} ]`;
    ws.getCell('E32').value = `Total Man-hours worked per year [${
      data.formulaAnnualTotalManHours || 0
    }]`;
    ws.getCell('O31').value = freqRate;

    // Severity Rate (Rows 34-35)
    const sevRate = calculateSeverityRate(data);
    ws.getCell('E34').value = `Loss of Working Days [ ${data.formulaWorkdaysLost || 0} ]`;
    ws.getCell('E35').value = `Total Man-hours worked per year [${
      data.formulaAnnualTotalManHours || 0
    }]`;
    ws.getCell('O34').value = sevRate;

    // ==========================================
    // MONTHLY DATA SECTION
    // ==========================================

    // Row 42: Man Power (Columns D-O for Jan-Dec)
    // Row 43: Man Hours (Columns D-O for Jan-Dec)
    // Row 49: NO OF ACCIDENT (Columns D-O for Jan-Dec)
    const monthColumns = ['D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O'];

    data.monthlyData.forEach((monthData, index) => {
      if (index < 12) {
        const col = monthColumns[index];

        // Row 42: Man Power
        if (monthData.manPower) {
          ws.getCell(`${col}42`).value = monthData.manPower;
        }

        // Row 43: Man Hours
        if (monthData.manHours) {
          ws.getCell(`${col}43`).value = monthData.manHours;
        }

        // Row 49: Accidents
        ws.getCell(`${col}49`).value = monthData.accidents || '0';
      }
    });

    // Update the year in the titles if needed
    const currentYear = data.reportYear || new Date().getFullYear().toString();
    ws.getCell('C14').value = ` Industrial Accidents Statistic ${currentYear}`;
    ws.getCell('C37').value = `Monthly Site Industrial Accidents ${currentYear}`;
    ws.getCell('C46').value = `HSE ACCIDENT STATISTIC ${currentYear}`;

    console.log('Template filled successfully');
    return wb;
  } catch (error) {
    console.error('Error loading template:', error);
    throw new Error(
      'Could not load template from Supabase. Please ensure "monthly manhours.xlsx" exists in the templates bucket.',
    );
  }
}

/**
 * Download the Excel file
 */
export async function downloadManhoursExcel(data: ManhoursReportData, filename?: string) {
  try {
    const wb = await generateManhoursExcel(data);
    const defaultFilename = `Monthly_Manhours_Report_${data.reportMonth}_${data.reportYear}.xlsx`;

    // Generate buffer and download
    const buffer = await wb.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });

    // Create download link
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename || defaultFilename;
    document.body.appendChild(link);
    link.click();

    // Cleanup
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);

    console.log('File downloaded successfully');
  } catch (error) {
    console.error('Error generating Excel:', error);
    throw error;
  }
}

/**
 * Format date to DD/MM/YYYY
 */
function formatDate(dateString: string): string {
  try {
    const date = new Date(dateString);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  } catch {
    return dateString;
  }
}

/**
 * Calculate LTI Incident Rate
 * Formula: (No of Accidents / Annual Average of No. of Employee) × 1000
 */
function calculateLTIIncidentRate(data: ManhoursReportData): string {
  const lti = parseFloat(data.formulaLtiCases) || 0;
  const employees = parseFloat(data.formulaAnnualAvgEmployees) || 1;
  return ((lti / employees) * 1000).toFixed(2);
}

/**
 * Calculate Incident Frequency Rate
 * Formula: (No of Accidents / Total Man-hours worked per year) × 1,000,000
 */
function calculateIncidentFrequencyRate(data: ManhoursReportData): string {
  const lti = parseFloat(data.formulaLtiCases) || 0;
  const totalHours = parseFloat(data.formulaAnnualTotalManHours) || 1;
  return ((lti / totalHours) * 1000000).toFixed(2);
}

/**
 * Calculate Severity Rate
 * Formula: (Loss of Working Days / Total Man-hours worked per year) × 1,000,000
 */
function calculateSeverityRate(data: ManhoursReportData): string {
  const workdaysLost = parseFloat(data.formulaWorkdaysLost) || 0;
  const totalHours = parseFloat(data.formulaAnnualTotalManHours) || 1;
  return ((workdaysLost / totalHours) * 1000000).toFixed(2);
}
