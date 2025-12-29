// SharePoint upload using user's delegated token (no Application permissions needed)
import { getServiceSupabase } from '@/lib/supabase';

interface SharePointUploadResult {
  fileId: string;
  fileUrl: string;
}

/**
 * Upload file to SharePoint using user's delegated access token
 * This uses the Delegated permissions already granted (Sites.ReadWrite.All)
 */
export async function uploadToSharePointWithUserToken(
  userId: string,
  file: Blob,
  fileName: string,
  folderPath: string,
): Promise<SharePointUploadResult> {
  const supabase = getServiceSupabase();

  // Get user's Microsoft access token from database
  const { data: user, error: userError } = await supabase
    .from('users')
    .select('microsoft_access_token, microsoft_token_expires_at, microsoft_refresh_token')
    .eq('id', userId)
    .single();

  if (userError || !user) {
    throw new Error('User not found or not authenticated with Microsoft');
  }

  // Check if user has a Microsoft token
  if (!user.microsoft_access_token) {
    throw new Error('User has not connected their Microsoft account');
  }

  // Check if token is expired
  const tokenExpiry = new Date(user.microsoft_token_expires_at);
  const now = new Date();

  let accessToken = user.microsoft_access_token;

  // If token is expired, try to refresh it
  if (now >= tokenExpiry) {
    if (!user.microsoft_refresh_token) {
      throw new Error('Microsoft token expired. Please log in again.');
    }

    try {
      accessToken = await refreshMicrosoftToken(userId, user.microsoft_refresh_token);
    } catch (error) {
      throw new Error('Microsoft token expired. Please log in again.');
    }
  }

  // Get SharePoint configuration
  const siteUrl = process.env.NEXT_PUBLIC_SHAREPOINT_SITE_URL;
  const libraryName = process.env.SHAREPOINT_LIBRARY_NAME || 'Shared Documents';

  if (!siteUrl) {
    throw new Error('SharePoint site URL not configured');
  }

  // Upload to SharePoint using user's token
  return await uploadFileToSharePoint(accessToken, siteUrl, libraryName, file, fileName, folderPath);
}

/**
 * Refresh Microsoft access token using refresh token
 */
async function refreshMicrosoftToken(userId: string, refreshToken: string): Promise<string> {
  const tenantId = process.env.NEXT_PUBLIC_SHAREPOINT_TENANT_ID;
  const clientId = process.env.NEXT_PUBLIC_SHAREPOINT_OAUTH_CLIENT_ID;
  const clientSecret = process.env.SHAREPOINT_CLIENT_SECRET;

  if (!tenantId || !clientId) {
    throw new Error('Microsoft OAuth not configured');
  }

  const tokenUrl = `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`;

  const params = new URLSearchParams({
    client_id: clientId,
    refresh_token: refreshToken,
    grant_type: 'refresh_token',
    scope: 'User.Read Files.ReadWrite.All Sites.ReadWrite.All offline_access',
  });

  // Add client secret if available (for confidential clients)
  if (clientSecret) {
    params.append('client_secret', clientSecret);
  }

  const response = await fetch(tokenUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params.toString(),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error('Token refresh failed:', error);
    throw new Error('Failed to refresh Microsoft token');
  }

  const data = await response.json();

  // Update user's tokens in database
  const supabase = getServiceSupabase();
  await supabase
    .from('users')
    .update({
      microsoft_access_token: data.access_token,
      microsoft_refresh_token: data.refresh_token || refreshToken,
      microsoft_token_expires_at: new Date(Date.now() + data.expires_in * 1000).toISOString(),
    })
    .eq('id', userId);

  console.log('✅ Microsoft token refreshed successfully');
  return data.access_token;
}

/**
 * Upload file to SharePoint site
 */
