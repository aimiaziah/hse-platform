// Safe JSON Utilities
// Prevents application crashes from malformed JSON data
import { logger } from './logger';

/**
 * Safely parse JSON with error handling
 * Returns fallback value if parsing fails
 *
 * @param json - JSON string to parse
 * @param fallback - Value to return if parsing fails
 * @param context - Context for logging (e.g., 'localStorage', 'api-response')
 * @returns Parsed value or fallback
 */
export function safeJsonParse<T>(
  json: string | null | undefined,
  fallback: T,
  context?: string,
): T {
  // Handle null/undefined input
  if (json === null || json === undefined || json === '') {
    return fallback;
  }

  try {
    const parsed = JSON.parse(json);
    return parsed as T;
  } catch (error) {
    logger.error('JSON parse failed', error, {
      context,
      jsonPreview: json.substring(0, 100),
      jsonLength: json.length,
    });
    return fallback;
  }
}

/**
 * Safely parse JSON or return null
 * Use when you want to check if parsing succeeded
 *
 * @param json - JSON string to parse
 * @param context - Context for logging
 * @returns Parsed value or null
 */
export function tryJsonParse<T>(json: string | null | undefined, context?: string): T | null {
  if (json === null || json === undefined || json === '') {
    return null;
  }

  try {
    return JSON.parse(json) as T;
  } catch (error) {
    logger.debug('JSON parse attempt failed (expected in some cases)', {
      context,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return null;
  }
}

/**
 * Safely stringify with error handling
 * Returns fallback if stringification fails
 *
 * @param obj - Object to stringify
 * @param fallback - String to return if stringification fails
 * @param pretty - Whether to pretty-print the JSON
 * @returns JSON string or fallback
 */
export function safeJsonStringify(obj: any, fallback = '{}', pretty = false): string {
  try {
    return pretty ? JSON.stringify(obj, null, 2) : JSON.stringify(obj);
  } catch (error) {
    logger.error('JSON stringify failed', error, {
      objectType: typeof obj,
      isArray: Array.isArray(obj),
    });
    return fallback;
  }
}

/**
 * Parse JSON with automatic fallback to empty object
 * Common pattern for localStorage reads
 */
export function parseJsonOrEmpty<T extends object = any>(
  json: string | null | undefined,
  context?: string,
): T {
  return safeJsonParse<T>(json, {} as T, context);
}

/**
 * Parse JSON with automatic fallback to empty array
 * Common pattern for list data
 */
export function parseJsonOrEmptyArray<T = any>(
  json: string | null | undefined,
  context?: string,
): T[] {
  return safeJsonParse<T[]>(json, [], context);
}

/**
 * Safe localStorage getItem with JSON parsing
 * @param key - localStorage key
 * @param fallback - Fallback value if key doesn't exist or parsing fails
 * @returns Parsed value or fallback
 */
export function getLocalStorage<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') {
    return fallback;
  }

  try {
    const item = window.localStorage.getItem(key);
    return safeJsonParse(item, fallback, `localStorage:${key}`);
  } catch (error) {
    logger.error('localStorage access failed', error, { key });
    return fallback;
  }
}

/**
 * Safe localStorage setItem with JSON stringification
 * @param key - localStorage key
 * @param value - Value to store
 * @returns true if successful, false otherwise
 */
export function setLocalStorage<T>(key: string, value: T): boolean {
  if (typeof window === 'undefined') {
    return false;
  }

  try {
    const json = safeJsonStringify(value);
    window.localStorage.setItem(key, json);
    return true;
  } catch (error) {
    logger.error('localStorage set failed', error, { key });
    return false;
  }
}

/**
 * Safe sessionStorage getItem with JSON parsing
 */
export function getSessionStorage<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') {
    return fallback;
  }

  try {
    const item = window.sessionStorage.getItem(key);
    return safeJsonParse(item, fallback, `sessionStorage:${key}`);
  } catch (error) {
    logger.error('sessionStorage access failed', error, { key });
    return fallback;
  }
}

/**
 * Safe sessionStorage setItem with JSON stringification
 */
export function setSessionStorage<T>(key: string, value: T): boolean {
  if (typeof window === 'undefined') {
    return false;
  }

  try {
    const json = safeJsonStringify(value);
    window.sessionStorage.setItem(key, json);
    return true;
  } catch (error) {
    logger.error('sessionStorage set failed', error, { key });
    return false;
  }
}

/**
 * Validate JSON string without parsing
 * @param json - String to validate
 * @returns true if valid JSON, false otherwise
 */
export function isValidJson(json: string): boolean {
  if (!json || json.trim() === '') {
    return false;
  }

  try {
    JSON.parse(json);
    return true;
  } catch {
    return false;
  }
}

/**
 * Parse JSON with schema validation using Zod
 * @param json - JSON string to parse
 * @param schema - Zod schema for validation
 * @param fallback - Fallback value if parsing or validation fails
 * @param context - Context for logging
 * @returns Validated and parsed value or fallback
 */
export function parseJsonWithSchema<T>(
  json: string | null | undefined,
  schema: { safeParse: (data: unknown) => { success: boolean; data?: T } },
  fallback: T,
  context?: string,
): T {
  const parsed = tryJsonParse(json, context);

  if (parsed === null) {
    return fallback;
  }

  const result = schema.safeParse(parsed);

  if (!result.success) {
    logger.warn('JSON validation failed', {
      context,
      errors: (result as any).error?.errors,
    });
    return fallback;
  }

  return result.data!;
}

/**
 * Deep clone an object using JSON (safe version)
 * @param obj - Object to clone
 * @param fallback - Fallback value if cloning fails
 * @returns Cloned object or fallback
 */
export function safeJsonClone<T>(obj: T, fallback: T): T {
  try {
    const json = JSON.stringify(obj);
    return JSON.parse(json) as T;
  } catch (error) {
    logger.error('JSON clone failed', error);
    return fallback;
  }
}

/**
 * Remove circular references from object before JSON stringification
 */
export function removeCircularReferences(obj: any, seen = new WeakSet()): any {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }

  if (seen.has(obj)) {
    return '[Circular]';
  }

  seen.add(obj);

  if (Array.isArray(obj)) {
    return obj.map((item) => removeCircularReferences(item, seen));
  }

  const result: any = {};
  for (const [key, value] of Object.entries(obj)) {
    result[key] = removeCircularReferences(value, seen);
  }

  return result;
}

/**
 * Stringify with circular reference handling
 */
export function stringifyWithCircular(obj: any, pretty = false): string {
  try {
    return pretty ? JSON.stringify(obj, null, 2) : JSON.stringify(obj);
  } catch (error) {
    // If regular stringify fails (likely circular), remove circular refs and try again
    const cleaned = removeCircularReferences(obj);
    return pretty ? JSON.stringify(cleaned, null, 2) : JSON.stringify(cleaned);
  }
}
