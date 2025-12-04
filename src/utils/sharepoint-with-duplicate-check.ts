// Enhanced SharePoint integration with duplicate file handling
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
  existed?: boolean; // NEW: indicates if file already existed
  action?: 'created' | 'overwritten' | 'skipped'; // NEW: what action was taken
}

export type DuplicateHandling = 'overwrite' | 'skip' | 'version' | 'rename';

/**
 * Check if file exists in SharePoint
 */
async function checkFileExists(
  fileName: string,
  folderPath: string,
  config: SharePointConfig,
  accessToken: string,
): Promise<{ exists: boolean; fileId?: string; fileUrl?: string }> {
  try {
    const siteUrlObj = new URL(config.siteUrl);
    const siteName = siteUrlObj.pathname.split('/').filter(Boolean).pop() || '';
    const fullPath = folderPath ? `${folderPath}/${fileName}` : fileName;

    const checkUrl = `https://graph.microsoft.com/v1.0/sites/${siteName}/drive/root:/${config.libraryName}/${fullPath}`;

    const response = await fetch(checkUrl, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (response.ok) {
      const fileData = await response.json();
      return {
        exists: true,
        fileId: fileData.id,
        fileUrl: fileData.webUrl,
      };
    }

    return { exists: false };
  } catch (error) {
    return { exists: false };
  }
}

/**
 * Upload a file to SharePoint with duplicate handling
 */
export async function uploadToSharePointWithDuplicateCheck(
  fileName: string,
  fileBuffer: Buffer | Blob,
  folderPath?: string,
  duplicateHandling: DuplicateHandling = 'version', // Default: use SharePoint versioning
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
      console.warn('SharePoint configuration missing. Falling back to Supabase storage.');
      return await uploadToSupabaseStorage(fileName, fileBuffer, folderPath);
    }

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
      throw new Error('Failed to get SharePoint access token');
    }

    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.access_token;

    // Check if file exists
    const fileCheck = await checkFileExists(fileName, folderPath || '', config, accessToken);

    // Handle based on duplicate strategy
    if (fileCheck.exists) {
      console.log(`📄 File exists: ${fileName}`);

      switch (duplicateHandling) {
        case 'skip':
          console.log('⏭️ Skipping upload (file already exists)');
          return {
            success: true,
            fileUrl: fileCheck.fileUrl,
            fileId: fileCheck.fileId,
            existed: true,
            action: 'skipped',
          };

        case 'rename':
          // Add timestamp to filename
          const timestamp = new Date().getTime();
          const extIndex = fileName.lastIndexOf('.');
          const nameWithoutExt = fileName.substring(0, extIndex);
          const ext = fileName.substring(extIndex);
          fileName = `${nameWithoutExt}_${timestamp}${ext}`;
          console.log(`📝 Renaming to: ${fileName}`);
          break;

        case 'overwrite':
          console.log('⚠️ Overwriting existing file');
          break;

        case 'version':
          // Let SharePoint handle versioning (default behavior with PUT)
          console.log('📚 Creating new version in SharePoint');
          break;
      }
    }

    // Upload file
    const siteUrlObj = new URL(config.siteUrl);
    const siteName = siteUrlObj.pathname.split('/').filter(Boolean).pop() || '';
    const fullPath = config.folderPath ? `${config.folderPath}/${fileName}` : fileName;

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
      existed: fileCheck.exists,
      action: fileCheck.exists ? 'overwritten' : 'created',
    };
  } catch (error) {
    console.error('SharePoint upload error:', error);
    // Fallback to Supabase storage
    return await uploadToSupabaseStorage(fileName, fileBuffer, folderPath);
  }
}

/**
 * Fallback: Upload to Supabase storage
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
      action: 'created',
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
 * Upload inspection documents with duplicate handling
 */
export async function uploadInspectionDocumentsWithCheck(
  inspectionId: string,
  inspectionType: 'fire_extinguisher' | 'first_aid' | 'hse' | 'hse_observation' | 'manhours',
  excelBuffer: Buffer,
  pdfBuffer: Buffer,
  inspectionDate: string,
  duplicateHandling: DuplicateHandling = 'version',
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

  // Upload both files with duplicate handling
  const [excelResult, pdfResult] = await Promise.all([
    uploadToSharePointWithDuplicateCheck(excelFileName, excelBuffer, folderPath, duplicateHandling),
    uploadToSharePointWithDuplicateCheck(pdfFileName, pdfBuffer, folderPath, duplicateHandling),
  ]);

  // Log results
  console.log(`📊 Excel upload: ${excelResult.action} - ${excelResult.fileUrl}`);
  console.log(`📄 PDF upload: ${pdfResult.action} - ${pdfResult.fileUrl}`);

  return {
    excel: excelResult,
    pdf: pdfResult,
  };
}