async function uploadFileToSharePoint(
  accessToken: string,
  siteUrl: string,
  libraryName: string,
  file: Blob,
  fileName: string,
  folderPath: string,
): Promise<SharePointUploadResult> {
  // Parse site URL
  const url = new URL(siteUrl);
  const hostname = url.hostname;
  const sitePath = url.pathname.replace(/\/$/, '');

  // Get site ID
  const siteApiUrl = `https://graph.microsoft.com/v1.0/sites/${hostname}:${sitePath}`;

  const siteResponse = await fetch(siteApiUrl, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!siteResponse.ok) {
    const error = await siteResponse.text();
    throw new Error(`Failed to access SharePoint site: ${siteResponse.status} - ${error}`);
  }

  const siteData = await siteResponse.json();
  const siteId = siteData.id;

  // Get drive (document library) ID
  const drivesUrl = `https://graph.microsoft.com/v1.0/sites/${siteId}/drives`;

  const drivesResponse = await fetch(drivesUrl, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!drivesResponse.ok) {
    const error = await drivesResponse.text();
    throw new Error(`Failed to get document library: ${drivesResponse.status} - ${error}`);
  }

  const drivesData = await drivesResponse.json();
  const drive = drivesData.value.find((d: any) => d.name === libraryName);

  if (!drive) {
    throw new Error(`Document library "${libraryName}" not found`);
  }

  const driveId = drive.id;

  // Create folder structure
  await createFolderStructure(accessToken, siteId, driveId, folderPath);

  // Upload file
  const uploadUrl = `https://graph.microsoft.com/v1.0/sites/${siteId}/drives/${driveId}/root:/${folderPath}/${fileName}:/content`;

  const uploadResponse = await fetch(uploadUrl, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/octet-stream',
    },
    body: file,
  });

  if (!uploadResponse.ok) {
    const error = await uploadResponse.text();
    throw new Error(`File upload failed: ${uploadResponse.status} - ${error}`);
  }

  const uploadResult = await uploadResponse.json();

  return {
    fileId: uploadResult.id,
    fileUrl: uploadResult.webUrl,
  };
}

/**
 * Create folder structure in SharePoint
 */
async function createFolderStructure(
  accessToken: string,
  siteId: string,
  driveId: string,
  folderPath: string,
): Promise<void> {
  const pathParts = folderPath.split('/').filter(Boolean);
  let currentPath = '';

  for (const folderName of pathParts) {
    try {
      const parentPath = currentPath ? `/${currentPath}` : '';

      // Check if folder exists
      const checkUrl = `https://graph.microsoft.com/v1.0/sites/${siteId}/drives/${driveId}/root:${parentPath}:/children?$filter=name eq '${encodeURIComponent(
        folderName,
      )}' and folder ne null`;

      const checkResponse = await fetch(checkUrl, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (checkResponse.ok) {
        const data = await checkResponse.json();
        if (data.value && data.value.length > 0) {
          currentPath = currentPath ? `${currentPath}/${folderName}` : folderName;
          continue;
        }
      }

      // Create folder
      const createPath = currentPath
        ? `https://graph.microsoft.com/v1.0/sites/${siteId}/drives/${driveId}/root:/${currentPath}:/children`
        : `https://graph.microsoft.com/v1.0/sites/${siteId}/drives/${driveId}/root/children`;

      const createResponse = await fetch(createPath, {
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
        console.warn(`Failed to create folder ${folderName}, continuing...`);
      }

      currentPath = currentPath ? `${currentPath}/${folderName}` : folderName;
    } catch (error) {
      console.warn(`Error creating folder ${folderName}:`, error);
    }
  }
}

/**
 * Check if user has a valid Microsoft token for SharePoint upload
 */
export async function canUserUploadToSharePoint(userId: string): Promise<boolean> {
  const supabase = getServiceSupabase();

  const { data: user, error } = await supabase
    .from('users')
    .select('microsoft_access_token, microsoft_token_expires_at, microsoft_refresh_token')
    .eq('id', userId)
    .single();

  if (error || !user) {
    return false;
  }

  // User must have at least a refresh token (can renew expired access tokens)
  return Boolean(user.microsoft_access_token || user.microsoft_refresh_token);
}
