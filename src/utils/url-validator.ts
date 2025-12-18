/**
 * URL Validation Utility for SSRF Prevention
 *
 * This utility helps prevent Server-Side Request Forgery (SSRF) attacks by:
 * 1. Validating URL schemes (only HTTPS allowed)
 * 2. Validating domains against an allowlist
 * 3. Preventing path traversal and URL injection
 */

// Allowlist of trusted domains for external API calls
const ALLOWED_DOMAINS = ['graph.microsoft.com', 'login.microsoftonline.com'];

// Allowlist of trusted API path prefixes for internal API calls
const ALLOWED_API_PATHS = [
  '/api/export/fire-extinguisher-template',
  '/api/export/first-aid-template',
  '/api/export/hse-inspection-template',
  '/api/export/hse-observation-template',
  '/api/export/manhours-template',
  '/api/inspections/',
];

/**
 * Validates if a URL is safe to fetch
 * @param url - The URL to validate
 * @param allowInternal - Whether to allow internal API paths (default: true)
 * @returns true if URL is safe, false otherwise
 */
export const isValidUrl = (url: string, allowInternal: boolean = true): boolean => {
  try {
    // Handle relative URLs (internal API calls)
    if (url.startsWith('/')) {
      if (!allowInternal) {
        return false;
      }

      // Check if the path starts with any allowed API path
      return ALLOWED_API_PATHS.some((allowedPath) => url.startsWith(allowedPath));
    }

    // Parse absolute URLs
    const parsedUrl = new URL(url);

    // Only allow HTTPS protocol (or HTTP for localhost in development)
    if (parsedUrl.protocol !== 'https:') {
      if (
        parsedUrl.protocol === 'http:' &&
        (parsedUrl.hostname === 'localhost' || parsedUrl.hostname === '127.0.0.1')
      ) {
        // Allow HTTP for localhost in development
        return true;
      }
      return false;
    }

    // Check if domain is in allowlist
    const hostname = parsedUrl.hostname.toLowerCase();
    const isAllowedDomain = ALLOWED_DOMAINS.some(
      (domain) => hostname === domain || hostname.endsWith(`.${domain}`),
    );

    if (!isAllowedDomain) {
      console.warn(`[SSRF Prevention] Blocked request to untrusted domain: ${hostname}`);
      return false;
    }

    // Additional check: Prevent path traversal attempts
    if (parsedUrl.pathname.includes('..') || parsedUrl.pathname.includes('//')) {
      console.warn(`[SSRF Prevention] Blocked request with path traversal: ${parsedUrl.pathname}`);
      return false;
    }

    return true;
  } catch (error) {
    // Invalid URL format
    console.warn(`[SSRF Prevention] Invalid URL format: ${url}`);
    return false;
  }
};

/**
 * Validates and sanitizes a URL before making a fetch request
 * @param url - The URL to validate
 * @param allowInternal - Whether to allow internal API paths
 * @throws Error if URL is not valid
 */
export const validateUrlForFetch = (url: string, allowInternal: boolean = true): void => {
  if (!isValidUrl(url, allowInternal)) {
    throw new Error(
      `[SSRF Prevention] Attempted to fetch from untrusted URL. ` +
        `Only requests to trusted domains are allowed.`,
    );
  }
};

/**
 * Safely constructs a Microsoft Graph API URL
 * @param path - The API path (e.g., '/me/drive/root')
 * @returns The full Microsoft Graph API URL
 */
export const buildGraphApiUrl = (path: string): string => {
  // Remove leading slash if present
  const cleanPath = path.startsWith('/') ? path.substring(1) : path;

  // Prevent path traversal
  if (cleanPath.includes('..')) {
    throw new Error('[SSRF Prevention] Path traversal detected in Graph API path');
  }

  const url = `https://graph.microsoft.com/v1.0/${cleanPath}`;

  // Validate the constructed URL
  validateUrlForFetch(url, false);

  return url;
};

/**
 * Validates SharePoint site URL from environment variable
 * @param siteUrl - The SharePoint site URL
 * @returns true if valid, false otherwise
 */
export const validateSharePointSiteUrl = (siteUrl: string): boolean => {
  try {
    const parsedUrl = new URL(siteUrl);

    // Must be HTTPS
    if (parsedUrl.protocol !== 'https:') {
      return false;
    }

    // Must be a sharepoint.com domain
    const hostname = parsedUrl.hostname.toLowerCase();
    if (!hostname.endsWith('.sharepoint.com')) {
      console.warn(
        `[SSRF Prevention] SharePoint site URL must be from sharepoint.com domain: ${hostname}`,
      );
      return false;
    }

    return true;
  } catch (error) {
    return false;
  }
};

/**
 * Wraps fetch with URL validation
 * @param url - The URL to fetch
 * @param options - Fetch options
 * @returns Promise with fetch response
 */
export const safeFetch = async (url: string, options?: RequestInit): Promise<Response> => {
  // Validate URL before fetching
  validateUrlForFetch(url);

  // Proceed with fetch
  return fetch(url, options);
};
