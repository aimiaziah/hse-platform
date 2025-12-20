// Helper for PKCE (Proof Key for Code Exchange) flow

/**
 * Store code verifier in cookie for server-side access
 */
export function storePKCEVerifier(codeVerifier: string): void {
  if (typeof document !== 'undefined') {
    // Store in cookie with 10 minute expiration
    const expires = new Date(Date.now() + 10 * 60 * 1000).toUTCString();
    document.cookie = `pkce_verifier=${codeVerifier}; expires=${expires}; path=/; SameSite=Lax`;
  }
}

/**
 * Retrieve and delete code verifier from cookie
 */
export function retrievePKCEVerifier(cookieHeader?: string): string | null {
  const cookies = cookieHeader || (typeof document !== 'undefined' ? document.cookie : '');

  const match = cookies.match(/pkce_verifier=([^;]+)/);
  const verifier = match ? match[1] : null;

  // Delete cookie after retrieval
  if (typeof document !== 'undefined' && verifier) {
    document.cookie = 'pkce_verifier=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
  }

  return verifier;
}

/**
 * Parse cookie header server-side
 */
export function parseCookies(cookieHeader: string): Record<string, string> {
  const cookies: Record<string, string> = {};

  if (!cookieHeader) return cookies;

  cookieHeader.split(';').forEach((cookie) => {
    const [name, value] = cookie.trim().split('=');
    if (name && value) {
      cookies[name] = decodeURIComponent(value);
    }
  });

  return cookies;
}
