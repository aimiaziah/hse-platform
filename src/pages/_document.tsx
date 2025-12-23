import { Html, Head, Main, NextScript } from 'next/document';
import React from 'react';

export default function Document() {
  return (
    <Html lang="en">
      <Head>
        {/* Material Icons Font */}
        <link href="https://fonts.googleapis.com/icon?family=Material+Icons" rel="stylesheet" />
        
        {/* Favicon */}
        <link rel="icon" href="/theta-logo.png" />
        <link rel="shortcut icon" href="/theta-logo.png" />
        
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
