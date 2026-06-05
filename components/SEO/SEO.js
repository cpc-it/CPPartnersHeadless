import Head from 'next/head';
import { useRouter } from 'next/router';
import { getPublicSiteOrigin } from '../../utilities/normalizeInternalLink';

const DEFAULT_SOCIAL_IMAGE_PATH = '/static/banner.jpeg';

function toAbsoluteUrl(url) {
  if (!url) {
    return undefined;
  }

  if (/^https?:\/\//i.test(url)) {
    return url;
  }

  if (url.startsWith('//')) {
    return `https:${url}`;
  }

  const origin = getPublicSiteOrigin();

  return url.startsWith('/') ? `${origin}${url}` : `${origin}/${url}`;
}

/**
 * Provide SEO related meta tags to a page.
 *
 * @param {Props} props The props object.
 * @param {string} props.title Used for the page title, og:title, twitter:title, etc.
 * @param {string} props.description Used for the meta description, og:description, twitter:description, etc.
 * @param {string} props.keywords Used for the keywords meta tag.
 * @param {string} props.imageUrl Used for the og:image and twitter:image.
 * @param {string} props.url Used for the og:url and twitter:url. When omitted, derived from the current path and site base URL.
 *
 * @returns {React.ReactElement} The SEO component
 */
export default function SEO({
  title,
  description,
  keywords,
  imageUrl,
  url,
  noindex = false,
}) {
  const router = useRouter();
  const fallbackImageUrl = noindex
    ? undefined
    : `${getPublicSiteOrigin()}${DEFAULT_SOCIAL_IMAGE_PATH}`;
  const effectiveImageUrl = toAbsoluteUrl(imageUrl) || fallbackImageUrl;

  // Use the explicit url prop when provided; otherwise derive from current path for indexable pages.
  const effectiveUrl = url || (!noindex ? `${getPublicSiteOrigin()}${router.asPath}` : undefined);

  if (!title && !description && !keywords && !effectiveImageUrl && !effectiveUrl && !noindex) {
    return null;
  }

  return (
    <>
      <Head>
        <meta property="og:type" content="website" />
        <meta property="twitter:card" content="summary_large_image" />

        {noindex && <meta name="robots" content="noindex, nofollow" />}

        {title && (
          <>
            <title>{title}</title>
            <meta name="title" content={title} />
            <meta property="og:title" content={title} />
            <meta property="twitter:title" content={title} />
          </>
        )}

        {description && (
          <>
            <meta name="description" content={description} />
            <meta property="og:description" content={description} />
            <meta property="twitter:description" content={description} />
          </>
        )}

        {keywords && <meta name="keywords" content={keywords} />}

        {effectiveImageUrl && (
          <>
            <meta property="og:image" content={effectiveImageUrl} />
            <meta property="twitter:image" content={effectiveImageUrl} />
          </>
        )}

        {effectiveUrl && (
          <>
            <meta property="og:url" content={effectiveUrl} />
            <meta property="twitter:url" content={effectiveUrl} />
          </>
        )}
      </Head>
    </>
  );
}
