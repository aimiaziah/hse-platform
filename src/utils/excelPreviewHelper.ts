// Helper function to prepare inspection data for Excel preview
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable no-console */
export const prepareExcelPreviewData = (
  inspection: any,
  user?: { name: string; role?: string },
) => {
  const reviewerName = inspection.reviewedBy || user?.name || 'Supervisor';
  const reviewDate = inspection.reviewedAt || new Date().toISOString();
  const reviewerSig = inspection.reviewerSignature || '';
  const inspDate = inspection.inspectionDate || inspection.date || '';

  let previewData: any = {};

  // Map inspection type to preview data format
  if (inspection.type === 'fire_extinguisher') {
    previewData = {
      type: 'fire-extinguisher',
      data: {
        inspectedBy: inspection.inspectedBy || inspection.inspector,
        inspectionDate: inspDate,
        designation: inspection.designation,
        signature: inspection.signature,
        extinguishers: inspection.extinguishers || [],
        reviewedBy: reviewerName,
        reviewedAt: reviewDate,
        reviewerSignature: reviewerSig,
      },
    };
  } else if (inspection.type === 'first_aid') {
    previewData = {
      type: 'first-aid',
      data: {
        inspectedBy: inspection.inspectedBy || inspection.inspector,
        inspectionDate: inspDate,
        designation: inspection.designation,
        signature: inspection.signature,
        kits: inspection.kitInspections || inspection.kits || [],
        reviewedBy: reviewerName,
        reviewedAt: reviewDate,
        reviewerSignature: reviewerSig,
      },
    };
  } else if (inspection.type === 'hse') {
    previewData = {
      type: 'hse-inspection',
      data: {
        contractor: inspection.company || inspection.formData?.contractor || '',
        location: inspection.location || inspection.formData?.location || '',
        date: inspDate,
        inspectedBy: inspection.inspectedBy || inspection.inspector,
        workActivity: inspection.formData?.workActivity || '',
        tablePersons: inspection.formData?.tablePersons || [],
        inspectionItems: inspection.items || inspection.formData?.inspectionItems || [],
        commentsRemarks: inspection.formData?.commentsRemarks || '',
        observations: inspection.observations || inspection.formData?.observations || [],
        reviewedBy: reviewerName,
        reviewedAt: reviewDate,
        reviewerSignature: reviewerSig,
      },
    };
  } else if (inspection.type === 'hse_observation') {
    const obs = inspection.formData || inspection;
    previewData = {
      type: 'hse-observation',
      data: {
        observation: obs.observation || '',
        location: obs.location || inspection.location || '',
        observedBy: inspection.inspectedBy || inspection.inspector || '',
        observedDate: inspDate,
        actionNeeded: obs.actionNeeded || '',
        hazards: obs.hazards || '',
        remarks: obs.remarks || '',
        status: obs.status || 'Open',
        photos: obs.photos || [],
        itemNo: obs.itemNo || '1',
        categoryName: obs.categoryName || 'General',
        itemName: obs.itemName || 'Observation',
        reviewedBy: reviewerName,
        reviewedAt: reviewDate,
        reviewerSignature: reviewerSig,
      },
    };
  } else if (inspection.type === 'manhours') {
    const report = inspection.formData || inspection;
    previewData = {
      type: 'manhours',
      data: {
        preparedBy: inspection.inspectedBy || inspection.inspector || '',
        preparedDate: inspDate,
        reviewedBy: reviewerName,
        reviewedAt: reviewDate,
        reportMonth: report.reportMonth || '',
        reportYear: report.reportYear || new Date().getFullYear().toString(),
        numEmployees: report.numEmployees || '0',
        monthlyManHours: report.monthlyManHours || '0',
        yearToDateManHours: report.yearToDateManHours || '0',
        totalAccumulatedManHours: report.totalAccumulatedManHours || '0',
        annualTotalManHours: report.annualTotalManHours || '0',
        workdaysLost: report.workdaysLost || '0',
        ltiCases: report.ltiCases || '0',
        noLTICases: report.noLTICases || '0',
        nearMissAccidents: report.nearMissAccidents || '0',
        dangerousOccurrences: report.dangerousOccurrences || '0',
        occupationalDiseases: report.occupationalDiseases || '0',
        formulaLtiCases: report.formulaLtiCases || '0',
        formulaAnnualAvgEmployees: report.formulaAnnualAvgEmployees || '0',
        formulaAnnualTotalManHours: report.formulaAnnualTotalManHours || '0',
        formulaWorkdaysLost: report.formulaWorkdaysLost || '0',
        projectName: report.projectName || '',
        monthlyData: report.monthlyData || [],
        remarks: report.remarks || '',
        reviewerSignature: reviewerSig,
      },
    };
  }

  return previewData;
};

export const openExcelPreview = (inspection: any, user?: { name: string; role?: string }) => {
  try {
    const previewData = prepareExcelPreviewData(inspection, user);

    // Store data in sessionStorage for preview page
    sessionStorage.setItem('excelPreviewData', JSON.stringify(previewData));

    // Open preview in same window for better navigation
    window.location.href = '/supervisor/excel-preview';
  } catch (error) {
    console.error('Error preparing Excel preview:', error);
    throw error;
  }
};
