# CPPartnersHeadless

This repository contains the Cal Poly Partners headless frontend. It is a Next.js application built with Faust.js and Apollo Client, using WordPress as the content source over WPGraphQL.

The site renders WordPress-managed content through Faust templates and adds several custom frontend experiences, including:

- a custom home page assembled from React sections
- paginated news and project listing pages
- WordPress-driven single pages, posts, and archives
- a site search page backed by WPGraphQL `contentNodes`
- a client-only contact/comment form submitted through Formspree

## Stack and architecture

- Next.js 14
- React 18
- Faust.js (`@faustwp/core`, `@faustwp/cli`)
- Apollo Client with custom relay-style pagination policies
- WordPress + WPGraphQL as the CMS/backend
- Sass modules for styling

### Rendering model

- `pages/index.js` and `pages/[...wordpressNode].js` hand off rendering to `WordPressTemplate` from Faust.
- `wp-templates/` contains the actual template implementations for:
  - `front-page`
  - `page`
  - `single`
  - `project`
  - `archive`
- `pages/posts/index.js`, `pages/projects/index.js`, and `pages/search.js` are custom route pages outside the default WordPress template flow.
- `pages/api/faust/[[...route]].js` exposes Faust's API router.
- `pages/preview.js` renders preview content through Faust.

### WordPress data dependencies

The frontend expects a WordPress backend with Faust and WPGraphQL enabled, plus GraphQL types/fields used directly in queries:

- standard WordPress `page`, `post`, menus, tags, categories, and general settings
- a `Project` content type with `projectFields.projectTitle`, `summary`, and `contentArea`
- a `Testimonial` content type with `testimonialFields.testimonialContent`, `testimonialAuthor`, `company`, and `jobTitle`
- post fields under `postsFields` for `publication`, `datePublished`, `author`, and `link`
- page fields under `seoControls.disableIndexing`

`DEVELOPMENT.md` also indicates the companion WordPress setup has used Atlas Content Modeler blueprint exports for `post`, `page`, `testimonial`, and `project`.

## Prerequisites

- Node.js `>=14.0.0` and npm `>=6.0.0` as declared in `package.json`
- a WordPress instance with WPGraphQL and Faust configured
- menu locations in WordPress for:
  - `PRIMARY`
  - `FOOTER`
  - `FOOTER_SECONDARY`
  - `FOOTER_TERTIARY`

## Environment variables

Verified from `.env.local.sample` and local usage:

- `NEXT_PUBLIC_WORDPRESS_URL`
  - required
  - base URL of the WordPress backend used by Faust/Next
- `FAUST_SECRET_KEY`
  - present in local `.env.local`
  - commented as optional in `.env.local.sample`
  - used by Faust preview/auth flows rather than by this repo's own application code directly

Do not commit `.env.local`; it is already ignored by `.gitignore`.

## Install and setup

1. Install dependencies:

```bash
npm install
```

2. Create `.env.local` from `.env.local.sample` and set your WordPress URL.

Example:

```dotenv
NEXT_PUBLIC_WORDPRESS_URL=https://your-wordpress-site.example
FAUST_SECRET_KEY=your-faust-secret
```

3. Make sure the WordPress backend exposes the content and menu locations listed above.

4. Start local development:

```bash
npm run dev
```

The development server uses `faust dev`.

## Available commands

### Local development

- `npm run dev`
  - starts the local Faust/Next development server
- `npm run dev:checks`
  - runs the current browser-level checks against `BASE_URL` without starting the dev server
- `npm run start`
  - starts the built production server via `faust start`

### Build and deploy-related

- `npm run build`
  - production build via `faust build`
- `npm run wpe-build`
  - same as `npm run build`; likely intended for WP Engine/Atlas build environments
- `npm run test:browser-checks:ci`
  - runs the CI-safe browser-level checks bundle (`test:nav-smoke:ci`, `test:button-state-smoke:ci`, `test:homepage-console-smoke:ci`, and `test:metadata-audit:ci`) for deploy or pull request gating
- `npm run generate`
  - regenerates `possibleTypes.json`

### Quality and maintenance

- `npm run lint`
  - runs `faust lint`
- `npm run test:nav-smoke`
  - runs the headless desktop/mobile navigation smoke suite against `BASE_URL` (defaults to `http://localhost:3002`)
- `npm run test:nav-smoke:ci`
  - same smoke suite with an explicit CI-safe `BASE_URL` fallback
- `npm run test:metadata-audit`
  - crawls internal links starting from the home page, validates required metadata on indexable pages, writes a JSON report to `artifacts/metadata-audit.json`, and fails on missing fields
- `npm run test:metadata-audit:ci`
  - same metadata audit with an explicit CI-safe `BASE_URL` fallback
- `npm run test:button-state-smoke`
  - runs Playwright-based UI checks for shared primary button states on `/search` and `/404` after entering a query that yields a visible `Load more` button
- `npm run test:button-state-smoke:ci`
  - same button-state suite with an explicit CI-safe `BASE_URL` fallback
- `npm run test:homepage-console-smoke`
  - opens the homepage in Playwright, records browser console events, and fails on any console errors
