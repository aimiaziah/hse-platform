// SharePoint/OneDrive OAuth Integration (User-delegated permissions)
// Similar to Google Drive OAuth - no admin consent needed!
import { storage } from './storage';

interface SharePointOAuthConfig {
  clientId: string;
  redirectUri: string;
  tenantId?: string; // Optional: defaults to 'common' for any organization
}

// Microsoft Graph API configuration
const SHAREPOINT_CONFIG: SharePointOAuthConfig = {
  clientId: process.env.NEXT_PUBLIC_SHAREPOINT_OAUTH_CLIENT_ID || '',
  redirectUri: typeof window !== 'undefined' ? `${window.location.origin}/sharepoint-callback` : '',
  // Use specific tenant ID for organizational accounts (requires admin consent)
  // Use 'common' for multi-tenant (works with any Microsoft account)
  // Use 'consumers' for personal Microsoft accounts only (no org restrictions)
  tenantId: process.env.NEXT_PUBLIC_SHAREPOINT_TENANT_ID || 'common',
};

// Microsoft Graph API scopes (user-delegated permissions - no admin consent needed)
// Using user-level permissions that can be consented by individual users
const SCOPES = [
  'User.Read', // Basic profile info
  'Files.ReadWrite.All', // Access to files user can access
  'Sites.ReadWrite.All', // Access to SharePoint sites user can access
  'offline_access', // For refresh tokens (optional)
].join(' ');

const AUTHORITY = `https://login.microsoftonline.com/${SHAREPOINT_CONFIG.tenantId}`;
const AUTH_ENDPOINT = `${AUTHORITY}/oauth2/v2.0/authorize`;
const TOKEN_ENDPOINT = `${AUTHORITY}/oauth2/v2.0/token`;

/**
 * Initialize Microsoft Authentication (similar to Google OAuth)
 */
export const initializeSharePointOAuth = async (): Promise<void> => {
  if (typeof window === 'undefined') {
    throw new Error('SharePoint OAuth can only be initialized in browser');
  }

  // Check if we have a cached valid token
  const cachedToken = storage.load('sharepoint_access_token', null);
  const tokenExpiry = storage.load('sharepoint_token_expiry', 0);

  if (cachedToken && Date.now() < tokenExpiry) {
    console.log('✅ SharePoint OAuth already authenticated');
    return;
  }

  console.log('📝 SharePoint OAuth ready - call authenticate when needed');
};

/**
 * Get access token (requests user login if needed)
 */
const getAccessToken = async (): Promise<string> => {
  // Check if we have a cached token
  const cachedToken = storage.load('sharepoint_access_token', null);
  const tokenExpiry = storage.load('sharepoint_token_expiry', 0);

  if (cachedToken && Date.now() < tokenExpiry) {
    return cachedToken;
  }

  // Token expired or not found - need to re-authenticate
  // Note: Implicit flow doesn't provide refresh tokens
  return authenticateUser();
};

/**
 * Authenticate user via OAuth popup (similar to Google)
 */
