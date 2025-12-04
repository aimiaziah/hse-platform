// src/utils/googleDrive.ts - Google Drive Integration
import { storage } from './storage';
// Note: xlsx dependency removed - use exceljs for Excel generation

interface GoogleDriveConfig {
  clientId: string;
  apiKey: string;
  folderId?: string;
}

// Google Drive API configuration
// Note: Replace these with your actual Google API credentials
const GOOGLE_CONFIG: GoogleDriveConfig = {
  clientId: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '',
  apiKey: process.env.NEXT_PUBLIC_GOOGLE_API_KEY || '',
  folderId: process.env.NEXT_PUBLIC_GOOGLE_DRIVE_FOLDER_ID || '',
};

const DISCOVERY_DOC = 'https://www.googleapis.com/discovery/v1/apis/drive/v3/rest';
const SCOPES = 'https://www.googleapis.com/auth/drive.file';

// Initialize Google API client
let gapiInited = false;
let gisInited = false;
let tokenClient: any;

/**
 * Initialize Google API
 */
export const initializeGoogleAPI = (): Promise<void> => {
  return new Promise((resolve, reject) => {
    // Check if running in browser
    if (typeof window === 'undefined') {
      reject(new Error('Google API can only be initialized in browser'));
      return;
    }

    // Check if credentials are configured
    if (!GOOGLE_CONFIG.apiKey || !GOOGLE_CONFIG.clientId) {
      reject(new Error('Google Drive credentials not configured'));
      return;
    }

    // Load the Google API script
    const script = document.createElement('script');
    script.src = 'https://apis.google.com/js/api.js';
    script.onload = () => {
      (window as any).gapi.load('client', async () => {
        try {
          await (window as any).gapi.client.init({
            apiKey: GOOGLE_CONFIG.apiKey,
            discoveryDocs: [DISCOVERY_DOC],
          });
          gapiInited = true;
          maybeEnableButtons();
          resolve();
        } catch (error) {
          // Provide more helpful error messages
          const errorMsg = error instanceof Error ? error.message : String(error);
          if (errorMsg.includes('discovery') || errorMsg.includes('required fields')) {
            reject(new Error('Google Drive API not enabled. Please enable it in Google Cloud Console'));
          } else if (errorMsg.includes('API key')) {
            reject(new Error('Invalid Google Drive API key'));
          } else {
            reject(new Error(`Google API initialization failed: ${errorMsg}`));
          }
        }
      });
    };
    script.onerror = () => reject(new Error('Failed to load Google API script'));
    document.body.appendChild(script);

    // Load Google Identity Services
    const gisScript = document.createElement('script');
    gisScript.src = 'https://accounts.google.com/gsi/client';
    gisScript.onload = () => {
      try {
        tokenClient = (window as any).google.accounts.oauth2.initTokenClient({
          client_id: GOOGLE_CONFIG.clientId,
          scope: SCOPES,
          callback: '', // defined later
        });
        gisInited = true;
        maybeEnableButtons();
      } catch (error) {
        reject(new Error('Invalid Google OAuth client ID'));
      }
    };
    gisScript.onerror = () => reject(new Error('Failed to load Google Identity Services'));
    document.body.appendChild(gisScript);
  });
};

function maybeEnableButtons() {
  // Both APIs are ready
  if (gapiInited && gisInited) {
    console.log('Google APIs initialized successfully');
  }
}

/**
 * Request access token for Google Drive
 */
const getAccessToken = (): Promise<string> => {
  return new Promise((resolve, reject) => {
    // Check if we have a cached token
    const cachedToken = storage.load('google_access_token', null);
    const tokenExpiry = storage.load('google_token_expiry', 0);

    if (cachedToken && Date.now() < tokenExpiry) {
      resolve(cachedToken);
      return;
    }

    // Request new token
    tokenClient.callback = async (resp: any) => {
      if (resp.error !== undefined) {
        reject(resp);
        return;
      }
      // Cache the token
      storage.save('google_access_token', resp.access_token);
      storage.save('google_token_expiry', Date.now() + 3600 * 1000); // 1 hour
      resolve(resp.access_token);
    };

    if ((window as any).gapi.client.getToken() === null) {
      tokenClient.requestAccessToken({ prompt: 'consent' });
    } else {
      tokenClient.requestAccessToken({ prompt: '' });
    }
  });
};

