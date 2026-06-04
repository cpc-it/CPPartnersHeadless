import { Head, Html, Main, NextScript } from 'next/document';

const typekitStylesheets = [
  'https://use.typekit.net/umi1lem.css',
  'https://use.typekit.net/mfv5sni.css',
  'https://use.typekit.net/qnm1phw.css',
  'https://use.typekit.net/ato6pec.css',
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