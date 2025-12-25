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

/**
 * Interface for SharePoint inspection metadata
 * Used for uploading inspections with rich metadata columns
 */
export interface SharePointInspectionMetadata {
  excelFileBase64: string;
  fileName: string;
  inspectionNumber: string;
  inspectionType: string;
  inspectorName: string;
  submissionDate: string;
  status: string;
  reviewerName?: string | null;
  reviewDate?: string | null;
  reviewComments?: string | null;
  inspectionId: string;
  inspectionDate: string;
}

/**
 * Interface for SharePoint upload response
 */
export interface SharePointUploadResponse {
  success: boolean;
  message: string;
  fileId: string;
  fileUrl: string;
}

/**
 * Interface for SharePoint metadata update params
 */
export interface SharePointMetadataUpdateParams {
  fileId: string;
  status: string;
  reviewerName: string;
  reviewDate: string;
  reviewComments: string | null;
}

/**
 * Upload inspection to SharePoint with metadata
 * This is the main function for exporting inspections to SharePoint
 * Uses direct OAuth integration (no Power Automate needed)
 *
 * @param inspection - Inspection data from database
 * @param excelBlob - Excel file as Blob
 * @returns Promise with fileId and fileUrl
 */
export async function uploadInspectionToSharePoint(
  inspection: any,
  excelBlob: Blob,
): Promise<{ fileId: string; fileUrl: string }> {
  try {
    // Import server-side SharePoint utility
    const { uploadFileToSharePoint } = await import('@/utils/sharepoint-server');

    // Generate filename
    const fileName =
      generateFileName(
        inspection.inspection_type,
        inspection.inspection_date,
        inspection.inspection_number,
      ) + '.xlsx';

    // Format inspection type for SharePoint (e.g., fire_extinguisher -> Fire Extinguisher)
    const formattedType = inspection.inspection_type
      .split('_')
      .map((word: string) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');

    // Determine folder path based on inspection type and date
    const date = new Date(inspection.inspection_date);
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
    const year = date.getFullYear();
    const month = monthNames[date.getMonth()];

    // Folder structure: {InspectionType}/{Year}/{Month}
    const typeFolder = inspection.inspection_type
      .split('_')
      .map((word: string) => word.charAt(0).toUpperCase() + word.slice(1))
      .join('_');

    const folderPath = `${typeFolder}/${year}/${month}`;

    // Prepare metadata for SharePoint columns (ultra-simplified - just 1 Status column!)
    const submissionDate = new Date(inspection.submitted_at || new Date());
    const formattedDate = submissionDate.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

    // Put everything in Status column
    const statusText = `${formattedType} - ${inspection.inspection_number}\nSubmitted by ${inspection.inspected_by} on ${formattedDate}`;

    const metadata = {
      Status: statusText,
    };

    console.log(`📤 Uploading ${formattedType} to SharePoint via OAuth...`);

    // Upload to SharePoint using OAuth
    const result = await uploadFileToSharePoint(excelBlob, fileName, folderPath, metadata);

    console.log(`✅ SharePoint upload successful: ${result.webUrl}`);

    return {
      fileId: result.itemId,
      fileUrl: result.webUrl,
    };
  } catch (error) {
    console.error('SharePoint upload error:', error);
    throw error;
  }
}

/**
 * Update SharePoint metadata when inspection status changes
 * Called when supervisor approves or rejects an inspection
 * Uses direct OAuth integration (no Power Automate needed)
 *
 * @param params - Update parameters (fileId, status, reviewer info)
 */
export async function updateSharePointMetadata(
  params: SharePointMetadataUpdateParams,
): Promise<void> {
  try {
    // Import server-side SharePoint utility
    const { updateMetadataByItemId } = await import('@/utils/sharepoint-server');

    console.log(`📝 Updating SharePoint metadata for file ${params.fileId}...`);

    // Format review date
    const reviewDate = new Date(params.reviewDate);
    const formattedReviewDate = reviewDate.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

    // Build status text - append to existing status (keeps submission info)
    let statusText = `${params.status} on ${formattedReviewDate}`;

    if (params.reviewComments) {
      statusText += `\nComments: ${params.reviewComments}`;
    }

    // Note: This will REPLACE the status, not append
    // If you want to keep submission info, we'd need to read current status first
    // For now, keeping it simple - just show the review status
    const metadata: Record<string, any> = {
      Status: statusText,
    };

    // Update metadata in SharePoint
    await updateMetadataByItemId(params.fileId, metadata);

    console.log(`✅ SharePoint metadata updated successfully`);
  } catch (error) {
    console.error('SharePoint metadata update error:', error);
    throw error;
  }
}

/**
 * Format status with user name for SharePoint
 * Converts app status + user name to human-readable format
 *
 * @param status - Inspection status from database
 * @param userName - Name of the user (inspector or reviewer)
 * @returns Formatted status string
 */
export function formatStatusForSharePoint(
  status: 'pending_review' | 'approved' | 'rejected' | string,
  userName: string,
): string {
  switch (status) {
    case 'pending_review':
      return `Submitted by ${userName}`;
    case 'approved':
      return `Approved by ${userName}`;
    case 'rejected':
      return `Rejected by ${userName}`;
    case 'draft':
      return 'Draft';
    case 'completed':
      return `Completed by ${userName}`;
    default:
      return status;
  }
}

/**
 * Generate filename for SharePoint upload
 * Format: InspectionType_Month_Year_InspectionNumber
 *
 * @param inspectionType - Type of inspection
 * @param inspectionDate - Date of inspection
 * @param inspectionNumber - Unique inspection number
 * @returns Formatted filename without extension
 */
function generateFileName(
  inspectionType: string,
  inspectionDate: string,
  inspectionNumber: string,
): string {
  const date = new Date(inspectionDate);
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

  // Format inspection type: fire_extinguisher -> Fire_Extinguisher
  const typePrefix = inspectionType
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join('_');

  return `${typePrefix}_${monthYear}_${inspectionNumber}`;
}
