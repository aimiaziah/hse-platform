// SharePoint integration utility for uploading inspection documents
import { getServiceSupabase } from '@/lib/supabase';

export interface SharePointConfig {
  siteUrl: string;
  clientId: string;
  clientSecret: string;
  tenantId: string;
  libraryName: string;
  folderPath?: string;
}

export interface UploadResult {
  success: boolean;
  fileUrl?: string;
  fileId?: string;
  error?: string;
}

/**
 * Upload a file to SharePoint document library
 * @param fileName - Name of the file to upload
 * @param fileBuffer - File content as Buffer or Blob
 * @param folderPath - Optional subfolder path within the library
 * @returns Upload result with file URL and ID
 */
export async function uploadToSharePoint(
  fileName: string,
  fileBuffer: Buffer | Blob,
  folderPath?: string,
): Promise<UploadResult> {
  try {
    // Get SharePoint configuration from environment variables
    const config: SharePointConfig = {
      siteUrl: process.env.NEXT_PUBLIC_SHAREPOINT_SITE_URL || '',
      clientId: process.env.SHAREPOINT_CLIENT_ID || '',
      clientSecret: process.env.SHAREPOINT_CLIENT_SECRET || '',
      tenantId: process.env.SHAREPOINT_TENANT_ID || '',
      libraryName: process.env.SHAREPOINT_LIBRARY_NAME || 'Inspection Reports',
      folderPath: folderPath || process.env.SHAREPOINT_FOLDER_PATH || 'Fire Extinguisher',
    };

    // Validate configuration
    if (!config.siteUrl || !config.clientId || !config.clientSecret || !config.tenantId) {
      console.warn('SharePoint configuration missing. Falling back to local storage.');

      // Fallback: Store in Supabase storage instead
      return await uploadToSupabaseStorage(fileName, fileBuffer, folderPath);
    }

    // Get access token from Microsoft Graph API
    const tokenResponse = await fetch(
      `https://login.microsoftonline.com/${config.tenantId}/oauth2/v2.0/token`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          client_id: config.clientId,
          client_secret: config.clientSecret,
          scope: 'https://graph.microsoft.com/.default',
          grant_type: 'client_credentials',
        }),
      },
    );

    if (!tokenResponse.ok) {
      throw new Error('Failed to get SharePoint access token');
    }

    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.access_token;

    // Extract site name from URL
    const siteUrlObj = new URL(config.siteUrl);
    const siteName = siteUrlObj.pathname.split('/').filter(Boolean).pop() || '';

    // Prepare file path
    const fullPath = config.folderPath ? `${config.folderPath}/${fileName}` : fileName;

    // Upload file to SharePoint using Microsoft Graph API
    const uploadUrl = `https://graph.microsoft.com/v1.0/sites/${siteName}/drive/root:/${config.libraryName}/${fullPath}:/content`;

    const uploadResponse = await fetch(uploadUrl, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/octet-stream',
      },
      body: fileBuffer,
    });

    if (!uploadResponse.ok) {
      const errorData = await uploadResponse.json();
      throw new Error(`SharePoint upload failed: ${errorData.error?.message || 'Unknown error'}`);
    }

    const uploadData = await uploadResponse.json();

    return {
      success: true,
      fileUrl: uploadData.webUrl,
      fileId: uploadData.id,
    };
  } catch (error) {
    console.error('SharePoint upload error:', error);

    // Fallback to Supabase storage
    return uploadToSupabaseStorage(fileName, fileBuffer, folderPath);
  }
}

/**
 * Fallback: Upload to Supabase storage if SharePoint is unavailable
 */
async function uploadToSupabaseStorage(
  fileName: string,
  fileBuffer: Buffer | Blob,
  folderPath?: string,
): Promise<UploadResult> {
  try {
    const supabase = getServiceSupabase();
    const fullPath = folderPath ? `${folderPath}/${fileName}` : fileName;

    const { data, error } = await supabase.storage
      .from('inspection-reports')
      .upload(fullPath, fileBuffer, {
        contentType: fileName.endsWith('.xlsx')
          ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
          : 'application/pdf',
        upsert: true,
      });

    if (error) {
      throw error;
    }

    // Get public URL
    const { data: urlData } = supabase.storage.from('inspection-reports').getPublicUrl(fullPath);

    return {
      success: true,
      fileUrl: urlData.publicUrl,
      fileId: data.path,
    };
  } catch (error) {
    console.error('Supabase storage fallback error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Upload failed',
    };
  }
}

/**
 * Upload both Excel and PDF versions of an inspection report to SharePoint
 */
export async function uploadInspectionDocuments(
  inspectionId: string,
  inspectionType: 'fire_extinguisher' | 'first_aid' | 'hse' | 'hse_observation' | 'manhours',
  excelBuffer: Buffer,
  pdfBuffer: Buffer,
  inspectionDate: string,
): Promise<{ excel: UploadResult; pdf: UploadResult }> {
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

  // Determine folder structure and file naming
  let folderPath = '';
  let filePrefix = '';

  switch (inspectionType) {
    case 'fire_extinguisher':
      folderPath = 'Fire_Extinguisher';
      filePrefix = 'Fire_Extinguisher_Checklist';
      break;
    case 'first_aid':
      folderPath = 'First_Aid';
      filePrefix = 'First_Aid_Checklist';
      break;
    case 'hse':
      folderPath = 'HSE_Inspection';
      filePrefix = 'HSE_Inspection';
      break;
    case 'hse_observation':
      folderPath = 'HSE_Observation';
      filePrefix = 'HSE_Observation';
      break;
    case 'manhours':
      folderPath = 'Manhours_Reports';
      filePrefix = 'Manhours_Report';
      break;
  }

  folderPath = `${folderPath}/${date.getFullYear()}/${monthNames[date.getMonth()]}`;

  const excelFileName = `${filePrefix}_${monthYear}_${inspectionId}.xlsx`;
  const pdfFileName = `${filePrefix}_${monthYear}_${inspectionId}.pdf`;

  // Upload both files
  const [excelResult, pdfResult] = await Promise.all([
    uploadToSharePoint(excelFileName, excelBuffer, folderPath),
    uploadToSharePoint(pdfFileName, pdfBuffer, folderPath),
  ]);

  return {
    excel: excelResult,
    pdf: pdfResult,
  };
}

/**
 * Create a shared link for a SharePoint file
 */
export async function createSharePointShareLink(
  fileId: string,
  config: SharePointConfig,
): Promise<string | null> {
  try {
    // Get access token
    const tokenResponse = await fetch(
      `https://login.microsoftonline.com/${config.tenantId}/oauth2/v2.0/token`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          client_id: config.clientId,
          client_secret: config.clientSecret,
          scope: 'https://graph.microsoft.com/.default',
          grant_type: 'client_credentials',
        }),
      },
    );

    if (!tokenResponse.ok) {
      throw new Error('Failed to get access token');
    }

    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.access_token;

    // Create sharing link
    const shareResponse = await fetch(
      `https://graph.microsoft.com/v1.0/drives/${fileId}/createLink`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: 'view',
          scope: 'organization',
        }),
      },
    );

    if (!shareResponse.ok) {
      throw new Error('Failed to create share link');
    }

    const shareData = await shareResponse.json();
    return shareData.link.webUrl;
  } catch (error) {
    console.error('Error creating SharePoint share link:', error);
    return null;
  }
}