/**
 * Generate Excel report from inspection data using API endpoints
 */
const generateExcelViaAPI = async (inspection: any): Promise<Blob> => {
  let apiEndpoint = '';
  let requestBody: any = {};
  const inspDate = inspection.inspectionDate || inspection.date || '';

  if (inspection.type === 'fire_extinguisher') {
    apiEndpoint = '/api/export/fire-extinguisher-template';
    requestBody = {
      inspectedBy: inspection.inspectedBy || inspection.inspector,
      inspectionDate: inspDate,
      designation: inspection.designation,
      signature: inspection.signature,
      extinguishers: inspection.extinguishers || [],
      reviewedBy: inspection.reviewedBy,
      reviewedAt: inspection.reviewedAt,
      reviewerSignature: inspection.reviewerSignature,
      format: 'excel',
    };
  } else if (inspection.type === 'first_aid') {
    apiEndpoint = '/api/export/first-aid-template';
    requestBody = {
      inspectedBy: inspection.inspectedBy || inspection.inspector,
      inspectionDate: inspDate,
      designation: inspection.designation,
      signature: inspection.signature,
      kits: inspection.kitInspections || inspection.kits || [],
      reviewedBy: inspection.reviewedBy,
      reviewedAt: inspection.reviewedAt,
      reviewerSignature: inspection.reviewerSignature,
      format: 'excel',
    };
  } else if (inspection.type === 'hse') {
    apiEndpoint = '/api/export/hse-inspection-template';
    requestBody = {
      contractor: inspection.company || inspection.formData?.contractor || '',
      location: inspection.location || inspection.formData?.location || '',
      date: inspDate,
      inspectedBy: inspection.inspectedBy || inspection.inspector,
      workActivity: inspection.formData?.workActivity || '',
      tablePersons: inspection.formData?.tablePersons || [],
      inspectionItems: inspection.items || inspection.formData?.inspectionItems || [],
      commentsRemarks: inspection.formData?.commentsRemarks || '',
      observations: inspection.observations || inspection.formData?.observations || [],
      reviewedBy: inspection.reviewedBy,
      reviewedAt: inspection.reviewedAt,
      reviewerSignature: inspection.reviewerSignature,
      format: 'excel',
    };
  } else if (inspection.type === 'hse_observation') {
    apiEndpoint = '/api/export/hse-observation-template';
    requestBody = {
      contractor: inspection.company || inspection.formData?.contractor || '',
      location: inspection.location || inspection.formData?.location || '',
      date: inspDate,
      inspectedBy: inspection.inspectedBy || inspection.inspector,
      workActivity: inspection.formData?.workActivity || '',
      observations: inspection.observations || [inspection.formData] || [],
      reviewedBy: inspection.reviewedBy,
      reviewedAt: inspection.reviewedAt,
      reviewerSignature: inspection.reviewerSignature,
      format: 'excel',
    };
  } else if (inspection.type === 'manhours') {
    apiEndpoint = '/api/export/manhours-template';
    requestBody = {
      ...inspection.formData,
      preparedBy: inspection.inspectedBy || inspection.inspector,
      preparedDate: inspDate,
      reviewedBy: inspection.reviewedBy,
      reviewedDate: inspection.reviewedAt,
      format: 'excel',
    };
  } else {
    // Fallback for unknown types - use the old method
    return generateExcelFallback(inspection);
  }

  // Call API endpoint to generate the Excel file
  console.log(`Generating Excel via API: ${apiEndpoint}`);
  const response = await fetch(apiEndpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include', // Include auth cookies
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Excel generation failed:', {
      status: response.status,
      statusText: response.statusText,
      error: errorText,
    });
    throw new Error(`Failed to generate Excel for ${inspection.type}: ${response.status} ${response.statusText}`);
  }

  console.log('Excel generated successfully, creating blob...');
  const arrayBuffer = await response.arrayBuffer();
  console.log(`Excel blob size: ${(arrayBuffer.byteLength / 1024).toFixed(2)} KB`);
  return new Blob([arrayBuffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  });
};

