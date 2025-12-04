// src/utils/templateCache.ts - Template Caching Utility
/**
 * Cache Excel templates in browser storage to reduce Supabase egress costs
 * Templates are cached with versioning to allow updates when needed
 */

const TEMPLATE_CACHE_PREFIX = 'template_cache_';
const CACHE_VERSION = '1.0'; // Increment this when templates are updated

/**
 * Cached template structure
 */
interface CachedTemplate {
  data: string; // Base64 encoded ArrayBuffer
  timestamp: number;
  version: string;
  size: number;
}

/**
 * Convert ArrayBuffer to base64 string for localStorage storage
 */
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  const chunkSize = 32768; // Process in chunks to avoid call stack size exceeded

  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, Math.min(i + chunkSize, bytes.length));
    binary += String.fromCharCode.apply(null, Array.from(chunk));
  }

  return btoa(binary);
}

/**
 * Convert base64 string back to ArrayBuffer
 */
function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);

  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }

  return bytes.buffer;
}

/**
 * Get cache key for a template
 */
function getCacheKey(templateName: string): string {
  return `${TEMPLATE_CACHE_PREFIX}${templateName}`;
}

/**
 * Check if template is cached and valid
 */
export function isTemplateCached(templateName: string): boolean {
  if (typeof window === 'undefined') return false;

  try {
    const cacheKey = getCacheKey(templateName);
    const cached = localStorage.getItem(cacheKey);

    if (!cached) return false;

    const parsed: CachedTemplate = JSON.parse(cached);

    // Check if version matches
    if (parsed.version !== CACHE_VERSION) {
      console.log(`[TemplateCache] Version mismatch for ${templateName}, will re-download`);
      return false;
    }

    return true;
  } catch (error) {
    console.error('[TemplateCache] Error checking cache:', error);
    return false;
  }
}

/**
 * Get cached template
 */
export function getCachedTemplate(templateName: string): ArrayBuffer | null {
  if (typeof window === 'undefined') return null;

  try {
    const cacheKey = getCacheKey(templateName);
    const cached = localStorage.getItem(cacheKey);

    if (!cached) {
      console.log(`[TemplateCache] Cache miss: ${templateName}`);
      return null;
    }

    const parsed: CachedTemplate = JSON.parse(cached);

    // Check version
    if (parsed.version !== CACHE_VERSION) {
      console.log(`[TemplateCache] Outdated cache for ${templateName}, clearing...`);
      localStorage.removeItem(cacheKey);
      return null;
    }

    console.log(
      `[TemplateCache] ✅ Cache hit: ${templateName} (${(parsed.size / 1024).toFixed(1)} KB)`,
    );

    // Convert base64 back to ArrayBuffer
    return base64ToArrayBuffer(parsed.data);
  } catch (error) {
    console.error('[TemplateCache] Error reading cache:', error);
    return null;
  }
}

/**
 * Cache template
 */
export function cacheTemplate(templateName: string, buffer: ArrayBuffer): boolean {
  if (typeof window === 'undefined') return false;

  try {
    const cacheKey = getCacheKey(templateName);
    const base64 = arrayBufferToBase64(buffer);

    const cached: CachedTemplate = {
      data: base64,
      timestamp: Date.now(),
      version: CACHE_VERSION,
      size: buffer.byteLength,
    };

    localStorage.setItem(cacheKey, JSON.stringify(cached));
    console.log(
      `[TemplateCache] ✅ Cached: ${templateName} (${(buffer.byteLength / 1024).toFixed(1)} KB)`,
    );

    return true;
  } catch (error) {
    // localStorage quota exceeded
    console.error('[TemplateCache] Failed to cache template:', error);

    // Try to free up space by clearing old caches
    clearOldCaches();

    // Try one more time
    try {
      const cacheKey = getCacheKey(templateName);
      const base64 = arrayBufferToBase64(buffer);

      const cached: CachedTemplate = {
        data: base64,
        timestamp: Date.now(),
        version: CACHE_VERSION,
        size: buffer.byteLength,
      };

      localStorage.setItem(cacheKey, JSON.stringify(cached));
      console.log('[TemplateCache] ✅ Cached after cleanup');
      return true;
    } catch (retryError) {
      console.error('[TemplateCache] Failed to cache after cleanup:', retryError);
      return false;
    }
  }
}

