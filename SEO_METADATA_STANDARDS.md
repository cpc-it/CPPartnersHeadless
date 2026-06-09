# SEO Metadata Standards

This document defines the required metadata contract for all indexable pages in this repo and the process to keep it current.

## Scope

- Applies to all routes that render [components/SEO/SEO.js](components/SEO/SEO.js).
- Applies to custom routes in [pages](pages) and WordPress templates in [wp-templates](wp-templates).
- Noindex routes are intentionally excluded from required field checks unless explicitly audited.

## Required Tags

Required on every indexable page:

- `title`
- `meta[name="description"]`
- `meta[property="og:title"]`
- `meta[property="og:description"]`
- `meta[property="og:url"]`
- `meta[property="og:image"]`

Always emitted by `SEO` component regardless of page type:

- `meta[property="og:type"]` = `website`
- `meta[property="twitter:card"]` = `summary_large_image`
- `script[type="application/ld+json"]` with baseline schema graph:
  - `Organization`
  - `WebSite` (with `SearchAction`)
  - page entity (`WebPage` by default or template-specific subtype such as `SearchResultsPage` / `CollectionPage`)

Conditional tags:

- `meta[name="robots"]` = `noindex, nofollow` when `noindex` is set.
- `link[rel="canonical"]` emitted when effective URL is available.
- `meta[property="twitter:title"]`, `meta[property="twitter:description"]`, `meta[property="twitter:url"]`, `meta[property="twitter:image"]` emitted when their corresponding values are available.

## Required Inputs Per Page Type

All page templates must render `SEO` and pass `title`, `description`, `keywords`, and `url` explicitly.

- Front page: [wp-templates/front-page.js](wp-templates/front-page.js)
- WordPress page template: [wp-templates/page.js](wp-templates/page.js)
- Post template: [wp-templates/single.js](wp-templates/single.js)
- Project template: [wp-templates/project.js](wp-templates/project.js)
- Archive template: [wp-templates/archive.js](wp-templates/archive.js)
- Posts index: [pages/posts/index.js](pages/posts/index.js)
- Projects index: [pages/projects/index.js](pages/projects/index.js)
- Search page: [pages/search.js](pages/search.js)
- 404 page: [pages/404.js](pages/404.js) (`noindex` required)

For new page types, do not rely on implicit URL derivation; pass an absolute URL built with `normalizeInternalLink(pathOrUri, { absolute: true })`.

## Defaults and Fallback Rules

### URL

Source of truth: [components/SEO/SEO.js](components/SEO/SEO.js) and [utilities/normalizeInternalLink.js](utilities/normalizeInternalLink.js).

- Preferred: explicit `url` prop from template/page.
- If `url` is omitted and page is indexable, URL falls back to `router.asPath`.
- Effective URL is normalized through `normalizeMetadataUrl()`:
  - rewrites known backend hosts to `NEXT_PUBLIC_SITE_URL` origin
  - strips query and hash by default
  - enforces trailing slash on page-like paths
- If page is `noindex` and `url` is omitted, no canonical/`og:url`/`twitter:url` is emitted.

### Image

Source of truth: [components/SEO/SEO.js](components/SEO/SEO.js).

- Preferred: explicit `imageUrl` prop.
- `imageUrl` is converted to an absolute URL if needed.
- For indexable pages without `imageUrl`, fallback is `${getPublicSiteOrigin()}/static/banner.jpeg`.
- For `noindex` pages without `imageUrl`, no fallback image is emitted.

### Description and Keywords

Template convention (recommended):

- Build descriptions with `buildMetaDescription()` from [utilities/seoMeta.js](utilities/seoMeta.js).
- Build keywords with `buildKeywordString()` from [utilities/seoMeta.js](utilities/seoMeta.js).

## Ownership and Update Responsibilities

Engineering owner:

- Frontend maintainers of this repo own metadata behavior in:
  - [components/SEO/SEO.js](components/SEO/SEO.js)
  - [utilities/normalizeInternalLink.js](utilities/normalizeInternalLink.js)
  - [utilities/seoMeta.js](utilities/seoMeta.js)
  - [scripts/metadata-audit.mjs](scripts/metadata-audit.mjs)

Template owner:

- Authors editing files in [pages](pages) or [wp-templates](wp-templates) must keep `SEO` inputs complete (`title`, `description`, `keywords`, `url`, optional `imageUrl`, `noindex` when applicable).

Content owner:

- WordPress content editors own content quality (title/body/featured image/summary fields) that drives generated metadata values.

## Testing Workflow

Run metadata checks before merge:

```bash
npm run test:metadata-audit
```

Run full browser checks bundle:

```bash
npm run test:browser-checks:ci
```

Notes:

- Audit script: [scripts/metadata-audit.mjs](scripts/metadata-audit.mjs)
- Default report: [artifacts/metadata-audit.json](artifacts/metadata-audit.json)
- Configurable policy file example: [artifacts/metadata-audit.config.example.json](artifacts/metadata-audit.config.example.json)
- Use `--config` (or `METADATA_AUDIT_CONFIG`) when routes are intentionally `noindex` or 404 to reduce false positives.

## Release Checklist

1. Verify every changed/new template page renders `SEO`.
2. Verify explicit absolute `url` is passed from each changed/new template.
3. Verify metadata image behavior: explicit image or approved fallback.
4. Verify `noindex` is set for non-indexable routes (for example, 404 and any intentionally blocked route).
5. Run `npm run test:metadata-audit` and confirm zero missing required fields on indexable pages.
6. Run `npm run test:browser-checks:ci` before release cut.
7. Review report output in [artifacts/metadata-audit.json](artifacts/metadata-audit.json) when checks fail and fix root cause (template inputs first, config changes second).

## When to Update This Doc

Update this file in the same PR whenever any of the following changes:

- Required metadata fields in [scripts/metadata-audit.mjs](scripts/metadata-audit.mjs)
- Fallback/default behavior in [components/SEO/SEO.js](components/SEO/SEO.js)
- URL normalization behavior in [utilities/normalizeInternalLink.js](utilities/normalizeInternalLink.js)
- New route/page type that introduces a new metadata pattern