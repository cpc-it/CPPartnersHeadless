import { chromium } from 'playwright';

const BASE_URL = process.env.BASE_URL || 'http://localhost:3002';
const ROUTES = ['/search', '/404'];
const SEARCH_TERMS = ['a', 'the', 'cal poly', 'partners', 'project'];

function buildContext(route, step) {
  return { route, step };
}

function logStep(context, message) {
  console.log(`[button-smoke] [route:${context.route}] [step:${context.step}] ${message}`);
}

function failStep(context, detail) {
  const error = new Error(`[button-smoke] [route:${context.route}] [step:${context.step}] ${detail}`);
  error.context = context;
  throw error;
}

function normalizeColor(value) {
  return (value || '').replace(/\s+/g, '').toLowerCase();
}

function normalizeSize(value) {
  return (value || '').trim().toLowerCase();
}

async function waitForLoadMoreBySearching(page, route) {
  const context = buildContext(route, 'load-search-results');

  await page.goto(`${BASE_URL}${route}`, { waitUntil: 'networkidle' });

  const searchInput = page.locator('input#search');
  await searchInput.waitFor({ state: 'visible', timeout: 10000 });

  const loadMoreButton = page.getByRole('button', { name: /load more/i }).first();

  for (const term of SEARCH_TERMS) {
    await searchInput.fill('');
    await searchInput.fill(term);

    try {
      await loadMoreButton.waitFor({ state: 'visible', timeout: 4500 });
      logStep(context, `load more button appeared for query "${term}"`);
      return { button: loadMoreButton, term };
    } catch {
      // Try next term.
    }
  }

  failStep(context, `load more button did not appear for any term: ${SEARCH_TERMS.join(', ')}`);
}

async function readButtonStyleSnapshot(page, button) {
  return button.evaluate((el) => {
    const styles = window.getComputedStyle(el);
    const rootStyles = window.getComputedStyle(document.documentElement);

    const resolveVarColor = (varName) => {
      const probe = document.createElement('span');
      probe.style.color = `var(${varName})`;
      document.body.appendChild(probe);
      const resolved = window.getComputedStyle(probe).color;
      probe.remove();
      return resolved;
    };

    return {
      actual: {
        color: styles.color,
        backgroundColor: styles.backgroundColor,
        borderColor: styles.borderTopColor,
        outlineColor: styles.outlineColor,
        outlineStyle: styles.outlineStyle,
        outlineWidth: styles.outlineWidth,
        opacity: styles.opacity,
        pointerEvents: styles.pointerEvents,
      },
      expected: {
        black: resolveVarColor('--color-black'),
        white: resolveVarColor('--color-white'),
        primary: resolveVarColor('--color-primary'),
        secondary: resolveVarColor('--color-secondary'),
        blackRaw: rootStyles.getPropertyValue('--color-black').trim(),
        whiteRaw: rootStyles.getPropertyValue('--color-white').trim(),
        primaryRaw: rootStyles.getPropertyValue('--color-primary').trim(),
        secondaryRaw: rootStyles.getPropertyValue('--color-secondary').trim(),
      },
      isFocusVisible: el.matches(':focus-visible'),
    };
  });
}

async function waitForButtonStyles(page, button, expected, timeout = 3000) {
  await page.waitForFunction(
    ({ element, expectedStyles }) => {
      const styles = window.getComputedStyle(element);
      const normalize = (value) => (value || '').replace(/\s+/g, '').toLowerCase();

      return Object.entries(expectedStyles).every(([property, expectedValue]) => {
        if (!expectedValue) {
          return true;
        }

        return normalize(styles[property]) === normalize(expectedValue);
      });
    },
    { element: await button.elementHandle(), expectedStyles: expected },
    { timeout }
  );
}

function assertStyleEqual(context, label, actual, expected) {
  if (normalizeColor(actual) !== normalizeColor(expected)) {
    failStep(context, `${label} mismatch. expected ${expected}, got ${actual}`);
  }
}

function assertOutline(context, snapshot) {
  if (!snapshot.isFocusVisible) {
    failStep(context, 'button is not in :focus-visible state');
  }

  if (normalizeSize(snapshot.actual.outlineStyle) === 'none') {
    failStep(context, 'focus-visible outline style is none');
  }

  if (normalizeSize(snapshot.actual.outlineWidth) !== '2px') {
    failStep(context, `focus-visible outline width mismatch. expected 2px, got ${snapshot.actual.outlineWidth}`);
  }

  const normalizedOutlineColor = normalizeColor(snapshot.actual.outlineColor);
  if (!normalizedOutlineColor || normalizedOutlineColor === 'rgba(0,0,0,0)') {
    failStep(
      context,
      `focus-visible outline color should be visible, got ${snapshot.actual.outlineColor}`
    );
  }
}

