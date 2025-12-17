// Power Automate Integration for SharePoint Export
// This replaces the OAuth popup approach with a simple webhook

interface PowerAutomateUploadData {
  inspectionId: string;
  inspectionType: string;
  inspectionDate: string;
  inspectedBy: string;
  reviewedBy: string;
  excelFileBase64: string;
  pdfFileBase64: string;
  fileName: string;
}

interface PowerAutomateResponse {
  success: boolean;
  message: string;
  excelUrl?: string;
  pdfUrl?: string;
}

/**
 * Upload inspection files to SharePoint via Power Automate webhook
 * No user authentication needed - works automatically in background
 */
interface InspectionData {
  id: string;
  type: string;
  inspectionDate?: string;
  inspectedBy?: string;
  reviewedBy?: string;
}

export const uploadToSharePointViaPowerAutomate = async (
  excelBlob: Blob,
  pdfBlob: Blob,
  inspection: InspectionData,
): Promise<PowerAutomateResponse> => {
  try {
    // Get Power Automate webhook URL from environment
    const webhookUrl = process.env.NEXT_PUBLIC_POWER_AUTOMATE_WEBHOOK_URL;

    if (!webhookUrl) {
      throw new Error(
        'Power Automate webhook URL not configured. Please set NEXT_PUBLIC_POWER_AUTOMATE_WEBHOOK_URL in .env.local',
      );
    }

    // Convert blobs to base64
    const excelBase64 = await blobToBase64(excelBlob);
    const pdfBase64 = await blobToBase64(pdfBlob);

    // Generate filename
    const date = new Date(inspection.inspectionDate || Date.now());
    const monthNames = [
      'January',
      'February',
      'March',
      'April',
      'May',
      'June',
      'July',
      'August',
      'September',
      'October',
      'November',
      'December',
    ];
    const monthYear = `${monthNames[date.getMonth()]}_${date.getFullYear()}`;
    const typePrefix = inspection.type
      .replace('_', ' ')
      .replace(/\b\w/g, (letter: string) => letter.toUpperCase())
      .replace(/ /g, '_');
    const fileName = `${typePrefix}_${monthYear}_${inspection.id}`;

    // Prepare webhook payload
    const payload: PowerAutomateUploadData = {
      inspectionId: inspection.id,
      inspectionType: inspection.type,
      inspectionDate: inspection.inspectionDate || new Date().toISOString(),
      inspectedBy: inspection.inspectedBy || '',
      reviewedBy: inspection.reviewedBy || '',
      excelFileBase64: excelBase64.split(',')[1], // Remove data:application/...;base64, prefix
      pdfFileBase64: pdfBase64.split(',')[1], // Remove data:application/...;base64, prefix
      fileName,
    };

    // Sending files to Power Automate webhook

    // Send to Power Automate
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Power Automate webhook failed: ${response.status} ${errorText}`);
    }

    const result: PowerAutomateResponse = await response.json();

    // Files uploaded to SharePoint via Power Automate

    return result;
  } catch (error) {
    // Error uploading to SharePoint via Power Automate
    throw error;
  }
};

/**
 * Convert Blob to base64 string
 */
const blobToBase64 = (blob: Blob): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
      } else {
        reject(new Error('Failed to convert blob to base64'));
      }
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
};

/**
 * Check if Power Automate integration is configured
 */
export const isPowerAutomateConfigured = (): boolean => {
  return Boolean(process.env.NEXT_PUBLIC_POWER_AUTOMATE_WEBHOOK_URL);
};
