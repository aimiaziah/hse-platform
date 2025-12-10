import { Html, Head, Main, NextScript } from 'next/document';
import React from 'react';

export default function Document() {
  return (
    <Html lang="en">
      <Head>
        {/* PWA and SEO meta tags are handled in _app.tsx and layouts */}
        {/* Additional document-level head elements can go here */}
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}