async function assertDefaultState(page, route, button) {
  const context = buildContext(route, 'default-state');

  await page.mouse.move(0, 0);
  await page.keyboard.press('Escape');

  const snapshot = await readButtonStyleSnapshot(page, button);

  assertStyleEqual(context, 'default text color', snapshot.actual.color, snapshot.expected.black);
  assertStyleEqual(context, 'default background color', snapshot.actual.backgroundColor, snapshot.expected.white);
  assertStyleEqual(context, 'default border color', snapshot.actual.borderColor, snapshot.expected.black);

  return snapshot;
}

async function assertHoverState(page, route, button) {
  const context = buildContext(route, 'hover-state');

  await button.hover();
  const expectedColors = await button.evaluate(() => {
    const resolveVarColor = (varName) => {
      const probe = document.createElement('span');
      probe.style.color = `var(${varName})`;
      document.body.appendChild(probe);
      const resolved = window.getComputedStyle(probe).color;
      probe.remove();
      return resolved;
    };

    return {
      white: resolveVarColor('--color-white'),
      black: resolveVarColor('--color-black'),
    };
  });

  await waitForButtonStyles(page, button, {
    color: expectedColors.white,
    backgroundColor: expectedColors.black,
    borderTopColor: expectedColors.black,
  });

  const snapshot = await readButtonStyleSnapshot(page, button);

  assertStyleEqual(context, 'hover text color', snapshot.actual.color, snapshot.expected.white);
  assertStyleEqual(context, 'hover background color', snapshot.actual.backgroundColor, snapshot.expected.black);
  assertStyleEqual(context, 'hover border color', snapshot.actual.borderColor, snapshot.expected.black);

  return snapshot;
}

async function focusButtonViaKeyboard(page, route, button) {
  const context = buildContext(route, 'focus-visible-state');

  await page.locator('input#search').focus();

  await page.waitForFunction(() => {
    const active = document.activeElement;
    return !!active && active.id === 'search';
  });

  for (let i = 0; i < 80; i += 1) {
    await page.keyboard.press('Tab');

    const focused = await button.evaluate((el) => document.activeElement === el);
    if (focused) {
      const snapshot = await readButtonStyleSnapshot(page, button);
      assertOutline(context, snapshot);
      return snapshot;
    }
  }

  failStep(context, 'tab navigation did not focus the load more button');
}

async function assertActiveMouseDownState(page, route, button) {
  const context = buildContext(route, 'active-mousedown-state');

  const box = await button.boundingBox();
  if (!box) {
    failStep(context, 'could not get button bounds for mousedown state');
  }

  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();

  const expectedActive = await button.evaluate(() => {
    const resolveVarColor = (varName) => {
      const probe = document.createElement('span');
      probe.style.color = `var(${varName})`;
      document.body.appendChild(probe);
      const resolved = window.getComputedStyle(probe).color;
      probe.remove();
      return resolved;
    };

    return {
      white: resolveVarColor('--color-white'),
      primary: resolveVarColor('--color-primary'),
    };
  });

  await waitForButtonStyles(page, button, {
    color: expectedActive.white,
    backgroundColor: expectedActive.primary,
    borderTopColor: expectedActive.primary,
  });

  const snapshot = await readButtonStyleSnapshot(page, button);

  assertStyleEqual(context, 'active text color', snapshot.actual.color, snapshot.expected.white);
  assertStyleEqual(context, 'active background color', snapshot.actual.backgroundColor, snapshot.expected.primary);
  assertStyleEqual(context, 'active border color', snapshot.actual.borderColor, snapshot.expected.primary);

  await page.mouse.up();

  return snapshot;
}

