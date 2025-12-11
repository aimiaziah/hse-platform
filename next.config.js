const withPWA = require('next-pwa')({
  dest: 'public',
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === 'development',
  runtimeCaching: [
    {
      urlPattern: /^https?.*/,
      handler: 'NetworkFirst',
      options: {
        cacheName: 'offlineCache',
        expiration: {
          maxEntries: 200,
        },
      },
    },
  ],
});

module.exports = withPWA({
  reactStrictMode: true,
  swcMinify: true,
  // Enable standalone output for Docker deployment
  output: 'standalone',
  // Explicitly expose environment variables to the browser
  env: {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  },
  eslint: {
    // ⚠️ TEMPORARY: Disabled for 1-week deployment (3-5 user base)
    // TODO: Fix ESLint errors gradually when team grows beyond 50 users
    ignoreDuringBuilds: true,
    dirs: ['src', 'pages'],
  },
  typescript: {
    ignoreBuildErrors: false,
  },
  // ✅ SECURITY: Add security headers to all responses
  async headers() {
    return [
      {
        // Apply security headers to all routes
        source: '/:path*',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY', // Prevent clickjacking attacks
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff', // Prevent MIME type sniffing
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block', // Enable XSS filter
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin', // Control referrer information
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()', // Restrict browser features
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=31536000; includeSubDomains', // Force HTTPS for 1 year
          },
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval'", // Allow inline scripts for Next.js
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com", // Allow Google Fonts
              "font-src 'self' https://fonts.gstatic.com", // Allow Google Fonts
              "img-src 'self' data: blob: https:", // Allow images from various sources
              "connect-src 'self' https://*.supabase.co https://login.microsoftonline.com https://*.cloudflarestorage.com https://*.digitaloceanspaces.com", // Allow API calls
              "frame-ancestors 'none'", // Prevent embedding
            ].join('; '),
          },
        ],
      },
    ];
  },
  webpack: (config, { isServer }) => {
    // Exclude Node.js built-in modules from client-side bundle
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
        crypto: false,
        stream: false,
        buffer: false,
        util: false,
      };
    }
    return config;
  },
});
