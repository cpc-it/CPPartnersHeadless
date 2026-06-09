import { normalizeMetadataUrl } from './normalizeInternalLink';

function humanizeSegment(segment = '') {
  return decodeURIComponent(segment)
    .replace(/[-_]+/g, ' ')
    .replace(/\b\w/g, (character) => character.toUpperCase())
    .trim();
}

export default function buildBreadcrumbs({ url, title, trail = [] }) {
  const normalizedUrl = normalizeMetadataUrl(url);

  if (!normalizedUrl) {
    return [];
  }

  const parsedUrl = new URL(normalizedUrl);
  const segments = parsedUrl.pathname.split('/').filter(Boolean);
  const homeItem = {
    name: 'Home',
    url: `${parsedUrl.origin}/`,
  };

  if (trail.length > 0) {
    return [
      homeItem,
      ...trail.map((item) => ({
        name: item.name,
        url: normalizeMetadataUrl(item.url, { allowExternal: false }),
      })),
      {
        name: title,
        url: normalizedUrl,
      },
    ].filter((item) => item.name && item.url);
  }

  const derivedItems = [];

  if (segments.length > 1) {
    segments.slice(0, -1).forEach((segment, index) => {
      derivedItems.push({
        name: humanizeSegment(segment),
        url: `${parsedUrl.origin}/${segments.slice(0, index + 1).join('/')}/`,
      });
    });
  }

  return [
    homeItem,
    ...derivedItems,
    {
      name: title,
      url: normalizedUrl,
    },
  ].filter((item) => item.name && item.url);
}