import { getPublicSiteOrigin } from '../utilities/normalizeInternalLink';

const PRODUCTION_HOSTNAMES = new Set([
  'calpolypartners.org',
  'www.calpolypartners.org',
]);

function isProductionOrigin(origin) {
  try {
    const { hostname } = new URL(origin);
    return PRODUCTION_HOSTNAMES.has(hostname);
  } catch {
    return false;
  }
}

function shouldAllowIndexing(origin) {
  // Explicit env overrides win for environments that do not expose VERCEL_ENV.
  if (process.env.NEXT_PUBLIC_ROBOTS_DISALLOW_ALL === 'true') {
    return false;
  }

  if (process.env.NEXT_PUBLIC_ROBOTS_ALLOW_ALL === 'true') {
    return true;
  }

  if (process.env.VERCEL_ENV) {
    return process.env.VERCEL_ENV === 'production';
  }

  return process.env.NODE_ENV === 'production' && isProductionOrigin(origin);
}

function buildRobotsTxt() {
  const origin = getPublicSiteOrigin();
  const allowIndexing = shouldAllowIndexing(origin);

  if (!allowIndexing) {
    return [
      'User-agent: *',
      'Disallow: /',
      '',
    ].join('\n');
  }

  return [
    'User-agent: *',
    'Allow: /',
    'Disallow: /api/',
    'Disallow: /preview/',
    'Disallow: /_next/',
    'Allow: /_next/static/',
    'Allow: /_next/image',
    'Disallow: /404',
    '',
    `Sitemap: ${origin}/sitemap.xml`,
    '',
  ].join('\n');
}

export async function getServerSideProps({ res }) {
  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400');
  res.write(buildRobotsTxt());
  res.end();

  return {
    props: {},
  };
}

export default function RobotsTxt() {
  return null;
}