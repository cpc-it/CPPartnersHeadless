import fs from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright';

const BASE_URL = process.env.BASE_URL || 'http://localhost:3002';
const DEFAULT_ROUTE = '/';
const DEFAULT_REPORT_PATH = process.env.CONSOLE_SMOKE_REPORT || 'artifacts/console-smoke.json';
const DEFAULT_SETTLE_MS = 1200;

function parseArgs(argv) {
  const parsed = {
    configPath: process.env.CONSOLE_SMOKE_CONFIG || null,
    reportPath: DEFAULT_REPORT_PATH,
    failOnWarnings: null,
    settleMs: DEFAULT_SETTLE_MS,
    route: DEFAULT_ROUTE,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];

    if (arg === '--config') {
      parsed.configPath = argv[i + 1] || null;
      i += 1;
      continue;
    }

    if (arg === '--report') {
      parsed.reportPath = argv[i + 1] || parsed.reportPath;
      i += 1;
      continue;
    }

    if (arg === '--route') {
      parsed.route = argv[i + 1] || parsed.route;
      i += 1;
      continue;
    }

    if (arg === '--settle-ms') {
      const raw = argv[i + 1];
      const parsedMs = Number.parseInt(raw, 10);
      if (Number.isFinite(parsedMs) && parsedMs >= 0) {
        parsed.settleMs = parsedMs;
      }
      i += 1;
      continue;
    }

    if (arg === '--fail-on-warnings') {
      parsed.failOnWarnings = true;
      continue;
    }

    if (arg === '--no-fail-on-warnings') {
      parsed.failOnWarnings = false;
      continue;
    }
  }

  return parsed;
}

function toRoute(value) {
  if (typeof value !== 'string' || value.trim() === '') {
    return DEFAULT_ROUTE;
  }

  if (value.startsWith('/')) {
    return value;
  }

  return `/${value}`;
}

function normalizeAllowlist(entries) {
  if (!Array.isArray(entries)) {
    return [];
  }

  return entries
    .map((entry) => {
      if (typeof entry === 'string' && entry.trim() !== '') {
        return {
          type: 'substring',
          value: entry,
          label: entry,
        };
      }

      if (!entry || typeof entry !== 'object') {
        return null;
      }

      if (entry.type === 'regex' && typeof entry.value === 'string' && entry.value.trim() !== '') {
        try {
          return {
            type: 'regex',
            value: new RegExp(entry.value, typeof entry.flags === 'string' ? entry.flags : ''),
            label: `/${entry.value}/${entry.flags || ''}`,
          };
        } catch {
          return null;
        }
      }

      if (entry.type === 'substring' && typeof entry.value === 'string' && entry.value.trim() !== '') {
        return {
          type: 'substring',
          value: entry.value,
          label: entry.value,
        };
      }

      return null;
    })
    .filter(Boolean);
}

async function loadConfig(configPath) {
  const defaultConfig = {
    route: DEFAULT_ROUTE,
    failOnWarnings: false,
    warningAllowlist: [],
  };

  if (!configPath) {
    return { config: defaultConfig, configPath: null };
  }

  const absolutePath = path.resolve(configPath);
  const raw = await fs.readFile(absolutePath, 'utf8');
  const parsed = JSON.parse(raw);

  return {
    config: {
      route: toRoute(parsed?.route || DEFAULT_ROUTE),
      failOnWarnings: Boolean(parsed?.failOnWarnings),
      warningAllowlist: normalizeAllowlist(parsed?.warningAllowlist),
    },
    configPath: absolutePath,
  };
}

function isWarningType(msgType) {
  return msgType === 'warning' || msgType === 'warn';
}

function buildConsoleEntry(message) {
  const location = message.location ? message.location() : {};

  return {
    type: message.type(),
    text: message.text(),
    location: {
      url: location?.url || null,
      lineNumber: Number.isFinite(location?.lineNumber) ? location.lineNumber : null,
      columnNumber: Number.isFinite(location?.columnNumber) ? location.columnNumber : null,
    },
    timestamp: new Date().toISOString(),
  };
}

function matchesAllowlist(entry, allowlist) {
  for (const rule of allowlist) {
    if (rule.type === 'substring' && entry.text.includes(rule.value)) {
      return rule.label;
    }

    if (rule.type === 'regex' && rule.value.test(entry.text)) {
      return rule.label;
    }
  }

  return null;
}

async function writeReport(reportPath, report) {
  const absoluteReportPath = path.resolve(reportPath);
  await fs.mkdir(path.dirname(absoluteReportPath), { recursive: true });
  await fs.writeFile(absoluteReportPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  return absoluteReportPath;
}

async function run() {
  const args = parseArgs(process.argv.slice(2));
  const loaded = await loadConfig(args.configPath);

  const route = toRoute(args.route || loaded.config.route || DEFAULT_ROUTE);
  const failOnWarnings =
    typeof args.failOnWarnings === 'boolean' ? args.failOnWarnings : Boolean(loaded.config.failOnWarnings);

  const warningAllowlist = loaded.config.warningAllowlist || [];
  const targetUrl = `${BASE_URL}${route}`;

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  const errors = [];
  const warnings = [];

  page.on('console', (message) => {
    const entry = buildConsoleEntry(message);

    if (entry.type === 'error') {
      errors.push(entry);
      return;
    }

    if (isWarningType(entry.type)) {
      warnings.push(entry);
    }
  });

  page.on('pageerror', (error) => {
    errors.push({
      type: 'pageerror',
      text: error?.stack || error?.message || String(error),
      location: { url: targetUrl, lineNumber: null, columnNumber: null },
      timestamp: new Date().toISOString(),
    });
  });

  try {
    await page.goto(targetUrl, { waitUntil: 'networkidle' });
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(args.settleMs);

    const warningResults = warnings.map((entry) => {
      const allowlistMatch = matchesAllowlist(entry, warningAllowlist);
      return {
        ...entry,
        allowlistMatch,
      };
    });

    const unmatchedWarnings = warningResults.filter((entry) => !entry.allowlistMatch);

    const report = {
      generatedAt: new Date().toISOString(),
      baseUrl: BASE_URL,
      targetUrl,
      route,
      failOnWarnings,
      configPath: loaded.configPath,
      settleMs: args.settleMs,
      warningAllowlist: warningAllowlist.map((rule) => rule.label),
      totals: {
        errors: errors.length,
        warnings: warnings.length,
        unmatchedWarnings: unmatchedWarnings.length,
        allowlistedWarnings: warningResults.filter((entry) => entry.allowlistMatch).length,
      },
      errors,
      warnings: warningResults,
      passed: errors.length === 0 && (!failOnWarnings || unmatchedWarnings.length === 0),
    };

    const reportPath = await writeReport(args.reportPath, report);

    console.log(JSON.stringify({ ...report, reportPath }, null, 2));

    if (errors.length > 0) {
      throw new Error(`Console errors detected: ${errors.length}`);
    }

    if (failOnWarnings && unmatchedWarnings.length > 0) {
      throw new Error(`Unallowlisted warnings detected: ${unmatchedWarnings.length}`);
    }

    console.log('PASS homepage console smoke checks');
  } finally {
    await context.close();
    await browser.close();
  }
}

run().catch((error) => {
  console.error('FAIL homepage console smoke checks');
  console.error(error?.stack || String(error));
  process.exit(1);
});
