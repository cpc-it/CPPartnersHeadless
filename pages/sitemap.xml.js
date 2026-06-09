import { getPublicSiteOrigin, normalizeMetadataUrl } from '../utilities/normalizeInternalLink';

const DEFAULT_WORDPRESS_ORIGIN = 'https://cms.calpolypartners.org';
const PAGE_SIZE = 100;
const MAX_URLS = 5000;

const CONTENT_NODES_QUERY = `
  query SitemapContentNodes($first: Int!, $after: String) {
    contentNodes(first: $first, after: $after, where: { status: PUBLISH }) {
      nodes {
        uri
        modified
      }
      pageInfo {
        hasNextPage
        endCursor
      }
    }
  }
`;

function getWordPressGraphqlEndpoint() {
  const wordpressOrigin = process.env.NEXT_PUBLIC_WORDPRESS_URL || DEFAULT_WORDPRESS_ORIGIN;
  return `${wordpressOrigin.replace(/\/$/, '')}/graphql`;
}

function toCanonicalAbsoluteUrl(value) {
  if (!value || typeof value !== 'string') {
    return undefined;
  }

  return normalizeMetadataUrl(value, {
    includeQuery: false,
    includeHash: false,
    trailingSlash: true,
    allowExternal: false,
  });
}

function escapeXml(value) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function safeLastMod(value) {
  if (!value) {
    return undefined;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return undefined;
  }

  return date.toISOString();
}

async function fetchContentNodeBatch({ first, after }) {
  const response = await fetch(getWordPressGraphqlEndpoint(), {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      query: CONTENT_NODES_QUERY,
      variables: { first, after },
    }),
  });

  if (!response.ok) {
    throw new Error(`Failed GraphQL request for sitemap: ${response.status}`);
  }

  const payload = await response.json();

  if (payload?.errors?.length) {
    throw new Error(`GraphQL errors while building sitemap: ${payload.errors[0]?.message || 'Unknown error'}`);
  }

  return payload?.data?.contentNodes ?? { nodes: [], pageInfo: { hasNextPage: false, endCursor: null } };
}

async function collectSitemapEntries() {
  const entries = [];
  const seen = new Set();
  let after = null;
  let hasNextPage = true;

  while (hasNextPage && entries.length < MAX_URLS) {
    const batch = await fetchContentNodeBatch({ first: PAGE_SIZE, after });

    for (const node of batch.nodes ?? []) {
      const canonical = toCanonicalAbsoluteUrl(node?.uri);

      if (!canonical || canonical.endsWith('/404/')) {
        continue;
      }

      if (seen.has(canonical)) {
        continue;
      }

      seen.add(canonical);
      entries.push({
        loc: canonical,
        lastmod: safeLastMod(node?.modified),
      });
    }

    hasNextPage = Boolean(batch.pageInfo?.hasNextPage);
    after = batch.pageInfo?.endCursor ?? null;
  }

  // Ensure key index pages are present even if not returned by GraphQL.
  for (const path of ['/', '/posts/', '/projects/', '/search/']) {
    const url = toCanonicalAbsoluteUrl(`${getPublicSiteOrigin()}${path}`);
    if (url && !seen.has(url)) {
      seen.add(url);
      entries.push({ loc: url });
    }
  }

  return entries;
}

function buildSitemapXml(entries) {
  const lines = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
  ];

  for (const entry of entries) {
    lines.push('  <url>');
    lines.push(`    <loc>${escapeXml(entry.loc)}</loc>`);
    if (entry.lastmod) {
      lines.push(`    <lastmod>${entry.lastmod}</lastmod>`);
    }
    lines.push('  </url>');
  }

  lines.push('</urlset>');

  return lines.join('\n');
}

export async function getServerSideProps({ res }) {
  try {
    const entries = await collectSitemapEntries();
    const xml = buildSitemapXml(entries);

    res.setHeader('Content-Type', 'application/xml; charset=utf-8');
    res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400');
    res.write(xml);
  } catch (error) {
    const fallbackXml = buildSitemapXml([{ loc: `${getPublicSiteOrigin()}/` }]);
    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/xml; charset=utf-8');
    res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=600');
    res.write(fallbackXml);
    console.error(error);
  }

  res.end();

  return {
    props: {},
  };
}

export default function SitemapXml() {
  return null;
}