/**
 * Fallback Excel generation for types without API endpoints
 */
const generateExcelFallback = async (inspection: any): Promise<Blob> => {
  // DEPRECATED: XLSX library removed for security reasons
  // Use template-based exports via API endpoints instead
  throw new Error('Direct XLSX generation is deprecated. Use template-based API exports instead.');
};

/**
 * Upload file to Google Drive
 */
const uploadToGoogleDrive = async (
  file: Blob,
  filename: string,
  mimeType: string,
): Promise<string> => {
  const metadata = {
    name: filename,
    mimeType: mimeType,
    parents: GOOGLE_CONFIG.folderId ? [GOOGLE_CONFIG.folderId] : [],
  };

  const formData = new FormData();
  formData.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
  formData.append('file', file);

  const response = await fetch(
    'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart',
    {
      method: 'POST',
      headers: new Headers({
        Authorization: `Bearer ${await getAccessToken()}`,
      }),
      body: formData,
    },
  );

  const result = await response.json();

  if (result.error) {
    throw new Error(result.error.message);
  }

  return result.id;
};

/**
 * Main export function - Export inspection to Google Drive as Excel
 */
export const exportToGoogleDrive = async (inspection: any): Promise<string> => {
  try {
    // Initialize Google API if not already done
    if (!gapiInited || !gisInited) {
      await initializeGoogleAPI();
    }

    // Generate Excel report using API endpoints (supports all inspection types)
    const excelBlob = await generateExcelViaAPI(inspection);

    // Generate filename with type name
    const timestamp = new Date().toISOString().split('T')[0];
    const typeNames: { [key: string]: string } = {
      'fire_extinguisher': 'Fire-Extinguisher',
      'first_aid': 'First-Aid',
      'hse': 'HSE-Inspection',
      'hse_observation': 'HSE-Observation',
      'manhours': 'Manhours-Report'
    };
    const typeName = typeNames[inspection.type] || inspection.type.replace('_', '-');
    const reviewedSuffix = inspection.reviewedBy ? '-Approved' : '';
    const filename = `${typeName}${reviewedSuffix}-${timestamp}.xlsx`;

    // Upload to Google Drive
    const fileId = await uploadToGoogleDrive(
      excelBlob,
      filename,
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );

    console.log('Excel file uploaded to Google Drive:', fileId);

    // Store export record (limit to last 50 to avoid quota issues)
    const exportRecords: any[] = storage.load('google_drive_exports', []);
    exportRecords.push({
      inspectionId: inspection.id,
      inspectionType: inspection.type,
      fileId,
      filename,
      exportedAt: new Date().toISOString(),
      exportedBy: inspection.reviewedBy,
      format: 'xlsx',
    });
    // Keep only last 50 records to prevent localStorage quota issues
    const limitedRecords = exportRecords.slice(-50);
    storage.save('google_drive_exports', limitedRecords);

    return fileId;
  } catch (error) {
    console.error('Error exporting to Google Drive:', error);

    // Log failed export (metadata only - no full inspection to avoid quota issues)
    try {
      const backupExports: any[] = storage.load('backup_exports', []);
      backupExports.push({
        inspectionId: inspection.id,
        inspectionType: inspection.type,
        inspectedBy: inspection.inspectedBy || inspection.formData?.inspectedBy,
        exportedAt: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      // Keep only last 20 failed exports to prevent quota issues
      const limitedBackups = backupExports.slice(-20);
      storage.save('backup_exports', limitedBackups);
    } catch (storageError) {
      console.warn('Could not save backup export metadata:', storageError);
      // Silently fail - don't let storage errors block the main error
    }

    throw error;
  }
};

/**
 * Get Google Drive file link
 */
export const getGoogleDriveLink = (fileId: string): string => {
  return `https://drive.google.com/file/d/${fileId}/view`;
};

/**
 * Check if Google Drive is configured
 */
export const isGoogleDriveConfigured = (): boolean => {
  return Boolean(GOOGLE_CONFIG.clientId && GOOGLE_CONFIG.apiKey);
};
