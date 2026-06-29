import { chromium } from 'playwright';

const BASE_URL = process.env.BASE_URL || 'http://localhost:3002';
const ROUTE = '/';
const MOBILE_VIEWPORT = { width: 390, height: 844 };

function logStep(step, message) {
  console.log(`[nav-focus-smoke] [step:${step}] ${message}`);
}

function failStep(step, detail) {
  throw new Error(`[nav-focus-smoke] [step:${step}] ${detail}`);
}

async function waitForExpandedState(page, expected) {
  await page.waitForFunction(
    (isExpanded) =>
      document
        .querySelector('button[aria-controls="primary-navigation"]')
        ?.getAttribute('aria-expanded') === String(isExpanded),
    expected,
    { timeout: 3000 }
  );
}

async function assertToggleFocused(page, step) {
  const isFocused = await page.evaluate(() => {
    const toggle = document.querySelector('button[aria-controls="primary-navigation"]');
    return Boolean(toggle) && document.activeElement === toggle;
  });

  if (!isFocused) {
    failStep(step, 'expected focus to return to navigation toggle button');
  }

  const activeIsBody = await page.evaluate(() => document.activeElement === document.body);
  if (activeIsBody) {
    failStep(step, 'focus dropped to body after closing navigation');
  }
}

async function assertTabEscapesToggle(page, step) {
  await page.keyboard.press('Tab');

  const escaped = await page.evaluate(() => {
    const toggle = document.querySelector('button[aria-controls="primary-navigation"]');
    const active = document.activeElement;
    return Boolean(active) && active !== document.body && active !== toggle;
  });

  if (!escaped) {
    failStep(step, 'tab key did not move focus away from toggle after close');
  }
}

async function focusFirstMenuLink(page, step) {
  const firstMenuLink = page.locator('nav#primary-navigation a').first();
  await firstMenuLink.waitFor({ state: 'visible', timeout: 3000 });
  await firstMenuLink.focus();

  const linkFocused = await firstMenuLink.evaluate((link) => document.activeElement === link);
  if (!linkFocused) {
    failStep(step, 'could not focus a navigation link before closing');
  }
}

async function run() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  try {
    await page.setViewportSize(MOBILE_VIEWPORT);
    await page.goto(`${BASE_URL}${ROUTE}`, { waitUntil: 'networkidle' });
    logStep('load', `loaded ${BASE_URL}${ROUTE} at mobile viewport`);

    const navToggle = page.locator('button[aria-controls="primary-navigation"]');
    await navToggle.waitFor({ state: 'visible', timeout: 6000 });

    // Escape-key close flow.
    await navToggle.click();
    await waitForExpandedState(page, true);
    await focusFirstMenuLink(page, 'escape-prep-focus-link');

    await page.keyboard.press('Escape');
    await waitForExpandedState(page, false);
    await assertToggleFocused(page, 'escape-focus-restore');
    await assertTabEscapesToggle(page, 'escape-no-keyboard-trap');
    logStep('escape', 'Escape closes drawer and restores trigger focus without trapping');

    // Backdrop close flow.
    await navToggle.focus();
    await navToggle.click();
    await waitForExpandedState(page, true);
    await focusFirstMenuLink(page, 'backdrop-prep-focus-link');

    const backdrop = page.locator('button[aria-label="Dismiss navigation overlay"]');
    await backdrop.waitFor({ state: 'attached', timeout: 3000 });
    await backdrop.evaluate((node) => node.click());

    await waitForExpandedState(page, false);
    await assertToggleFocused(page, 'backdrop-focus-restore');
    logStep('backdrop', 'Backdrop click closes drawer and restores trigger focus');

    // Close button flow (same toggle button in open state).
    await navToggle.click();
    await waitForExpandedState(page, true);

    const closeToggle = page.getByRole('button', { name: /close navigation/i });
    await closeToggle.click();
    await waitForExpandedState(page, false);
    await assertToggleFocused(page, 'close-button-focus-restore');
    logStep('close-button', 'Close button action keeps focus on trigger');

    console.log(
      JSON.stringify(
        {
          baseUrl: BASE_URL,
          route: ROUTE,
          viewport: MOBILE_VIEWPORT,
          checks: [
            'escape closes and restores focus',
            'focus does not drop to body',
            'backdrop closes and restores focus',
            'close button closes and restores focus',
            'tab escapes toggle after close',
          ],
          passed: true,
        },
        null,
        2
      )
    );

    console.log('PASS nav focus smoke checks');
  } finally {
    await browser.close();
  }
}

run().catch((error) => {
  console.error('FAIL nav focus smoke checks');
  console.error(error?.stack || String(error));
  process.exit(1);
});
