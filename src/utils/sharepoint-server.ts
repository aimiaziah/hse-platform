// Server-Side SharePoint Integration using App-Only Permissions
// This enables automatic background uploads without user interaction
// Uses Client Credentials Flow (OAuth 2.0)

/**
 * SharePoint Site Configuration
 */
interface SharePointConfig {
  siteUrl: string; // e.g., "https://thetaedgebhd.sharepoint.com/sites/ThetaEdge"
  libraryName: string; // e.g., "Shared Documents"
  baseFolder: string; // e.g., "HSE/New Document"
}

/**
 * OAuth Client Credentials
 */
interface OAuthCredentials {
  tenantId: string;
  clientId: string;
  clientSecret: string;
}

/**
 * Access Token Cache
 */
let cachedToken: string | null = null;
let tokenExpiry: number = 0;

/**
 * Get SharePoint configuration from environment
 */
function getSharePointConfig(): SharePointConfig {
  const siteUrl = process.env.NEXT_PUBLIC_SHAREPOINT_SITE_URL || process.env.SHAREPOINT_SITE_URL;
  const libraryName = process.env.SHAREPOINT_LIBRARY_NAME || 'Shared Documents';
  const baseFolder = process.env.SHAREPOINT_BASE_FOLDER || 'HSE/New Document';

  if (!siteUrl) {
    throw new Error(
      'SharePoint site URL not configured. Set NEXT_PUBLIC_SHAREPOINT_SITE_URL or SHAREPOINT_SITE_URL',
    );
  }

  return { siteUrl, libraryName, baseFolder };
}

/**
 * Get OAuth credentials from environment
 */
function getOAuthCredentials(): OAuthCredentials {
  const tenantId = process.env.NEXT_PUBLIC_SHAREPOINT_TENANT_ID || process.env.SHAREPOINT_TENANT_ID;
  const clientId =
    process.env.NEXT_PUBLIC_SHAREPOINT_OAUTH_CLIENT_ID || process.env.SHAREPOINT_CLIENT_ID;
  const clientSecret = process.env.SHAREPOINT_CLIENT_SECRET;

  if (!tenantId || !clientId || !clientSecret) {
    throw new Error(
      'SharePoint OAuth credentials not configured. Set SHAREPOINT_TENANT_ID, SHAREPOINT_CLIENT_ID, and SHAREPOINT_CLIENT_SECRET',
    );
  }

  return { tenantId, clientId, clientSecret };
}

/**
 * Get app-only access token using client credentials flow
 * This runs server-side and doesn't require user interaction
 */
async function getAccessToken(): Promise<string> {
  // Return cached token if still valid
  if (cachedToken && Date.now() < tokenExpiry) {
    return cachedToken;
  }

  const { tenantId, clientId, clientSecret } = getOAuthCredentials();

  // Token endpoint for app-only authentication
  const tokenUrl = `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`;

  // Request app-only token with Sites.ReadWrite.All permission
  const params = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    scope: 'https://graph.microsoft.com/.default',
    grant_type: 'client_credentials',
  });

  const response = await fetch(tokenUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params.toString(),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to get access token: ${response.status} - ${error}`);
  }

  const data = await response.json();

  // Cache token (typically expires in 1 hour)
  cachedToken = data.access_token;
  tokenExpiry = Date.now() + (data.expires_in - 300) * 1000; // Refresh 5 minutes before expiry

  return cachedToken as string;
}

/**
 * Get SharePoint site and drive IDs
 */
async function getSiteAndDriveInfo(
  accessToken: string,
  siteUrl: string,
  libraryName: string,
): Promise<{ siteId: string; driveId: string }> {
  // Parse site URL
  const url = new URL(siteUrl);
  const hostname = url.hostname;
  const sitePath = url.pathname.replace(/\/$/, ''); // Remove trailing slash

  // Get site ID
  const siteApiUrl = `https://graph.microsoft.com/v1.0/sites/${hostname}:${sitePath}`;

  const siteResponse = await fetch(siteApiUrl, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!siteResponse.ok) {
    const error = await siteResponse.text();
    throw new Error(`Failed to get site info: ${siteResponse.status} - ${error}`);
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
    throw new Error(`Failed to get drives: ${drivesResponse.status} - ${error}`);
  }

  const drivesData = await drivesResponse.json();
  const drive = drivesData.value.find((d: any) => d.name === libraryName);

  if (!drive) {
    throw new Error(`Document library "${libraryName}" not found in site`);
  }

  return {
    siteId,
    driveId: drive.id,
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
          // Folder exists
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
 * Upload file to SharePoint with metadata
 */
export async function uploadFileToSharePoint(
  file: Blob,
  fileName: string,
  folderPath: string,
  metadata?: Record<string, any>,
): Promise<{ itemId: string; webUrl: string }> {
  const accessToken = await getAccessToken();
  const config = getSharePointConfig();

  const { siteId, driveId } = await getSiteAndDriveInfo(
    accessToken,
    config.siteUrl,
    config.libraryName,
  );

  // Create full folder path
  const fullFolderPath = `${config.baseFolder}/${folderPath}`;

  // Ensure folder structure exists
  await createFolderStructure(accessToken, siteId, driveId, fullFolderPath);

  // Upload file
  const uploadUrl = `https://graph.microsoft.com/v1.0/sites/${siteId}/drives/${driveId}/root:/${fullFolderPath}/${fileName}:/content`;

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

  // If metadata provided, update list item properties
  if (metadata && Object.keys(metadata).length > 0) {
    try {
      await updateFileMetadata(accessToken, siteId, driveId, uploadResult.id, metadata);
    } catch (metadataError) {
      console.warn('Failed to set metadata, but file uploaded successfully:', metadataError);
    }
  }

  return {
    itemId: uploadResult.id,
    webUrl: uploadResult.webUrl,
  };
}

/**
 * Update file metadata (SharePoint list item properties)
 */
export async function updateFileMetadata(
  accessToken: string,
  siteId: string,
  driveId: string,
  itemId: string,
  metadata: Record<string, any>,
): Promise<void> {
  // Get list item ID from drive item
  const itemUrl = `https://graph.microsoft.com/v1.0/sites/${siteId}/drives/${driveId}/items/${itemId}`;

  const itemResponse = await fetch(itemUrl, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!itemResponse.ok) {
    throw new Error('Failed to get item info for metadata update');
  }

  const itemData = await itemResponse.json();
  const listItemId = itemData.listItem?.id;

  if (!listItemId) {
    throw new Error('File is not associated with a SharePoint list');
  }

  // Get list ID
  const listId = itemData.parentReference.driveId;

  // Update list item with custom metadata
  const updateUrl = `https://graph.microsoft.com/v1.0/sites/${siteId}/lists/${listId}/items/${listItemId}/fields`;

  const updateResponse = await fetch(updateUrl, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(metadata),
  });

  if (!updateResponse.ok) {
    const error = await updateResponse.text();
    throw new Error(`Metadata update failed: ${updateResponse.status} - ${error}`);
  }
}

/**
 * Update existing file metadata by item ID
 */
export async function updateMetadataByItemId(
  itemId: string,
  metadata: Record<string, any>,
): Promise<void> {
  const accessToken = await getAccessToken();
  const config = getSharePointConfig();

  const { siteId, driveId } = await getSiteAndDriveInfo(
    accessToken,
    config.siteUrl,
    config.libraryName,
  );

  await updateFileMetadata(accessToken, siteId, driveId, itemId, metadata);
}
