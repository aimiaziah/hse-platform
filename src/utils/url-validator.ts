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
 * Sanitizes a filename to prevent path traversal and injection attacks
 * @param filename - The filename to sanitize
 * @returns Sanitized filename
 */
export const sanitizeFilename = (filename: string): string => {
  // Remove path traversal sequences
  let sanitized = filename.replace(/\.\./g, '').replace(/\/\/+/g, '/');

  // Remove any path separators
  sanitized = sanitized.replace(/[\/\\]/g, '_');

  // Remove control characters and special characters that could be used for injection
  sanitized = sanitized.replace(/[<>:"|?*\x00-\x1f]/g, '');

  // Limit length to prevent DoS
  if (sanitized.length > 255) {
    sanitized = sanitized.substring(0, 255);
  }

  // Ensure filename is not empty
  if (!sanitized || sanitized.trim().length === 0) {
    sanitized = 'file';
  }

  return sanitized.trim();
};

/**
 * Valid inspection types - used for type guard validation
 */
const VALID_INSPECTION_TYPES = [
  'hse',
  'fire_extinguisher',
  'first_aid',
  'hse_observation',
  'manhours',
] as const;
export type ValidInspectionType = (typeof VALID_INSPECTION_TYPES)[number];

/**
 * Type guard to validate inspection type
 * @param type - The type to validate
 * @returns true if type is a valid inspection type
 */
export const isValidInspectionType = (type: unknown): type is ValidInspectionType => {
  return typeof type === 'string' && VALID_INSPECTION_TYPES.includes(type as ValidInspectionType);
};

/**
 * Validates and returns a safe inspection type
 * @param type - The type from query params
 * @returns Validated inspection type
 * @throws Error if type is invalid
 */
export const validateInspectionType = (
  type: string | string[] | undefined,
): ValidInspectionType => {
  if (!type) {
    throw new Error('[SSRF Prevention] Inspection type is required');
  }

  const typeString = Array.isArray(type) ? type[0] : type;

  if (!isValidInspectionType(typeString)) {
    throw new Error(`[SSRF Prevention] Invalid inspection type: ${typeString}`);
  }

  return typeString;
};

/**
 * UUID v4 regex pattern for strict ID validation
 */
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Simple alphanumeric ID pattern (for legacy IDs)
 */
const SIMPLE_ID_PATTERN = /^[a-zA-Z0-9_-]{1,100}$/;

/**
 * Sanitizes an ID parameter to prevent injection attacks
 * Uses strict validation to ensure ID matches expected formats
 * @param id - The ID to sanitize
 * @returns Sanitized ID
 */
export const sanitizeId = (id: string | string[] | undefined): string => {
  if (!id) {
    throw new Error('[SSRF Prevention] ID parameter is required');
  }

  // Convert array to string (take first element)
  const idString = Array.isArray(id) ? id[0] : id;

  // First, check if it's a valid UUID (preferred format)
  if (UUID_PATTERN.test(idString)) {
    return idString.toLowerCase();
  }

  // Fall back to simple ID validation for legacy support
  if (SIMPLE_ID_PATTERN.test(idString)) {
    return idString;
  }

  // If neither pattern matches, the ID is invalid
  throw new Error('[SSRF Prevention] Invalid ID format - must be UUID or alphanumeric');
};

/**
 * Validates that a string is a valid Graph API site/drive ID
 * These IDs are in a specific format returned by Microsoft Graph API
 * @param id - The ID to validate
 * @returns true if valid Graph API ID format
 */
export const isValidGraphApiId = (id: unknown): boolean => {
  if (typeof id !== 'string' || !id) {
    return false;
  }

  // Graph API IDs are typically in formats like:
  // - Site IDs: "contoso.sharepoint.com,guid,guid"
  // - Drive IDs: alphanumeric with specific patterns
  // Allow alphanumeric, hyphens, underscores, periods, commas (for composite IDs)
  const GRAPH_ID_PATTERN = /^[a-zA-Z0-9._,-]{1,500}$/;

  if (!GRAPH_ID_PATTERN.test(id)) {
    return false;
  }

  // Additional check: prevent path traversal sequences
  if (id.includes('..') || id.includes('//')) {
    return false;
  }

  return true;
};

/**
 * Sanitizes a Graph API ID (site ID, drive ID, etc.)
 * @param id - The ID from API response
 * @param idType - Type description for error messages
 * @returns Sanitized ID
 */
export const sanitizeGraphApiId = (id: unknown, idType: string = 'ID'): string => {
  if (!isValidGraphApiId(id)) {
    throw new Error(`[SSRF Prevention] Invalid ${idType} format from API response`);
  }
  return id as string;
};

/**
 * Sanitizes a folder path to prevent path traversal and injection attacks
 * @param folderPath - The folder path to sanitize
 * @returns Sanitized folder path
 */
export const sanitizeFolderPath = (folderPath: string): string => {
  // Split path into components
  const parts = folderPath.split('/').filter(Boolean);

  // Sanitize each component
  const sanitizedParts = parts
    .map((part) => {
      // Remove path traversal sequences
      let sanitized = part.replace(/\.\./g, '').replace(/\/\/+/g, '/');

      // Remove control characters and special characters
      sanitized = sanitized.replace(/[<>:"|?*\x00-\x1f]/g, '');

      // Limit component length
      if (sanitized.length > 100) {
        sanitized = sanitized.substring(0, 100);
      }

      return sanitized.trim();
    })
    .filter((part) => part.length > 0); // Remove empty parts

  // Rejoin and ensure no double slashes or path traversal
  const sanitized = sanitizedParts.join('/');

  // Final check for path traversal
  if (sanitized.includes('..') || sanitized.includes('//')) {
    throw new Error('[SSRF Prevention] Invalid folder path detected');
  }

  return sanitized;
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
