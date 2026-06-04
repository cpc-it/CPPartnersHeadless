import { Head, Html, Main, NextScript } from 'next/document';

const typekitStylesheets = [
  // Keep a single Typekit kit for Utopia/Abolition families used in the UI.
  'https://use.typekit.net/mfv5sni.css',
];

export default function Document() {
  return (
    <Html>
      <Head>
        <link rel="preconnect" href="https://use.typekit.net" />
        <link rel="preconnect" href="https://p.typekit.net" crossOrigin="anonymous" />

        {typekitStylesheets.map((href) => (
          <link key={`${href}-preload`} rel="preload" as="style" href={href} />
        ))}
        {typekitStylesheets.map((href) => (
          <link key={`${href}-stylesheet`} rel="stylesheet" href={href} />
        ))}
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}