async function assertDisabledState(page, route, button) {
  const context = buildContext(route, 'disabled-state');

  const snapshot = await button.evaluate((el) => {
    el.setAttribute('data-button-smoke-disabled-original', el.hasAttribute('disabled') ? '1' : '0');
    el.disabled = true;

    const styles = window.getComputedStyle(el);

    return {
      opacity: styles.opacity,
      pointerEvents: styles.pointerEvents,
      cursor: styles.cursor,
    };
  });

  if (normalizeSize(snapshot.opacity) !== '0.55') {
    failStep(context, `disabled opacity mismatch. expected 0.55, got ${snapshot.opacity}`);
  }

  if (normalizeSize(snapshot.pointerEvents) !== 'none') {
    failStep(context, `disabled pointer-events mismatch. expected none, got ${snapshot.pointerEvents}`);
  }

  if (normalizeSize(snapshot.cursor) !== 'not-allowed') {
    failStep(context, `disabled cursor mismatch. expected not-allowed, got ${snapshot.cursor}`);
  }

  await button.evaluate((el) => {
    const originalDisabled = el.getAttribute('data-button-smoke-disabled-original') === '1';
    if (!originalDisabled) {
      el.disabled = false;
      el.removeAttribute('disabled');
    }
    el.removeAttribute('data-button-smoke-disabled-original');
  });

  return snapshot;
}

async function assertKeyboardActivation(page, route, button) {
  const context = buildContext(route, 'keyboard-activation');

  await button.evaluate((el) => {
    window.__buttonSmokeClickCount = 0;
    el.addEventListener(
      'click',
      () => {
        window.__buttonSmokeClickCount += 1;
      },
      { capture: true }
    );
  });

  await focusButtonViaKeyboard(page, route, button);

  await page.keyboard.press('Enter');
  await page.waitForFunction(() => window.__buttonSmokeClickCount >= 1, { timeout: 4000 });

  await button.focus();
  await page.keyboard.press('Space');
  await page.waitForFunction(() => window.__buttonSmokeClickCount >= 2, { timeout: 4000 });

  const clickCount = await page.evaluate(() => window.__buttonSmokeClickCount);

  if (clickCount < 2) {
    failStep(context, `keyboard activation did not fire expected clicks, got ${clickCount}`);
  }

  return { clickCount };
}

async function runRouteChecks(page, route) {
  const { button, term } = await waitForLoadMoreBySearching(page, route);

  const defaultSnapshot = await assertDefaultState(page, route, button);
  const hoverSnapshot = await assertHoverState(page, route, button);
  const focusSnapshot = await focusButtonViaKeyboard(page, route, button);
  const activeSnapshot = await assertActiveMouseDownState(page, route, button);
  const disabledSnapshot = await assertDisabledState(page, route, button);
  const keyboardResult = await assertKeyboardActivation(page, route, button);

  return {
    route,
    searchTerm: term,
    expectedColors: {
      black: defaultSnapshot.expected.blackRaw,
      white: defaultSnapshot.expected.whiteRaw,
      primary: defaultSnapshot.expected.primaryRaw,
      secondary: defaultSnapshot.expected.secondaryRaw,
    },
    states: {
      default: {
        color: defaultSnapshot.actual.color,
        backgroundColor: defaultSnapshot.actual.backgroundColor,
        borderColor: defaultSnapshot.actual.borderColor,
      },
      hover: {
        color: hoverSnapshot.actual.color,
        backgroundColor: hoverSnapshot.actual.backgroundColor,
        borderColor: hoverSnapshot.actual.borderColor,
      },
      focusVisible: {
        outlineColor: focusSnapshot.actual.outlineColor,
        outlineStyle: focusSnapshot.actual.outlineStyle,
        outlineWidth: focusSnapshot.actual.outlineWidth,
      },
      activeMouseDown: {
        color: activeSnapshot.actual.color,
        backgroundColor: activeSnapshot.actual.backgroundColor,
        borderColor: activeSnapshot.actual.borderColor,
      },
      disabled: {
        opacity: disabledSnapshot.opacity,
        pointerEvents: disabledSnapshot.pointerEvents,
        cursor: disabledSnapshot.cursor,
      },
    },
    keyboardActivation: keyboardResult,
    passed: true,
  };
}

async function run() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  try {
    const routeResults = [];

    for (const route of ROUTES) {
      routeResults.push(await runRouteChecks(page, route));
    }

    const passed = routeResults.every((result) => result.passed);

    console.log(
      JSON.stringify(
        {
          baseUrl: BASE_URL,
          routes: ROUTES,
          routeResults,
          passed,
        },
        null,
        2
      )
    );

    if (!passed) {
      throw new Error('One or more button state smoke checks failed');
    }

    console.log('PASS button state smoke checks');
  } finally {
    await browser.close();
  }
}

run().catch((error) => {
  console.error('FAIL button state smoke checks');
  console.error(error?.stack || String(error));
  process.exit(1);
});
