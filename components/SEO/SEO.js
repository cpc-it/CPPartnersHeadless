import Head from 'next/head';
import { useRouter } from 'next/router';

import {
  getPublicSiteOrigin,
  normalizeMetadataUrl,
} from '../../utilities/normalizeInternalLink';

const DEFAULT_SOCIAL_IMAGE_PATH = '/static/banner.webp';
const DEFAULT_ORGANIZATION_NAME = 'Cal Poly Partners';

function compactSchemaValue(value) {
  if (Array.isArray(value)) {
    return value
      .map(compactSchemaValue)
      .filter((item) => item !== undefined);
  }

  if (value && typeof value === 'object') {
    const cleanedObject = Object.entries(value).reduce((acc, [key, nestedValue]) => {
      const cleanedValue = compactSchemaValue(nestedValue);

      if (
        cleanedValue === undefined ||
        (Array.isArray(cleanedValue) && cleanedValue.length === 0)
      ) {
        return acc;
      }

      acc[key] = cleanedValue;
      return acc;
    }, {});

    return Object.keys(cleanedObject).length > 0 ? cleanedObject : undefined;
  }

  if (value === undefined || value === null || value === '') {
    return undefined;
  }

  return value;
}

function serializeJsonLd(payload) {
  return JSON.stringify(payload)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026');
}

function buildBreadcrumbSchema({ effectiveUrl, breadcrumbs }) {
  if (!effectiveUrl || !Array.isArray(breadcrumbs) || breadcrumbs.length < 2) {
    return undefined;
  }

  return {
    '@type': 'BreadcrumbList',
    '@id': `${effectiveUrl.replace(/\/$/, '')}/#breadcrumb`,
    itemListElement: breadcrumbs.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  };
}

function buildSchemaGraph({
  schemaType,
  siteName,
  title,
  description,
  effectiveUrl,
  effectiveImageUrl,
  breadcrumbs,
  additionalSchemaEntities,
}) {
  const origin = getPublicSiteOrigin();
  const organizationName = siteName || DEFAULT_ORGANIZATION_NAME;
  const organizationId = `${origin}/#organization`;
  const websiteId = `${origin}/#website`;
  const webpageId = `${(effectiveUrl || origin).replace(/\/$/, '')}/#webpage`;

  const baseGraph = [
    {
      '@type': 'Organization',
      '@id': organizationId,
      name: organizationName,
      url: origin,
    },
    {
      '@type': 'WebSite',
      '@id': websiteId,
      url: origin,
      name: organizationName,
      publisher: {
        '@id': organizationId,
      },
      inLanguage: 'en-US',
      potentialAction: {
        '@type': 'SearchAction',
        target: `${origin}/search/?search={search_term_string}`,
        'query-input': 'required name=search_term_string',
      },
    },
    {
      '@type': schemaType,
      '@id': webpageId,
      url: effectiveUrl,
      name: title || organizationName,
      description,
      isPartOf: {
        '@id': websiteId,
      },
      about: {
        '@id': organizationId,
      },
      inLanguage: 'en-US',
      primaryImageOfPage: effectiveImageUrl
        ? {
            '@type': 'ImageObject',
            url: effectiveImageUrl,
          }
        : undefined,
    },
  ];
  const extraEntities = Array.isArray(additionalSchemaEntities)
    ? additionalSchemaEntities
    : additionalSchemaEntities
    ? [additionalSchemaEntities]
    : [];
  const breadcrumbSchema = buildBreadcrumbSchema({
    effectiveUrl,
    breadcrumbs,
  });

  const schemaPayload = {
    '@context': 'https://schema.org',
    '@graph': [...baseGraph, breadcrumbSchema, ...extraEntities],
  };

  return compactSchemaValue(schemaPayload);
}

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
 * @param {object[]} props.breadcrumbs Breadcrumb trail used to emit BreadcrumbList schema.
 * @param {string} props.siteName Used for Organization and WebSite schema names.
 * @param {string} props.schemaType Used for the current page schema type.
 * @param {object|object[]} props.additionalSchemaEntities Additional schema.org entities appended to the JSON-LD graph.
 *
 * @returns {React.ReactElement} The SEO component
 */
export default function SEO({
  title,
  description,
  keywords,
  imageUrl,
  url,
  breadcrumbs,
  siteName,
  schemaType = 'WebPage',
  additionalSchemaEntities,
  noindex = false,
}) {
  const router = useRouter();
  const fallbackImageUrl = noindex
    ? undefined
    : `${getPublicSiteOrigin()}${DEFAULT_SOCIAL_IMAGE_PATH}`;
  const effectiveImageUrl = toAbsoluteUrl(imageUrl) || fallbackImageUrl;

  // Use the explicit url prop when provided; otherwise derive from current path for indexable pages.
  const effectiveUrl = normalizeMetadataUrl(url || (!noindex ? router.asPath : undefined));
  const schemaGraph = !noindex
    ? buildSchemaGraph({
        schemaType,
        siteName,
        title,
        description,
        effectiveUrl,
        effectiveImageUrl,
        breadcrumbs,
        additionalSchemaEntities,
      })
    : undefined;

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
            <link rel="canonical" href={effectiveUrl} />
            <meta property="og:url" content={effectiveUrl} />
            <meta property="twitter:url" content={effectiveUrl} />
          </>
        )}

        {schemaGraph && (
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{
              __html: serializeJsonLd(schemaGraph),
            }}
          />
        )}
      </Head>
    </>
  );
}
