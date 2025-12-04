// SharePoint OAuth Callback Page
// Handles the redirect from Microsoft after user authenticates
import { useEffect } from 'react';
import { useRouter } from 'next/router';

export default function SharePointCallback() {
  const router = useRouter();

  useEffect(() => {
    // Parse the URL fragment (Microsoft returns token in hash for implicit flow)
    const hash = window.location.hash.substring(1);
    const params = new URLSearchParams(hash);

    const access_token = params.get('access_token');
    const state = params.get('state');
    const error = params.get('error');
    const error_description = params.get('error_description');
    const expires_in = params.get('expires_in');

    // Send message to parent window (the popup opener)
    if (window.opener) {
      window.opener.postMessage(
        {
          type: 'sharepoint-oauth-callback',
          access_token,
          state,
          error,
          error_description,
          expires_in: expires_in ? parseInt(expires_in, 10) : null,
        },
        window.location.origin,
      );

      // Close this popup window
      window.close();
    } else {
      // If not opened as popup, redirect to home
      console.error('OAuth callback not opened as popup');
      router.push('/');
    }
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4" />
        <p className="text-gray-600">Completing authentication...</p>
        <p className="text-sm text-gray-500 mt-2">This window will close automatically</p>
      </div>
    </div>
  );
}