const authenticateUser = async (): Promise<string> => {
  return new Promise((resolve, reject) => {
    if (!SHAREPOINT_CONFIG.clientId) {
      reject(new Error('SharePoint OAuth Client ID not configured'));
      return;
    }

    // Generate random state for security
    const state = Math.random().toString(36).substring(7);
    storage.save('sharepoint_oauth_state', state);

    // Build authorization URL (using implicit flow for SPA)
    const authParams = new URLSearchParams({
      client_id: SHAREPOINT_CONFIG.clientId,
      response_type: 'token', // Use implicit flow (token directly)
      redirect_uri: SHAREPOINT_CONFIG.redirectUri,
      scope: SCOPES,
      state,
      nonce: Math.random().toString(36).substring(7), // Required for implicit flow
      prompt: 'select_account', // Allow user to select account (admin consent should be pre-granted)
    });

    const authUrl = `${AUTH_ENDPOINT}?${authParams.toString()}`;

    // Open OAuth popup
    const width = 600;
    const height = 700;
    const left = window.screenX + (window.outerWidth - width) / 2;
    const top = window.screenY + (window.outerHeight - height) / 2;

    const popup = window.open(
      authUrl,
      'SharePoint OAuth',
      `width=${width},height=${height},left=${left},top=${top}`,
    );

    if (!popup) {
      reject(new Error('Popup blocked - please allow popups for this site'));
      return;
    }

    // Listen for OAuth callback
    const handleMessage = async (event: MessageEvent) => {
      // Verify origin for security
      if (event.origin !== window.location.origin) {
        return;
      }

      if (event.data.type === 'sharepoint-oauth-callback') {
        window.removeEventListener('message', handleMessage);
        popup.close();

        const {
          access_token,
          state: returnedState,
          error,
          error_description,
          expires_in,
        } = event.data;

        if (error) {
          // Provide helpful error messages for common consent issues
          let errorMessage = `OAuth error: ${error}`;
          if (error_description) {
            errorMessage += ` - ${error_description}`;
          }

          // Check for common admin consent errors
          if (error === 'admin_consent_required' || error_description?.includes('admin consent')) {
            errorMessage =
              'This application requires permissions that need user consent. Please contact your IT administrator or use a different Microsoft account.';
          } else if (error === 'consent_required') {
            errorMessage =
              'You need to grant permissions to this application. Please try again and click "Accept" on the consent screen.';
          } else if (error === 'invalid_grant') {
            errorMessage = 'The authorization was denied or expired. Please try logging in again.';
          }

          reject(new Error(errorMessage));
          return;
        }

        // Verify state matches (CSRF protection)
        const savedState = storage.load('sharepoint_oauth_state', null);
        if (returnedState !== savedState) {
          reject(new Error('Invalid state parameter - possible CSRF attack'));
          return;
        }

        if (!access_token) {
          reject(new Error('No access token received from OAuth'));
          return;
        }

        // Cache token (implicit flow - no refresh token)
        storage.save('sharepoint_access_token', access_token);
        storage.save('sharepoint_token_expiry', Date.now() + (expires_in || 3600) * 1000);

        resolve(access_token);
      }
    };

    window.addEventListener('message', handleMessage);

    // Check if popup was closed without completing auth
    const checkClosed = setInterval(() => {
      if (popup.closed) {
        clearInterval(checkClosed);
        window.removeEventListener('message', handleMessage);
        reject(new Error('Authentication cancelled by user'));
      }
    }, 1000);
  });
};

/**
 * Exchange authorization code for access token
 */
