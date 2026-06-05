const DEFAULT_PUBLIC_SITE_ORIGIN = 'https://calpolypartners.org';
const BACKEND_HOSTS = ['hesj5f3wy23f0l5rw0mrh6jsg.js.wpenginepowered.com'];

function getPublicSiteUrl() {
  try {
    return new URL(process.env.NEXT_PUBLIC_SITE_URL || DEFAULT_PUBLIC_SITE_ORIGIN);
  } catch {
    return new URL(DEFAULT_PUBLIC_SITE_ORIGIN);
  }
}

export function getPublicSiteOrigin() {
  return getPublicSiteUrl().origin;
}

function getKnownBackendHosts() {
  const hosts = new Set(BACKEND_HOSTS);
  const wordpressUrl = process.env.NEXT_PUBLIC_WORDPRESS_URL;

  if (wordpressUrl) {
    try {
      hosts.add(new URL(wordpressUrl).hostname);
    } catch {
      // Ignore invalid environment values and fall back to the known host list.
    }
  }

  return hosts;
}

export function normalizeInternalLink(href, { absolute = false } = {}) {
  if (!href || /^(#|mailto:|tel:|javascript:)/i.test(href)) {
    return href;
  }

  const publicSiteUrl = getPublicSiteUrl();

  if (href.startsWith('/')) {
    return absolute ? `${publicSiteUrl.origin}${href}` : href;
  }

  try {
    const parsedUrl = new URL(href, publicSiteUrl.origin);
    const knownBackendHosts = getKnownBackendHosts();
    const isInternalHost =
      parsedUrl.hostname === publicSiteUrl.hostname ||
      knownBackendHosts.has(parsedUrl.hostname);

    if (!isInternalHost) {
      return href;
    }

    const normalizedPath = `${parsedUrl.pathname}${parsedUrl.search}${parsedUrl.hash}` || '/';

    return absolute ? `${publicSiteUrl.origin}${normalizedPath}` : normalizedPath;
  } catch {
    return href;
  }
}

function normalizePathname(pathname, { trailingSlash = true } = {}) {
  if (!pathname || pathname === '/') {
    return '/';
  }

  const hasFileExtension = /\/[^/]+\.[^/]+$/.test(pathname);

  if (hasFileExtension) {
    return pathname;
  }

  if (trailingSlash) {
    return pathname.endsWith('/') ? pathname : `${pathname}/`;
  }

  return pathname.endsWith('/') ? pathname.slice(0, -1) : pathname;
}

export function normalizeMetadataUrl(
  href,
  {
    includeQuery = false,
    includeHash = false,
    trailingSlash = true,
    allowExternal = true,
  } = {}
) {
  if (!href || /^(#|mailto:|tel:|javascript:|data:)/i.test(href)) {
    return undefined;
  }

  const publicSiteUrl = getPublicSiteUrl();

  try {
    const parsedUrl = new URL(href, publicSiteUrl.origin);
    const knownBackendHosts = getKnownBackendHosts();
    const isInternalHost =
      parsedUrl.hostname === publicSiteUrl.hostname ||
      knownBackendHosts.has(parsedUrl.hostname);

    if (!isInternalHost && !allowExternal) {
      return undefined;
    }

    const outputOrigin = isInternalHost ? publicSiteUrl.origin : parsedUrl.origin;
    const pathname = normalizePathname(parsedUrl.pathname, { trailingSlash });
    const search = includeQuery ? parsedUrl.search : '';
    const hash = includeHash ? parsedUrl.hash : '';

    return `${outputOrigin}${pathname}${search}${hash}`;
  } catch {
    return undefined;
  }
}

export function rewriteBackendLinksInHtml(html) {
  if (!html) {
    return html;
  }

  return html.replace(
    /(href\s*=\s*["'])([^"']+)(["'])/gi,
    (_, prefix, href, suffix) => `${prefix}${normalizeInternalLink(href)}${suffix}`
  );
}