/**
 * Get template with caching (from local or download function)
 */
export async function getTemplateWithCache(
  templateName: string,
  downloadFn: () => Promise<ArrayBuffer>,
): Promise<ArrayBuffer> {
  // Try cache first
  const cached = getCachedTemplate(templateName);
  if (cached) {
    return cached;
  }

  // Download template
  console.log(`[TemplateCache] 📥 Downloading: ${templateName}`);
  const buffer = await downloadFn();

  // Cache for next time
  cacheTemplate(templateName, buffer);

  return buffer;
}

/**
 * Clear all template caches
 */
export function clearAllTemplateCaches(): void {
  if (typeof window === 'undefined') return;

  try {
    const keys = Object.keys(localStorage);
    let cleared = 0;

    keys.forEach((key) => {
      if (key.startsWith(TEMPLATE_CACHE_PREFIX)) {
        localStorage.removeItem(key);
        cleared++;
      }
    });

    console.log(`[TemplateCache] 🗑️  Cleared ${cleared} cached template(s)`);
  } catch (error) {
    console.error('[TemplateCache] Error clearing caches:', error);
  }
}

/**
 * Clear old caches (different versions)
 */
function clearOldCaches(): void {
  if (typeof window === 'undefined') return;

  try {
    const keys = Object.keys(localStorage);
    let cleared = 0;

    keys.forEach((key) => {
      if (key.startsWith(TEMPLATE_CACHE_PREFIX)) {
        try {
          const cached = localStorage.getItem(key);
          if (cached) {
            const parsed: CachedTemplate = JSON.parse(cached);
            if (parsed.version !== CACHE_VERSION) {
              localStorage.removeItem(key);
              cleared++;
            }
          }
        } catch (error) {
          // Invalid cache entry, remove it
          localStorage.removeItem(key);
          cleared++;
        }
      }
    });

    if (cleared > 0) {
      console.log(`[TemplateCache] 🗑️  Cleared ${cleared} old cache(s)`);
    }
  } catch (error) {
    console.error('[TemplateCache] Error clearing old caches:', error);
  }
}

/**
 * Get cache statistics
 */
export function getCacheStats(): {
  totalCached: number;
  totalSize: number;
  templates: Array<{ name: string; size: number; timestamp: Date }>;
} {
  if (typeof window === 'undefined') {
    return { totalCached: 0, totalSize: 0, templates: [] };
  }

  const stats = {
    totalCached: 0,
    totalSize: 0,
    templates: [] as Array<{ name: string; size: number; timestamp: Date }>,
  };

  try {
    const keys = Object.keys(localStorage);

    keys.forEach((key) => {
      if (key.startsWith(TEMPLATE_CACHE_PREFIX)) {
        const cached = localStorage.getItem(key);
        if (cached) {
          try {
            const parsed: CachedTemplate = JSON.parse(cached);
            if (parsed.version === CACHE_VERSION) {
              stats.totalCached++;
              stats.totalSize += parsed.size;
              stats.templates.push({
                name: key.replace(TEMPLATE_CACHE_PREFIX, ''),
                size: parsed.size,
                timestamp: new Date(parsed.timestamp),
              });
            }
          } catch (error) {
            // Skip invalid entries
          }
        }
      }
    });
  } catch (error) {
    console.error('[TemplateCache] Error getting stats:', error);
  }

  return stats;
}

/**
 * Clear a specific template cache
 */
export function clearTemplateCache(templateName: string): boolean {
  if (typeof window === 'undefined') return false;

  try {
    const cacheKey = getCacheKey(templateName);
    localStorage.removeItem(cacheKey);
    console.log(`[TemplateCache] 🗑️  Cleared cache: ${templateName}`);
    return true;
  } catch (error) {
    console.error('[TemplateCache] Error clearing cache:', error);
    return false;
  }
}