- `npm run test:homepage-console-smoke:ci`
  - same console smoke suite with an explicit CI-safe `BASE_URL` fallback
- `npm run format`
  - runs Prettier write mode across JS/JSX/Markdown/CSS/SCSS files
- `npm run format:check`
  - runs Prettier check mode
- `npm run clean`
  - deletes `.next` and `node_modules`

## Metadata audit

Standards and ownership reference: [SEO_METADATA_STANDARDS.md](SEO_METADATA_STANDARDS.md).

Run the crawler locally or in CI:

```bash
npm run test:metadata-audit
```

The audit uses Playwright to open the home page at `BASE_URL`, follows same-origin links it discovers, and validates rendered metadata on each crawled page.

By default:

- any page rendering `meta[name="robots"]` with `noindex` is skipped
- pages that resolve to 404 templates are skipped
- every discovered route is in scope

You can override those defaults with a JSON config file (`--config` or `METADATA_AUDIT_CONFIG`) to focus on actionable SEO gaps and suppress known false positives.

Required metadata on indexable pages:

- `title`
- `meta[name="description"]`
- `meta[property="og:title"]`
- `meta[property="og:description"]`
- `meta[property="og:url"]`
- `meta[property="og:image"]`

Outputs:

- JSON report written to `artifacts/metadata-audit.json` by default
- the same JSON emitted on stdout for CI log capture or piping
- summary lines emitted on stderr

Options:

- set `BASE_URL` to target a different environment
- set `METADATA_AUDIT_REPORT` to change the default report file path
- pass `--report path/to/report.json` to override the output file for a single run
- set `METADATA_AUDIT_CONFIG` to load a route/policy config file
- pass `--config path/to/config.json` to override config path for a single run
- set `METADATA_AUDIT_MAX_PAGES` to cap crawl size (default `500`)

Config schema:

```json
{
  "routes": {
    "allowlist": [],
    "denylist": []
  },
  "noindex": {
    "mode": "skip",
    "allowlist": [],
    "denylist": []
  },
  "notFound": {
    "mode": "skip",
    "allowlist": [],
    "denylist": []
  }
}
```

Policy behavior:

- `routes.allowlist`: if non-empty, only matching routes are auditable
- `routes.denylist`: matching routes are always skipped
- `noindex.mode` and `notFound.mode`: `skip` or `audit`
- `noindex.allowlist` / `notFound.allowlist`: matching routes are forced to `audit`, all others are `skip`
- `noindex.denylist` / `notFound.denylist`: matching routes are forced to `skip`
- patterns support `*` (single path segment wildcard) and `**` (multi-segment wildcard)

Example config for known noindex and 404 routes:

```json
{
  "routes": {
    "denylist": ["/preview/**"]
  },
  "noindex": {
    "mode": "audit",
    "denylist": ["/search", "/404"]
  },
  "notFound": {
    "mode": "skip"
  }
}
```

Exit behavior:

- exits `0` when every crawled indexable page has all required fields and there are no crawl errors
- exits nonzero when any indexable page is missing required metadata or when the crawler cannot load a page

## Browser checks in CI

Browser-level checks are best used as deploy or pull request gates instead of slowing down every local dev startup.

Use these commands locally when you want the same checks on demand:

- `npm run dev:checks`
- `npm run test:browser-checks:ci`

The repository GitHub Actions workflow builds the app, starts it on `http://127.0.0.1:3002`, runs the browser checks suite, and uploads the metadata audit report, the homepage console smoke report, and the app log when failures occur.

## Homepage console smoke checks

Run locally:

```bash
npm run test:homepage-console-smoke
```

Or against a different environment:

```bash
BASE_URL=https://your-env.example npm run test:homepage-console-smoke:ci
```

Default behavior:

- target route: `/`
- fails on any browser `console.error` or uncaught `pageerror`
- records warnings but does not fail on warnings unless configured
- writes a JSON report to `artifacts/console-smoke.json`

To tighten warning handling over time, provide a config file and enable warning failures:

```bash
CONSOLE_SMOKE_CONFIG=artifacts/console-smoke.config.example.json \
  npm run test:homepage-console-smoke -- --fail-on-warnings
```

Config options:

- `route`: route to test (default `/`)
- `failOnWarnings`: fail when warnings are present and not allowlisted
- `warningAllowlist`: list of warning rules to ignore temporarily
  - `{"type":"substring","value":"..."}`
  - `{"type":"regex","value":"...","flags":"i"}`

The repository includes an example config at `artifacts/console-smoke.config.example.json`.

## Button state smoke checks

Run locally:

```bash
npm run test:button-state-smoke
```

Or against a different environment:

```bash
BASE_URL=https://your-env.example npm run test:button-state-smoke:ci
```

What it verifies:

- route coverage: `/search` and `/404`
- `Load more` button default, hover, focus-visible, active/mousedown, and disabled visual states
- computed CSS values for color/background/border and focus outline
- keyboard activation behavior (`Enter` and `Space`) while focused on the button

Stability notes:

- no fixed sleep timing is used for state discovery
- each route searches with multiple query candidates until `Load more` appears
- waits rely on element presence/focus/click events and computed-style reads

Sample passing output:

```text
> npm run test:button-state-smoke

> @faustjs/atlas-blueprint-portfolio@0.2.0 test:button-state-smoke
> node scripts/button-state-smoke.mjs

[button-smoke] [route:/search] [step:load-search-results] load more button appeared for query "a"
[button-smoke] [route:/404] [step:load-search-results] load more button appeared for query "a"
{
  "baseUrl": "http://localhost:3002",
  "routes": ["/search", "/404"],
  "routeResults": [
    {
      "route": "/search",
      "searchTerm": "a",
      "keyboardActivation": { "clickCount": 2 },
      "passed": true
    },
    {
      "route": "/404",
      "searchTerm": "a",
      "keyboardActivation": { "clickCount": 2 },
      "passed": true
    }
  ],
  "passed": true
}
PASS button state smoke checks
```

Report shape example:

```json
{
  "baseUrl": "http://localhost:3002/",
  "configPath": "/absolute/path/to/metadata-audit.config.json",
  "config": {
    "routes": { "allowlist": [], "denylist": [] },
    "noindex": { "mode": "skip", "allowlist": [], "denylist": [] },
    "notFound": { "mode": "skip", "allowlist": [], "denylist": [] }
  },
  "generatedAt": "2026-06-04T00:00:00.000Z",
  "requiredFields": [
    "title",
    "description",
    "og:title",
    "og:description",
    "og:url",
    "og:image"
  ],
  "totals": {
    "crawled": 42,
    "indexable": 39,
    "passing": 37,
    "failing": 2,
    "skipped": 3,
    "crawlErrors": 0
  },
  "failures": [
    {
      "url": "/example-page",
      "missing": ["og:image"]
    }
  ],
  "crawlErrors": [],
  "pages": []
}
```

## Verified command status in this workspace

- `npm run lint`: passes
- `npm run format:check`: fails in the current workspace

The current `format:check` glob includes generated `.next` files and also reports formatting issues in tracked source files, so it is not a clean verification step as-is.

## Important directories and files

- `pages/`
  - Next.js routes, including Faust handoff pages and custom search/posts/projects routes
- `wp-templates/`
  - Faust template implementations for WordPress content types
- `components/`
  - reusable UI and content components
- `queries/`
  - standalone GraphQL queries such as site search
- `plugins/`
  - Faust/Apollo extensions, including custom template resolution for `Project` and relay-style pagination cache policies
- `constants/menus.js`
  - WordPress menu location constants expected by the frontend
- `app.config.js`
  - app-level pagination, image priority, theme color, and social link settings
- `next.config.js`
  - Next/Faust config, image domain allowlist, redirects, and caching headers
- `faust.config.js`
  - Faust setup, templates, and experimental plugins
- `possibleTypes.json`
  - GraphQL union/interface type map used by Faust/Apollo
- `DEVELOPMENT.md`
  - notes for importing/exporting the ACM blueprint in WordPress

## Notable implementation details

- The home page is not a generic starter page; it is a custom Cal Poly Partners landing page assembled from section components such as `HomepageIntro`, `HomepageNonprofit`, `HomepageCampusLife`, `HomepageAdvancing`, and others.
- Google Analytics is hardcoded in `pages/_app.js` with tracking ID `G-1KSLJ61R0V`.
- The search page performs client-side GraphQL search queries against `contentNodes`.
- The page template supports a special content token, `<!-- FORMSPREE_CONTACT -->`, which is replaced with a mounted React contact form.
- The Formspree form ID is hardcoded in `components/ContactForm/ContactForm.js`.
- News content appears in two places:
  - `/posts` is a dedicated paginated listing page
  - the WordPress page with slug `news` also renders a paginated post list beneath its page content

## Known gaps / TODOs verified from the repo

- The package name in `package.json` is still the starter blueprint name: `@faustjs/atlas-blueprint-portfolio`.
- The root `README.md` was previously still starter boilerplate, which is what this rewrite replaces.
- `npm run format:check` currently scans `.next` build output because the glob is `./**/*.{js,jsx,md,mdx,css,scss}` rather than being limited to source files.
- `.env.local.sample` does not clearly state whether `FAUST_SECRET_KEY` is required for this project's preview flow, even though a real value exists in local `.env.local`.
- The contact form implementation is specific to a Cal Poly Partners board-meeting comment workflow and is not currently configurable through environment variables or CMS content.

## Assumptions and unclear areas

These points are intentionally not overstated because they are not fully provable from the frontend repo alone:

- Deployment appears to target WP Engine Atlas or a similar Faust-compatible environment, based on the starter lineage, `wpe-build` script, and linked blueprint/dev docs.
- The exact WordPress plugin/theme setup is not fully described in this repo; `DEVELOPMENT.md` references Atlas Content Modeler, Faust, and a `twentytwentythree` export workflow, but the live CMS configuration is external to this codebase.
- The repo contains `.env.local` with active values, but this README does not reproduce secrets or treat local values as portable defaults.
