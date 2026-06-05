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
- `npm run start`
  - starts the built production server via `faust start`

### Build and deploy-related

- `npm run build`
  - production build via `faust build`
- `npm run wpe-build`
  - same as `npm run build`; likely intended for WP Engine/Atlas build environments
- `npm run generate`
  - regenerates `possibleTypes.json`

### Quality and maintenance

- `npm run lint`
  - runs `faust lint`
- `npm run test:nav-smoke`
  - runs the headless desktop/mobile navigation smoke suite against `BASE_URL` (defaults to `http://localhost:3002`)
- `npm run test:nav-smoke:ci`
  - same smoke suite with an explicit CI-safe `BASE_URL` fallback
- `npm run format`
  - runs Prettier write mode across JS/JSX/Markdown/CSS/SCSS files
- `npm run format:check`
  - runs Prettier check mode
- `npm run clean`
  - deletes `.next` and `node_modules`

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
