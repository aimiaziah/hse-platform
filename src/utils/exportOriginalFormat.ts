// Export Inspection in Original Format (Excel/PDF)
// This utility exports each inspection type in its original submission format

import { storage } from './storage';
import { downloadFirstAidExcel } from './firstAidExcelExport';
import { downloadManhoursExcel } from './manhoursExcelExport';
import { downloadHSEInspectionChecklistWithTemplate } from './hseChecklistExport';
import { downloadFireExtinguisherReport } from './templateExport';
import { downloadHSEObservationForm } from './hseObservationExport';

type InspectionType = 'hse' | 'fire_extinguisher' | 'first_aid' | 'hse_observation' | 'manhours';

/**
 * Export inspection in its original format
 */
export async function exportInspectionOriginalFormat(
  inspectionId: string,
  type: InspectionType,
): Promise<void> {
  try {
    // First try to fetch from database
    let inspectionData: any = null;

    try {
      const response = await fetch(`/api/inspections/${inspectionId}`);
      if (response.ok) {
        const result = await response.json();
        inspectionData = result.inspection;
      }
    } catch (error) {
      console.log('Database fetch failed, trying localStorage:', error);
    }

    // If not found in database, try localStorage
    if (!inspectionData) {
      inspectionData = await getInspectionFromLocalStorage(inspectionId, type);
    }

    if (!inspectionData) {
      throw new Error('Inspection not found');
    }

    // Export based on type
    switch (type) {
      case 'first_aid':
        await exportFirstAid(inspectionData);
        break;

      case 'manhours':
        await exportManhours(inspectionData);
        break;

      case 'hse':
        await exportHSEInspection(inspectionData);
        break;

      case 'fire_extinguisher':
        await exportFireExtinguisher(inspectionData);
        break;

      case 'hse_observation':
        await exportHSEObservation(inspectionData);
        break;

      default:
        throw new Error(`Unsupported inspection type: ${type}`);
    }
  } catch (error) {
    console.error('Error exporting inspection:', error);
    alert(
      `Failed to export inspection: ${error instanceof Error ? error.message : 'Unknown error'}`,
    );
  }
}

/**
 * Get inspection from localStorage
 */
async function getInspectionFromLocalStorage(
  inspectionId: string,
  type: InspectionType,
): Promise<any | null> {
  const storageKeys: Record<InspectionType, string> = {
    hse: 'hse_inspections',
    fire_extinguisher: 'fire_extinguisher_inspections',
    first_aid: 'first_aid_inspections',
    hse_observation: 'hse_observations',
    manhours: 'manhours_reports',
  };

  const storageKey = storageKeys[type];
  const inspections = storage.load<any[]>(storageKey, []);
  return inspections.find((i: any) => i.id === inspectionId) || null;
}

/**
 * Export First Aid inspection to Excel
 */
async function exportFirstAid(data: any): Promise<void> {
  // Transform database format to Excel export format
  const formData = data.form_data || data;

  const excelData = {
    inspectedBy: formData.inspectedBy || data.inspected_by || '',
    designation: formData.designation || '',
    inspectionDate: formData.inspectionDate || data.inspection_date || '',
    signature: formData.signature || '',
    kits: formData.kits || [],
  };

  await downloadFirstAidExcel(excelData);
}

/**
 * Export Manhours report to Excel
 */
async function exportManhours(data: any): Promise<void> {
  // Transform database format to Excel export format
  const formData = data.form_data || data;

  const excelData = {
    id: data.id,
    preparedBy: formData.preparedBy || data.inspected_by || '',
    preparedDate: formData.preparedDate || '',
    reviewedBy: formData.reviewedBy || '',
    reviewedDate: formData.reviewedDate || '',
    reportMonth: formData.reportMonth || data.inspection_date?.split('-')[1] || '',
    reportYear: formData.reportYear || data.inspection_date?.split('-')[0] || '',
    numEmployees: formData.numEmployees || '',
    monthlyManHours: formData.monthlyManHours || '',
    yearToDateManHours: formData.yearToDateManHours || '',
    totalAccumulatedManHours: formData.totalAccumulatedManHours || '',
    annualTotalManHours: formData.annualTotalManHours || '',
    workdaysLost: formData.workdaysLost || '',
    ltiCases: formData.ltiCases || '',
    noLTICases: formData.noLTICases || '',
    nearMissAccidents: formData.nearMissAccidents || '',
    dangerousOccurrences: formData.dangerousOccurrences || '',
    occupationalDiseases: formData.occupationalDiseases || '',
    formulaLtiCases: formData.formulaLtiCases || '',
    formulaAnnualAvgEmployees: formData.formulaAnnualAvgEmployees || '',
    formulaAnnualTotalManHours: formData.formulaAnnualTotalManHours || '',
    formulaWorkdaysLost: formData.formulaWorkdaysLost || '',
    projectName: formData.projectName || '',
    monthlyData: formData.monthlyData || [],
    status: data.status || 'completed',
    createdAt: data.created_at || '',
    remarks: formData.remarks || '',
  };

  await downloadManhoursExcel(excelData);
}

/**
 * Export HSE Inspection to Excel
 */
async function exportHSEInspection(data: any): Promise<void> {
  // Transform database format to Excel export format
  const formData = data.form_data || data;

  const excelData = {
    contractor: formData.contractor || '',
    location: formData.location || '',
    date: formData.date || data.inspection_date || '',
    inspectedBy: formData.inspectedBy || data.inspected_by || '',
    workActivity: formData.workActivity || '',
    inspectionItems: formData.items || formData.inspectionItems || [],
    tablePersons: formData.tablePersons || [],
    observations: formData.observations || [],
    totalObservations: (formData.observations || []).length,
    commentsRemarks: formData.commentsRemarks || '',
  };

  await downloadHSEInspectionChecklistWithTemplate(excelData, 'excel');
}

/**
 * Export Fire Extinguisher inspection to Excel
 */
async function exportFireExtinguisher(data: any): Promise<void> {
  // Transform database format to Excel export format
  const formData = data.form_data || data;

  const excelData = {
    inspectedBy: formData.inspectedBy || data.inspected_by || '',
    inspectionDate: formData.inspectionDate || data.inspection_date || '',
    designation: formData.designation || '',
    signature: formData.signature || '',
    extinguishers: formData.items || formData.extinguishers || [],
  };

  await downloadFireExtinguisherReport(excelData);
}

/**
 * Export HSE Observation to PDF
 */
async function exportHSEObservation(data: any): Promise<void> {
  // Transform database format to PDF export format
  const formData = data.form_data || data;

  const pdfData = {
    contractor: formData.contractor || '',
    location: formData.location || '',
    date: formData.date || data.inspection_date || '',
    inspectedBy: formData.observedBy || data.inspected_by || '',
    workActivity: formData.workActivity || '',
    observations: [
      {
        id: data.id,
        itemNo: formData.itemNo || '1',
        categoryId: formData.categoryId || 0,
        categoryName: formData.categoryName || '',
        itemName: formData.itemName || '',
        photos: formData.photos || [],
        observation: formData.observation || '',
        location: formData.location || '',
        actionNeeded: formData.actionNeeded || '',
        time: formData.time || '',
        date: formData.date || data.inspection_date || '',
        status: formData.status || '',
        hazards: formData.hazards || '',
        remarks: formData.remarks || '',
      },
    ],
  };

  await downloadHSEObservationForm(pdfData);
}
