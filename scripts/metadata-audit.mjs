import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright';

const BASE_URL = process.env.BASE_URL || 'http://localhost:3002';
const DEFAULT_REPORT_PATH = process.env.METADATA_AUDIT_REPORT || 'artifacts/metadata-audit.json';
const REQUIRED_FIELDS = ['title', 'description', 'og:title', 'og:description', 'og:url', 'og:image'];
const SKIPPED_PROTOCOLS = new Set(['mailto:', 'tel:', 'javascript:']);
const MAX_PAGES = Number.parseInt(process.env.METADATA_AUDIT_MAX_PAGES || '500', 10);
const NAVIGATION_TIMEOUT = Number.parseInt(process.env.METADATA_AUDIT_TIMEOUT || '45000', 10);

function parseArgs(argv) {
  const options = {
    reportPath: DEFAULT_REPORT_PATH,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === '--report') {
      options.reportPath = argv[index + 1] || options.reportPath;
      index += 1;
    }
  }

  return options;
}

function normalizeUrl(value) {
  const url = new URL(value);
  url.hash = '';

  if (url.pathname !== '/' && url.pathname.endsWith('/')) {
    url.pathname = url.pathname.slice(0, -1);
  }

  if (url.searchParams.toString()) {
    url.search = `?${url.searchParams.toString()}`;
  } else {
    url.search = '';
  }

  return url.toString();
}

function getAuditPathname(value) {
  const url = new URL(value);
  return `${url.pathname || '/'}${url.search}`;
}

function isInternalHttpUrl(href, origin) {
  if (!href || href.startsWith('#')) {
    return false;
  }

  const protocol = href.includes(':') ? href.slice(0, href.indexOf(':') + 1).toLowerCase() : null;
  if (protocol && SKIPPED_PROTOCOLS.has(protocol)) {
    return false;
  }

  try {
    const resolved = new URL(href, origin);
    return (resolved.protocol === 'http:' || resolved.protocol === 'https:') && resolved.origin === origin;
  } catch {
    return false;
  }
}

function summarizeStatus(pageResult) {
  if (!pageResult.indexable) {
    return 'skipped';
  }

  return pageResult.missing.length === 0 ? 'pass' : 'fail';
}

async function extractPageData(page, currentUrl, origin) {
  return page.evaluate(
    ({ pageUrl, pageOrigin }) => {
      const readMeta = (selector) => document.head.querySelector(selector)?.getAttribute('content')?.trim() || '';
      const readCanonical = () => document.head.querySelector('link[rel="canonical"]')?.getAttribute('href')?.trim() || '';
      const robots = readMeta('meta[name="robots"]');
      const indexable = !/\bnoindex\b/i.test(robots);
      const metadata = {
        title: document.title?.trim() || '',
        description: readMeta('meta[name="description"]'),
        'og:title': readMeta('meta[property="og:title"]'),
        'og:description': readMeta('meta[property="og:description"]'),
        'og:url': readMeta('meta[property="og:url"]') || readCanonical(),
        'og:image': readMeta('meta[property="og:image"]'),
      };

      const links = Array.from(document.querySelectorAll('a[href]'))
        .map((anchor) => anchor.getAttribute('href')?.trim() || '')
        .filter(Boolean)
        .filter((href) => {
          if (href.startsWith('#')) {
            return false;
          }

          const protocol = href.includes(':') ? href.slice(0, href.indexOf(':') + 1).toLowerCase() : null;
          if (protocol && ['mailto:', 'tel:', 'javascript:'].includes(protocol)) {
            return false;
          }

          try {
            const resolved = new URL(href, pageUrl);
            return ['http:', 'https:'].includes(resolved.protocol) && resolved.origin === pageOrigin;
          } catch {
            return false;
          }
        })
        .map((href) => new URL(href, pageUrl).toString());

      return {
        indexable,
        links,
        metadata,
        robots,
      };
    },
    { pageUrl: currentUrl, pageOrigin: origin }
  );
}