const exchangeCodeForToken = async (code: string): Promise<string> => {
  const tokenParams = new URLSearchParams({
    client_id: SHAREPOINT_CONFIG.clientId,
    code,
    redirect_uri: SHAREPOINT_CONFIG.redirectUri,
    grant_type: 'authorization_code',
    scope: SCOPES,
  });

  const response = await fetch(TOKEN_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: tokenParams.toString(),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Token exchange failed: ${error.error_description || error.error}`);
  }

  const data = await response.json();

  // Cache tokens
  storage.save('sharepoint_access_token', data.access_token);
  storage.save('sharepoint_token_expiry', Date.now() + data.expires_in * 1000);

  if (data.refresh_token) {
    storage.save('sharepoint_refresh_token', data.refresh_token);
  }

  return data.access_token;
};

/**
 * Refresh access token using refresh token
 */
const refreshAccessToken = async (refreshToken: string): Promise<string> => {
  const tokenParams = new URLSearchParams({
    client_id: SHAREPOINT_CONFIG.clientId,
    refresh_token: refreshToken,
    grant_type: 'refresh_token',
    scope: SCOPES,
  });

  const response = await fetch(TOKEN_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: tokenParams.toString(),
  });

  if (!response.ok) {
    throw new Error('Failed to refresh token');
  }

  const data = await response.json();

  // Cache new tokens
  storage.save('sharepoint_access_token', data.access_token);
  storage.save('sharepoint_token_expiry', Date.now() + data.expires_in * 1000);

  if (data.refresh_token) {
    storage.save('sharepoint_refresh_token', data.refresh_token);
  }

  return data.access_token;
};

/**
 * Upload file to SharePoint team site or OneDrive
 */
const uploadToSharePoint = async (
  file: Blob,
  filename: string,
  folderPath?: string,
): Promise<{ id: string; webUrl: string }> => {
  const accessToken = await getAccessToken();

  // Check if SharePoint site URL is configured
  const siteUrl = process.env.NEXT_PUBLIC_SHAREPOINT_SITE_URL;
  const libraryName = process.env.NEXT_PUBLIC_SHAREPOINT_LIBRARY_NAME || 'Shared Documents';

  if (siteUrl) {
    // Upload to SharePoint team site
    try {
      // Extract hostname and site path from URL
      const url = new URL(siteUrl);
      const { hostname } = url;
      const sitePath = url.pathname.split('/').filter(Boolean).slice(0, 2).join('/'); // e.g., "sites/ThetaEdge"

      // Get site ID
      const siteResponse = await fetch(
        `https://graph.microsoft.com/v1.0/sites/${hostname}:/${sitePath}`,
        {
          headers: { Authorization: `Bearer ${accessToken}` },
        },
      );

      if (!siteResponse.ok) {
        throw new Error('Failed to get SharePoint site information');
      }

      const siteData = await siteResponse.json();
      const siteId = siteData.id;

      // Get drive (document library) ID
      const drivesResponse = await fetch(
        `https://graph.microsoft.com/v1.0/sites/${siteId}/drives`,
        {
          headers: { Authorization: `Bearer ${accessToken}` },
        },
      );

      if (!drivesResponse.ok) {
        throw new Error('Failed to get document library');
      }

      const drivesData = await drivesResponse.json();
      const drive = drivesData.value.find((d: any) => d.name === libraryName);

      if (!drive) {
        throw new Error(`Document library "${libraryName}" not found`);
      }

      const driveId = drive.id;

      // Create folder structure if needed
      if (folderPath) {
        await createSharePointFolder(accessToken, siteId, driveId, folderPath);
      }

      // Upload file to SharePoint
      const uploadPath = folderPath
        ? `/sites/${siteId}/drives/${driveId}/root:/${folderPath}/${filename}:/content`
        : `/sites/${siteId}/drives/${driveId}/root:/${filename}:/content`;

      const response = await fetch(`https://graph.microsoft.com/v1.0${uploadPath}`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/octet-stream',
        },
        body: file,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(`SharePoint upload failed: ${error.error?.message || 'Unknown error'}`);
      }

      const result = await response.json();
      return {
        id: result.id,
        webUrl: result.webUrl,
      };
    } catch (error) {
      console.error('SharePoint site upload failed, falling back to OneDrive:', error);
      // Fall back to OneDrive if SharePoint upload fails
    }
  }

  // Fallback: Upload to OneDrive
  const uploadPath = folderPath
    ? `/me/drive/root:/${folderPath}/${filename}:/content`
    : `/me/drive/root:/${filename}:/content`;

  const response = await fetch(`https://graph.microsoft.com/v1.0${uploadPath}`, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/octet-stream',
    },
    body: file,
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Upload failed: ${error.error?.message || 'Unknown error'}`);
  }

  const result = await response.json();
  return {
    id: result.id,
    webUrl: result.webUrl,
  };
};

/**
 * Create folder in SharePoint site
 */
const createSharePointFolder = async (
  accessToken: string,
  siteId: string,
  driveId: string,
  folderPath: string,
): Promise<void> => {
  const pathParts = folderPath.split('/').filter(Boolean);
  let currentPath = '';

  for (const folderName of pathParts) {
    try {
      const parentPath = currentPath ? `/${currentPath}` : '';

      // Check if folder exists
      const checkResponse = await fetch(
        `https://graph.microsoft.com/v1.0/sites/${siteId}/drives/${driveId}/root:${parentPath}:/children?$filter=name eq '${folderName}' and folder ne null`,
        {
          headers: { Authorization: `Bearer ${accessToken}` },
        },
      );

      if (checkResponse.ok) {
        const data = await checkResponse.json();
        if (data.value && data.value.length > 0) {
          // Folder exists
          currentPath = currentPath ? `${currentPath}/${folderName}` : folderName;
          continue;
        }
      }

      // Create folder
      const createPath = currentPath
        ? `/sites/${siteId}/drives/${driveId}/root:/${currentPath}:/children`
        : `/sites/${siteId}/drives/${driveId}/root/children`;

      const createResponse = await fetch(`https://graph.microsoft.com/v1.0${createPath}`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: folderName,
          folder: {},
          '@microsoft.graph.conflictBehavior': 'rename',
        }),
      });

      if (!createResponse.ok) {
        const errorData = await createResponse.json();
        console.warn(`Failed to create folder ${folderName}:`, errorData);
      }

      currentPath = currentPath ? `${currentPath}/${folderName}` : folderName;
    } catch (error) {
      console.warn(`Error with folder ${folderName}:`, error);
    }
  }
};

