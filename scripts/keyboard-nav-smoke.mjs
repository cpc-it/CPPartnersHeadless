import { chromium } from 'playwright';

const BASE_URL = process.env.BASE_URL || 'http://localhost:3002';
const HOME_ROUTE = '/';
const SEARCH_ROUTE = '/search';
const DESKTOP_VIEWPORT = { width: 1440, height: 900 };
const MOBILE_VIEWPORT = { width: 390, height: 844 };

function logStep(step, message) {
  console.log(`[keyboard-nav-smoke] [step:${step}] ${message}`);
}

function failStep(step, detail) {
  throw new Error(`[keyboard-nav-smoke] [step:${step}] ${detail}`);
}

async function waitForDrawerExpanded(page, expanded) {
  await page.waitForFunction(
    (expected) =>
      document
        .querySelector('button[aria-controls="primary-navigation"]')
        ?.getAttribute('aria-expanded') === String(expected),
    expanded,
    { timeout: 3000 }
  );
}

async function assertSkipLinkActivation(page) {
  await page.setViewportSize(DESKTOP_VIEWPORT);
  await page.goto(`${BASE_URL}${HOME_ROUTE}`, { waitUntil: 'networkidle' });

  await page.keyboard.press('Tab');

  const skipLink = page.getByRole('link', { name: /skip to main content/i });
  await skipLink.waitFor({ state: 'visible', timeout: 3000 });

  const skipFocused = await skipLink.evaluate((element) => document.activeElement === element);
  if (!skipFocused) {
    failStep('skip-link-focus', 'skip link did not receive focus on first tab stop');
  }

  await page.keyboard.press('Enter');

  await page.waitForFunction(
    () => window.location.hash === '#main-content' && document.activeElement?.id === 'main-content',
    { timeout: 3000 }
  );

  logStep('skip-link-activation', 'Enter on skip link moves focus to main content');
}

async function assertMainNavKeyboardBehavior(page) {
  await page.setViewportSize(MOBILE_VIEWPORT);
  await page.goto(`${BASE_URL}${HOME_ROUTE}`, { waitUntil: 'networkidle' });

  const navToggle = page.locator('button[aria-controls="primary-navigation"]');
  await navToggle.waitFor({ state: 'visible', timeout: 5000 });
  await navToggle.focus();

  await page.keyboard.press('Enter');
  await waitForDrawerExpanded(page, true);
  logStep('main-nav-enter-open', 'Enter opens the mobile navigation drawer');

  const firstSubmenuToggle = page
    .locator('nav#primary-navigation .menu > li.hasChildren > .menu-link-row > .submenu-toggle')
    .first();
  await firstSubmenuToggle.waitFor({ state: 'visible', timeout: 3000 });

  let reachedNavigation = false;
  for (let step = 0; step < 20; step += 1) {
    await page.keyboard.press('Tab');

    const focusState = await page.evaluate(() => {
      const active = document.activeElement;
      const nav = document.querySelector('nav#primary-navigation');

      if (!active || !nav) {
        return { inNavigation: false };
      }

      return {
        inNavigation: nav.contains(active),
      };
    });

    if (focusState.inNavigation) {
      reachedNavigation = true;
      break;
    }
  }

  if (!reachedNavigation) {
    failStep('main-nav-tab-flow', 'Tab flow did not reach a focusable element inside primary navigation');
  }

  logStep('main-nav-tab-flow', 'Tab flow reaches focusable content inside primary navigation');

  await firstSubmenuToggle.focus();

  const focusedSubmenuToggle = await firstSubmenuToggle.evaluate(
    (element) => document.activeElement === element
  );

  if (!focusedSubmenuToggle) {
    failStep('main-nav-enter-submenu-open', 'unable to focus first submenu toggle before Enter activation');
  }

  await page.keyboard.press('Enter');

  await page.waitForFunction(
    () => {
      const toggle = document.querySelector(
        'nav#primary-navigation .menu > li.hasChildren > .menu-link-row > .submenu-toggle'
      );

      if (!toggle) {
        return false;
      }

      const submenuId = toggle.getAttribute('aria-controls');
      const submenu = submenuId ? document.getElementById(submenuId) : null;

      if (!submenu) {
        return false;
      }

      return toggle.getAttribute('aria-expanded') === 'true' && submenu.getAttribute('aria-hidden') === 'false';
    },
    { timeout: 3000 }
  );

  logStep('main-nav-enter-submenu-open', 'Enter expands first submenu and updates ARIA state');

  await page.locator('nav#primary-navigation a').first().focus();
  await page.keyboard.press('Escape');

  await waitForDrawerExpanded(page, false);

  const navToggleFocused = await page.evaluate(() => {
    const toggle = document.querySelector('button[aria-controls="primary-navigation"]');
    return Boolean(toggle) && document.activeElement === toggle;
  });

  if (!navToggleFocused) {
    failStep('main-nav-escape-focus-return', 'Escape closed menu but did not restore focus to nav toggle');
  }

  logStep('main-nav-escape-focus-return', 'Escape closes the drawer and restores focus to nav toggle');
}

async function assertSearchInputEnterBehavior(page) {
  const searchQuery = 'cal poly partners';

  await page.setViewportSize(DESKTOP_VIEWPORT);
  await page.goto(`${BASE_URL}${SEARCH_ROUTE}`, { waitUntil: 'networkidle' });

  const searchInput = page.locator('input#search');
  await searchInput.waitFor({ state: 'visible', timeout: 5000 });

  await searchInput.fill(searchQuery);
  await searchInput.focus();
  await page.keyboard.press('Enter');

  await page.waitForFunction(
    (expectedValue) => {
      const input = document.querySelector('input#search');
      if (!(input instanceof HTMLInputElement)) {
        return false;
      }

      const path = window.location.pathname;
      return path === '/search' && input.value === expectedValue;
    },
    searchQuery,
    { timeout: 3000 }
  );

  const inputStillFocused = await searchInput.evaluate((element) => document.activeElement === element);
  if (!inputStillFocused) {
    failStep('search-input-enter-behavior', 'search input lost focus after pressing Enter');
  }

  logStep('search-input-enter-behavior', 'Enter does not navigate away and preserves typed search query');
}

async function run() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  try {
    await assertSkipLinkActivation(page);
    await assertMainNavKeyboardBehavior(page);
    await assertSearchInputEnterBehavior(page);

    console.log(
      JSON.stringify(
        {
          baseUrl: BASE_URL,
          routes: [HOME_ROUTE, SEARCH_ROUTE],
          checks: [
            'skip link activation',
            'main nav tab flow',
            'main nav Enter activation',
            'main nav Escape close with focus return',
            'search input Enter behavior',
          ],
          passed: true,
        },
        null,
        2
      )
    );

    console.log('PASS keyboard navigation smoke checks');
  } finally {
    await browser.close();
  }
}

run().catch((error) => {
  console.error('FAIL keyboard navigation smoke checks');
  console.error(error?.stack || String(error));
  process.exit(1);
});