async function crawlSite({ baseUrl, reportPath }) {
  const origin = new URL(baseUrl).origin;
  const startUrl = normalizeUrl(baseUrl);
  const browser = await chromium.launch({ headless: true });
  const visited = new Set();
  const queued = new Set([startUrl]);
  const queue = [startUrl];
  const results = [];
  const failures = [];
  const crawlErrors = [];

  try {
    while (queue.length > 0) {
      const targetUrl = queue.shift();
      queued.delete(targetUrl);

      if (visited.has(targetUrl)) {
        continue;
      }

      if (visited.size >= MAX_PAGES) {
        crawlErrors.push({
          url: getAuditPathname(targetUrl),
          message: `Stopped after reaching METADATA_AUDIT_MAX_PAGES=${MAX_PAGES}`,
        });
        break;
      }

      visited.add(targetUrl);

      const page = await browser.newPage();
      page.setDefaultNavigationTimeout(NAVIGATION_TIMEOUT);

      try {
        const response = await page.goto(targetUrl, { waitUntil: 'domcontentloaded' });
        const status = response?.status() ?? null;
        const finalUrl = normalizeUrl(page.url());

        if (new URL(finalUrl).origin !== origin) {
          results.push({
            url: getAuditPathname(finalUrl),
            finalUrl,
            status,
            indexable: false,
            skippedReason: 'redirected-external',
            robots: '',
            metadata: {},
            missing: [],
          });
          continue;
        }

        const pageData = await extractPageData(page, finalUrl, origin);
        const missing = pageData.indexable
          ? REQUIRED_FIELDS.filter((field) => !pageData.metadata[field])
          : [];
        const pageResult = {
          url: getAuditPathname(finalUrl),
          finalUrl,
          status,
          indexable: pageData.indexable,
          skippedReason: pageData.indexable ? null : 'noindex',
          robots: pageData.robots,
          metadata: pageData.metadata,
          missing,
        };

        results.push(pageResult);

        if (pageData.indexable && missing.length > 0) {
          failures.push({
            url: pageResult.url,
            missing,
          });
        }

        for (const href of pageData.links) {
          if (!isInternalHttpUrl(href, origin)) {
            continue;
          }

          const normalizedHref = normalizeUrl(href);
          if (!visited.has(normalizedHref) && !queued.has(normalizedHref)) {
            queue.push(normalizedHref);
            queued.add(normalizedHref);
          }
        }
      } catch (error) {
        crawlErrors.push({
          url: getAuditPathname(targetUrl),
          message: error instanceof Error ? error.message : String(error),
        });
      } finally {
        await page.close();
      }
    }
  } finally {
    await browser.close();
  }

  const report = {
    baseUrl: startUrl,
    generatedAt: new Date().toISOString(),
    requiredFields: REQUIRED_FIELDS,
    totals: {
      crawled: results.length,
      indexable: results.filter((entry) => entry.indexable).length,
      passing: results.filter((entry) => summarizeStatus(entry) === 'pass').length,
      failing: failures.length,
      skipped: results.filter((entry) => !entry.indexable).length,
      crawlErrors: crawlErrors.length,
    },
    failures,
    crawlErrors,
    pages: results.map((entry) => ({
      ...entry,
      statusResult: summarizeStatus(entry),
    })),
  };

  const absoluteReportPath = path.isAbsolute(reportPath) ? reportPath : path.join(process.cwd(), reportPath);
  await mkdir(path.dirname(absoluteReportPath), { recursive: true });
  await writeFile(absoluteReportPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');

  return { report, reportPath: absoluteReportPath };
}

async function main() {
  const options = parseArgs(process.argv.slice(2));

  try {
    const { report, reportPath } = await crawlSite({
      baseUrl: BASE_URL,
      reportPath: options.reportPath,
    });

    console.error(
      `[metadata-audit] crawled=${report.totals.crawled} indexable=${report.totals.indexable} failing=${report.totals.failing} skipped=${report.totals.skipped} crawlErrors=${report.totals.crawlErrors}`
    );
    console.error(`[metadata-audit] report=${reportPath}`);
    process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);

    if (report.totals.failing > 0 || report.totals.crawlErrors > 0) {
      process.exitCode = 1;
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[metadata-audit] fatal=${message}`);
    process.exitCode = 1;
  }
}

await main();