/**
 * Create folder in OneDrive/SharePoint if it doesn't exist
 */
const createFolder = async (folderPath: string): Promise<void> => {
  const accessToken = await getAccessToken();
  const siteUrl = process.env.NEXT_PUBLIC_SHAREPOINT_SITE_URL;
  const libraryName = process.env.NEXT_PUBLIC_SHAREPOINT_LIBRARY_NAME || 'Shared Documents';

  // If SharePoint site is configured, use SharePoint folder creation
  if (siteUrl) {
    try {
      const url = new URL(siteUrl);
      const { hostname } = url;
      const sitePath = url.pathname.split('/').filter(Boolean).slice(0, 2).join('/');

      const siteResponse = await fetch(
        `https://graph.microsoft.com/v1.0/sites/${hostname}:/${sitePath}`,
        {
          headers: { Authorization: `Bearer ${accessToken}` },
        },
      );

      if (siteResponse.ok) {
        const siteData = await siteResponse.json();
        const siteId = siteData.id;

        const drivesResponse = await fetch(
          `https://graph.microsoft.com/v1.0/sites/${siteId}/drives`,
          {
            headers: { Authorization: `Bearer ${accessToken}` },
          },
        );

        if (drivesResponse.ok) {
          const drivesData = await drivesResponse.json();
          const drive = drivesData.value.find((d: any) => d.name === libraryName);

          if (drive) {
            await createSharePointFolder(accessToken, siteId, drive.id, folderPath);
            return;
          }
        }
      }
    } catch (error) {
      console.warn('SharePoint folder creation failed, falling back to OneDrive:', error);
    }
  }

  // Fallback: OneDrive folder creation
  const pathParts = folderPath.split('/').filter(Boolean);
  let currentPath = '/me/drive/root';

  for (const folderName of pathParts) {
    try {
      const checkResponse = await fetch(
        `https://graph.microsoft.com/v1.0${currentPath}:/children?$filter=name eq '${folderName}' and folder ne null`,
        {
          headers: { Authorization: `Bearer ${accessToken}` },
        },
      );

      if (checkResponse.ok) {
        const data = await checkResponse.json();
        if (data.value && data.value.length > 0) {
          currentPath = `${currentPath}/${folderName}`;
          continue;
        }
      }

      const createResponse = await fetch(
        `https://graph.microsoft.com/v1.0${currentPath}/children`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            name: folderName,
            folder: {},
            '@microsoft.graph.conflictBehavior': 'rename',
          }),
        },
      );

      if (!createResponse.ok) {
        throw new Error(`Failed to create folder: ${folderName}`);
      }

      currentPath = `${currentPath}/${folderName}`;
    } catch (error) {
      console.warn(`Error with folder ${folderName}:`, error);
    }
  }
};

