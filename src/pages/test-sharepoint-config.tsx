// Temporary test page to verify SharePoint OAuth configuration
import { useEffect, useState } from 'react';
import { isSharePointOAuthConfigured } from '@/utils/sharepoint-oauth';

export default function TestSharePointConfig() {
  const [config, setConfig] = useState({
    clientId: '',
    tenantId: '',
    isConfigured: false,
    origin: '',
  });

  useEffect(() => {
    setConfig({
      clientId: process.env.NEXT_PUBLIC_SHAREPOINT_OAUTH_CLIENT_ID || 'NOT SET',
      tenantId: process.env.NEXT_PUBLIC_SHAREPOINT_TENANT_ID || 'NOT SET',
      isConfigured: isSharePointOAuthConfigured(),
      origin: typeof window !== 'undefined' ? window.location.origin : 'N/A',
    });
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-2xl mx-auto bg-white rounded-lg shadow-lg p-6">
        <h1 className="text-2xl font-bold mb-6">SharePoint OAuth Configuration Test</h1>

        <div className="space-y-4">
          <div className="border-b pb-3">
            <h2 className="font-semibold text-gray-700">Client ID:</h2>
            <p
              className={`font-mono text-sm ${
                config.clientId === 'NOT SET' ? 'text-red-600' : 'text-green-600'
              }`}
            >
              {config.clientId}
            </p>
          </div>

          <div className="border-b pb-3">
            <h2 className="font-semibold text-gray-700">Tenant ID:</h2>
            <p
              className={`font-mono text-sm ${
                config.tenantId === 'NOT SET' ? 'text-red-600' : 'text-green-600'
              }`}
            >
              {config.tenantId}
            </p>
          </div>

          <div className="border-b pb-3">
            <h2 className="font-semibold text-gray-700">Is Configured:</h2>
            <p className={`font-bold ${config.isConfigured ? 'text-green-600' : 'text-red-600'}`}>
              {config.isConfigured ? '✅ YES' : '❌ NO'}
            </p>
          </div>

          <div className="border-b pb-3">
            <h2 className="font-semibold text-gray-700">Current Origin (for redirect URI):</h2>
            <p className="font-mono text-sm text-blue-600">{config.origin}</p>
          </div>

          <div className="border-b pb-3">
            <h2 className="font-semibold text-gray-700">Expected Redirect URI:</h2>
            <p className="font-mono text-sm text-purple-600">{config.origin}/sharepoint-callback</p>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded p-4 mt-6">
            <h3 className="font-semibold text-blue-900 mb-2">✅ What Should Be True:</h3>
            <ul className="list-disc list-inside space-y-1 text-sm text-blue-800">
              <li>Client ID should NOT be &quot;NOT SET&quot;</li>
              <li>Tenant ID should NOT be &quot;NOT SET&quot;</li>
              <li>Is Configured should be &quot;✅ YES&quot;</li>
              <li>The redirect URI above should be added in Azure Portal</li>
            </ul>
          </div>

          {!config.isConfigured && (
            <div className="bg-red-50 border border-red-200 rounded p-4 mt-4">
              <h3 className="font-semibold text-red-900 mb-2">❌ Configuration Issue Detected!</h3>
              <p className="text-sm text-red-800">
                SharePoint OAuth is not properly configured. Please check your .env.local file and
                make sure it contains:
              </p>
              <pre className="mt-2 bg-gray-800 text-white p-2 rounded text-xs overflow-x-auto">
                {`NEXT_PUBLIC_SHAREPOINT_OAUTH_CLIENT_ID=your_client_id
NEXT_PUBLIC_SHAREPOINT_TENANT_ID=your_tenant_id`}
              </pre>
              <p className="text-sm text-red-800 mt-2">
                After updating .env.local, restart your dev server:{' '}
                <code className="bg-gray-200 px-1 rounded">npm run dev</code>
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
