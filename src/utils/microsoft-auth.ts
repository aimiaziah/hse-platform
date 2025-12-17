// Microsoft OAuth Authentication Utility
import { UserRole } from '@/hooks/useAuth';
import { isInspectorEmail, isAdminEmail, isSupervisorEmail } from '@/lib/auth-config';
import { buildGraphApiUrl, validateSharePointSiteUrl, safeFetch } from './url-validator';

export interface MicrosoftAuthConfig {
  clientId: string;
  tenantId: string;
  redirectUri: string;
}

export interface MicrosoftUserInfo {
  id: string;
  displayName: string;
  mail: string;
  userPrincipalName: string;
  jobTitle?: string;
  department?: string;
}

/**
 * Get Microsoft OAuth configuration from environment variables
 */
export function getMicrosoftAuthConfig(): MicrosoftAuthConfig {
  const clientId = process.env.NEXT_PUBLIC_SHAREPOINT_OAUTH_CLIENT_ID || '';
  const tenantId = process.env.NEXT_PUBLIC_SHAREPOINT_TENANT_ID || 'common';
  const redirectUri =
    typeof window !== 'undefined' ? `${window.location.origin}/api/auth/microsoft/callback` : '';

  return {
    clientId,
    tenantId,
    redirectUri,
  };
}

/**
 * Generate Microsoft OAuth authorization URL
 */
export function getMicrosoftAuthUrl(): string {
  const config = getMicrosoftAuthConfig();

  const params = new URLSearchParams({
    client_id: config.clientId,
    response_type: 'code',
    redirect_uri: config.redirectUri,
    response_mode: 'query',
    scope: 'openid profile email User.Read Files.ReadWrite.All offline_access',
    state: generateRandomState(),
  });

  return `https://login.microsoftonline.com/${
    config.tenantId
  }/oauth2/v2.0/authorize?${params.toString()}`;
}

/**
 * Generate random state for OAuth security
 */
function generateRandomState(): string {
  return Math.random().toString(36).substring(2, 15);
}

/**
 * Exchange authorization code for access token
 */
export async function exchangeCodeForToken(code: string): Promise<{
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}> {
  const config = getMicrosoftAuthConfig();

  const tokenResponse = await safeFetch(
    `https://login.microsoftonline.com/${config.tenantId}/oauth2/v2.0/token`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: config.clientId,
        scope: 'openid profile email User.Read Files.ReadWrite.All offline_access',
        code,
        redirect_uri: config.redirectUri,
        grant_type: 'authorization_code',
      }),
    },
  );

  if (!tokenResponse.ok) {
    const error = await tokenResponse.json();
    throw new Error(`Token exchange failed: ${error.error_description || error.error}`);
  }

  const tokenData = await tokenResponse.json();

  return {
    accessToken: tokenData.access_token,
    refreshToken: tokenData.refresh_token,
    expiresIn: tokenData.expires_in,
  };
}

/**
 * Get user information from Microsoft Graph API
 */
export async function getMicrosoftUserInfo(accessToken: string): Promise<MicrosoftUserInfo> {
  const response = await safeFetch(buildGraphApiUrl('me'), {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    throw new Error('Failed to get user information from Microsoft Graph');
  }

  const userData = await response.json();

  return {
    id: userData.id,
    displayName: userData.displayName,
    mail: userData.mail || userData.userPrincipalName,
    userPrincipalName: userData.userPrincipalName,
    jobTitle: userData.jobTitle,
    department: userData.department,
  };
}

/**
 * Map Microsoft user to app role based on email whitelist or job title/department
 * Priority: Email whitelist > Job title/department mapping
 */
export function mapMicrosoftUserToRole(userInfo: MicrosoftUserInfo): UserRole {
  // PRIORITY 1: Check email whitelists (highest priority)
  if (isAdminEmail(userInfo.mail)) {
    return 'admin';
  }

  if (isSupervisorEmail(userInfo.mail)) {
    return 'supervisor';
  }

  if (isInspectorEmail(userInfo.mail)) {
    return 'inspector';
  }

  // PRIORITY 2: Job title/department mapping (fallback)
  const jobTitle = userInfo.jobTitle?.toLowerCase() || '';
  const department = userInfo.department?.toLowerCase() || '';

  // Admin mapping
  if (
    jobTitle.includes('admin') ||
    jobTitle.includes('manager') ||
    department.includes('it') ||
    department.includes('management')
  ) {
    return 'admin';
  }

  // Supervisor mapping
  if (
    jobTitle.includes('supervisor') ||
    jobTitle.includes('lead') ||
    jobTitle.includes('coordinator')
  ) {
    return 'supervisor';
  }

  // Inspector mapping
  if (jobTitle.includes('inspector') || jobTitle.includes('hse') || jobTitle.includes('safety')) {
    return 'inspector';
  }

  // Default to employee
  return 'employee';
}

/**
 * Upload file to user's OneDrive or SharePoint using delegated permissions
 */
export async function uploadToOneDrive(
  accessToken: string,
  fileName: string,
  fileBuffer: ArrayBuffer,
  folderPath?: string,
): Promise<{ success: boolean; fileUrl?: string; error?: string }> {
  try {
    // Construct the upload path
    const uploadPath = folderPath
      ? `me/drive/root:/${folderPath}/${fileName}:/content`
      : `me/drive/root:/${fileName}:/content`;

    const response = await safeFetch(buildGraphApiUrl(uploadPath), {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/octet-stream',
      },
      body: fileBuffer,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || 'Upload failed');
    }

    const data = await response.json();

    return {
      success: true,
      fileUrl: data.webUrl,
    };
  } catch (error) {
    console.error('OneDrive upload error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Upload failed',
    };
  }
}

/**
 * Upload to SharePoint site using delegated permissions
 */
export async function uploadToSharePointSite(
  accessToken: string,
  siteUrl: string,
  libraryName: string,
  fileName: string,
  fileBuffer: ArrayBuffer,
  folderPath?: string,
): Promise<{ success: boolean; fileUrl?: string; error?: string }> {
  try {
    // Validate SharePoint site URL
    if (!validateSharePointSiteUrl(siteUrl)) {
      throw new Error('Invalid SharePoint site URL');
    }

    // Extract site path from URL
    const url = new URL(siteUrl);
    const sitePath = url.pathname;

    // Get site ID
    const siteResponse = await safeFetch(
      buildGraphApiUrl(`sites/${url.hostname}:${sitePath}`),
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );

    if (!siteResponse.ok) {
      throw new Error('Failed to get SharePoint site information');
    }

    const siteData = await siteResponse.json();
    const siteId = siteData.id;

    // Upload file
    const uploadPath = folderPath
      ? `/${libraryName}/${folderPath}/${fileName}`
      : `/${libraryName}/${fileName}`;

    const uploadResponse = await safeFetch(
      buildGraphApiUrl(`sites/${siteId}/drive/root:${uploadPath}:/content`),
      {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/octet-stream',
        },
        body: fileBuffer,
      },
    );

    if (!uploadResponse.ok) {
      const error = await uploadResponse.json();
      throw new Error(error.error?.message || 'Upload failed');
    }

    const uploadData = await uploadResponse.json();

    return {
      success: true,
      fileUrl: uploadData.webUrl,
    };
  } catch (error) {
    console.error('SharePoint upload error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Upload failed',
    };
  }
}