/**
 * Main export function - Export inspection to SharePoint team site or OneDrive
 */
export const exportToSharePoint = async (
  excelBlob: Blob,
  pdfBlob: Blob,
  inspection: any,
): Promise<{ excel: { id: string; webUrl: string }; pdf: { id: string; webUrl: string } }> => {
  try {
    // Initialize OAuth if needed
    await initializeSharePointOAuth();

    // Determine folder structure
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

    // Get base folder from environment or use default
    const baseFolder = process.env.NEXT_PUBLIC_SHAREPOINT_BASE_FOLDER || 'HSE';

    let inspectionFolder = baseFolder;
    switch (inspection.type) {
      case 'fire_extinguisher':
        inspectionFolder += '/Fire_Extinguisher';
        break;
      case 'first_aid':
        inspectionFolder += '/First_Aid';
        break;
      case 'hse':
        inspectionFolder += '/HSE_Inspection';
        break;
      case 'hse_observation':
        inspectionFolder += '/HSE_Observation';
        break;
      case 'manhours':
        inspectionFolder += '/Manhours_Reports';
        break;
    }

    const folderPath = `${inspectionFolder}/${date.getFullYear()}/${monthNames[date.getMonth()]}`;

    // Create folder structure
    await createFolder(folderPath);

    // Generate filenames
    const monthYear = `${monthNames[date.getMonth()]}_${date.getFullYear()}`;
    const typePrefix = inspection.type
      .replace('_', ' ')
      .replace(/\b\w/g, (l: string) => l.toUpperCase())
      .replace(/ /g, '_');
    const excelFilename = `${typePrefix}_${monthYear}_${inspection.id}.xlsx`;
    const pdfFilename = `${typePrefix}_${monthYear}_${inspection.id}.pdf`;

    // Upload both files
    const [excelResult, pdfResult] = await Promise.all([
      uploadToSharePoint(excelBlob, excelFilename, folderPath),
      uploadToSharePoint(pdfBlob, pdfFilename, folderPath),
    ]);

    console.log('✅ Files uploaded to SharePoint:', {
      excel: excelResult.webUrl,
      pdf: pdfResult.webUrl,
    });

    // Store export record
    const exportRecords: any[] = storage.load('sharepoint_exports', []);
    exportRecords.push({
      inspectionId: inspection.id,
      inspectionType: inspection.type,
      excelFileId: excelResult.id,
      pdfFileId: pdfResult.id,
      excelUrl: excelResult.webUrl,
      pdfUrl: pdfResult.webUrl,
      exportedAt: new Date().toISOString(),
      exportedBy: inspection.reviewedBy,
    });
    storage.save('sharepoint_exports', exportRecords);

    return {
      excel: excelResult,
      pdf: pdfResult,
    };
  } catch (error) {
    console.error('Error exporting to SharePoint:', error);
    throw error;
  }
};

/**
 * Check if SharePoint OAuth is configured
 */
export const isSharePointOAuthConfigured = (): boolean => {
  return Boolean(SHAREPOINT_CONFIG.clientId);
};

/**
 * Check if user is authenticated
 */
export const isSharePointAuthenticated = (): boolean => {
  const token = storage.load('sharepoint_access_token', null);
  const expiry = storage.load('sharepoint_token_expiry', 0);
  return Boolean(token && Date.now() < expiry);
};

/**
 * Sign out (clear tokens)
 */
export const signOutSharePoint = (): void => {
  storage.remove('sharepoint_access_token');
  storage.remove('sharepoint_token_expiry');
  storage.remove('sharepoint_refresh_token');
  storage.remove('sharepoint_oauth_state');
  console.log('✅ Signed out from SharePoint');
};
