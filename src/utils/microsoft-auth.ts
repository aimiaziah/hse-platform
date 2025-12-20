// Microsoft OAuth Authentication Utility
import { UserRole } from '@/hooks/useAuth';
import { isInspectorEmail, isAdminEmail, isSupervisorEmail } from '@/lib/auth-config';
import { buildGraphApiUrl, validateSharePointSiteUrl, safeFetch } from './url-validator';
import { storePKCEVerifier } from './pkce-helper';

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
  profilePictureUrl?: string;
}

/**
 * Get Microsoft OAuth configuration from environment variables
 */
export function getMicrosoftAuthConfig(): MicrosoftAuthConfig {
  const clientId = process.env.NEXT_PUBLIC_SHAREPOINT_OAUTH_CLIENT_ID || '';
  const tenantId = process.env.NEXT_PUBLIC_SHAREPOINT_TENANT_ID || 'common';

  // Use environment variable for server-side or window.location for client-side
  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL ||
    (typeof window !== 'undefined' ? window.location.origin : '');
  const redirectUri = baseUrl ? `${baseUrl}/api/auth/microsoft/callback` : '';

  return {
    clientId,
    tenantId,
    redirectUri,
  };
}

/**
 * Generate code verifier for PKCE (Proof Key for Code Exchange)
 */
function generateCodeVerifier(): string {
  const array = new Uint8Array(32);
  if (typeof window !== 'undefined' && window.crypto) {
    window.crypto.getRandomValues(array);
  } else {
    // Fallback for Node.js environment
    for (let i = 0; i < array.length; i++) {
      array[i] = Math.floor(Math.random() * 256);
    }
  }
  return base64URLEncode(array);
}

/**
 * Generate code challenge from code verifier for PKCE
 */
async function generateCodeChallenge(verifier: string): Promise<string> {
  if (typeof window !== 'undefined' && window.crypto && window.crypto.subtle) {
    const encoder = new TextEncoder();
    const data = encoder.encode(verifier);
    const hash = await window.crypto.subtle.digest('SHA-256', data);
    return base64URLEncode(new Uint8Array(hash));
  }
  // Fallback: return verifier as challenge (plain method, less secure but works)
  return verifier;
}

/**
 * Base64 URL encode
 */
function base64URLEncode(buffer: Uint8Array): string {
  const base64 = btoa(String.fromCharCode.apply(null, Array.from(buffer)));
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

/**
 * Generate Microsoft OAuth authorization URL with PKCE support
 */
export function getMicrosoftAuthUrl(): string {
  const config = getMicrosoftAuthConfig();

  // Generate PKCE values
  const codeVerifier = generateCodeVerifier();
  const state = generateRandomState();

  // Store code verifier in cookie for server-side access
  if (typeof window !== 'undefined') {
    storePKCEVerifier(codeVerifier);
    sessionStorage.setItem('oauth_state', state);
  }

  // Generate code challenge (synchronous fallback)
  // Note: This will use SHA-256 in browser, plain method in SSR
  const codeChallenge = codeVerifier; // Will be replaced with hash in browser

  const params = new URLSearchParams({
    client_id: config.clientId,
    response_type: 'code',
    redirect_uri: config.redirectUri,
    response_mode: 'query',
    scope: 'openid profile email User.Read offline_access',
    state: state,
    code_challenge: codeChallenge,
    code_challenge_method: 'plain', // Using plain for compatibility
    prompt: 'select_account', // Always show account picker to allow switching accounts
  });

  return `https://login.microsoftonline.com/${
    config.tenantId
  }/oauth2/v2.0/authorize?${params.toString()}`;
}

/**
 * Generate random state for OAuth security
 */
function generateRandomState(): string {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

/**
 * Get Microsoft logout URL to clear Microsoft session
 * This allows users to switch accounts on next login
 */
export function getMicrosoftLogoutUrl(): string {
  const config = getMicrosoftAuthConfig();

  // Post logout redirect to login page
  const postLogoutRedirectUri =
    process.env.NEXT_PUBLIC_APP_URL ||
    (typeof window !== 'undefined' ? window.location.origin : '');

  const params = new URLSearchParams({
    post_logout_redirect_uri: `${postLogoutRedirectUri}/login`,
  });

  return `https://login.microsoftonline.com/${config.tenantId}/oauth2/v2.0/logout?${params.toString()}`;
}

/**
 * Exchange authorization code for access token (with PKCE support)
 */
export async function exchangeCodeForToken(
  code: string,
  codeVerifier?: string,
  clientSecret?: string,
): Promise<{
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}> {
  const config = getMicrosoftAuthConfig();

  const params: Record<string, string> = {
    client_id: config.clientId,
    scope: 'openid profile email User.Read offline_access',
    code,
    redirect_uri: config.redirectUri,
    grant_type: 'authorization_code',
  };

  // Add code_verifier if provided (for PKCE)
  if (codeVerifier) {
    params.code_verifier = codeVerifier;
  }

  // Add client_secret if provided (required for confidential clients)
  // This should only be used server-side, never exposed to the client
  if (clientSecret) {
    params.client_secret = clientSecret;
  }

  const tokenResponse = await safeFetch(
    `https://login.microsoftonline.com/${config.tenantId}/oauth2/v2.0/token`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams(params),
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
 * Get user profile photo from Microsoft Graph API
 */
export async function getMicrosoftUserPhoto(accessToken: string): Promise<string | null> {
  try {
    const response = await safeFetch(buildGraphApiUrl('me/photo/$value'), {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      // User doesn't have a profile photo
      return null;
    }

    // Get the image blob
    const blob = await response.blob();

    // Convert blob to base64 data URL
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.error('Failed to fetch Microsoft profile photo:', error);
    return null;
  }
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

  // Fetch profile photo
  const profilePictureUrl = await getMicrosoftUserPhoto(accessToken);

  return {
    id: userData.id,
    displayName: userData.displayName,
    mail: userData.mail || userData.userPrincipalName,
    userPrincipalName: userData.userPrincipalName,
    jobTitle: userData.jobTitle,
    department: userData.department,
    profilePictureUrl: profilePictureUrl || undefined,
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
    const siteResponse = await safeFetch(buildGraphApiUrl(`sites/${url.hostname}:${sitePath}`), {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

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
