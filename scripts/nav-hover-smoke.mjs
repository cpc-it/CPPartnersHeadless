import { chromium } from 'playwright';

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const ROUTES = ['/', '/contact', '/careers', '/search', '/this-route-should-404'];
const MENU_LABELS = ['Who We Are', 'What We Do'];

async function ensureNavVisible(page) {
  try {
    await page.waitForFunction(() => {
      const link = document.querySelector('nav#primary-navigation .menu > li > .menu-link-row > a');
      if (!link) return false;
      const rect = link.getBoundingClientRect();
      return rect.width > 0 && rect.height > 0;
    }, { timeout: 8000 });
    return true;
  } catch {
    return false;
  }
}

async function getMenuState(page, label) {
  return page.evaluate((targetLabel) => {
    const item = Array.from(document.querySelectorAll('nav#primary-navigation .menu > li')).find(
      (li) => li.querySelector(':scope > .menu-link-row > a')?.textContent?.trim() === targetLabel
    );

    if (!item) {
      return { found: false };
    }

    const trigger = item.querySelector(':scope > .menu-link-row > a');
    const submenu = item.querySelector(':scope > ul');

    if (!trigger || !submenu) {
      return { found: true, hasSubmenu: false };
    }

    const triggerRect = trigger.getBoundingClientRect();
    const submenuRect = submenu.getBoundingClientRect();
    const computed = window.getComputedStyle(submenu);

    return {
      found: true,
      hasSubmenu: true,
      triggerRect: {
        x: triggerRect.x,
        y: triggerRect.y,
        width: triggerRect.width,
        height: triggerRect.height,
      },
      submenuRect: {
        x: submenuRect.x,
        y: submenuRect.y,
        width: submenuRect.width,
        height: submenuRect.height,
      },
      isOpen:
        computed.visibility === 'visible' &&
        Number.parseFloat(computed.opacity || '0') > 0.5 &&
        computed.pointerEvents !== 'none',
      ariaExpanded: item.querySelector(':scope > .menu-link-row > .submenu-toggle')?.getAttribute('aria-expanded'),
    };
  }, label);
}

async function verifyDesktopHover(page, route) {
  await page.goto(`${BASE_URL}${route}`, { waitUntil: 'networkidle' });
  await page.setViewportSize({ width: 1440, height: 900 });

  const navVisible = await ensureNavVisible(page);
  if (!navVisible) {
    return {
      route,
      passed: false,
      reason: 'Nav did not become visible in test environment',
      labels: [],
    };
  }

  const labels = [];
  let passed = true;

  for (const label of MENU_LABELS) {
    const before = await getMenuState(page, label);
    if (!before.found || !before.hasSubmenu) {
      passed = false;
      labels.push({
        label,
        passed: false,
        reason: !before.found ? 'Top-level item not found' : 'Submenu not found',
      });
      continue;
    }

    await page.mouse.move(
      before.triggerRect.x + before.triggerRect.width / 2,
      before.triggerRect.y + before.triggerRect.height / 2
    );
    await page.waitForTimeout(260);

    const openState = await getMenuState(page, label);

    await page.mouse.move(
      openState.submenuRect.x + Math.min(20, Math.max(4, openState.submenuRect.width / 2)),
      openState.submenuRect.y + Math.min(20, Math.max(4, openState.submenuRect.height / 2))
    );
    await page.waitForTimeout(140);

    const stillOpenState = await getMenuState(page, label);

    await page.mouse.move(6, 6);
    await page.waitForTimeout(260);

    const closedState = await getMenuState(page, label);

    const toggleAria = closedState.ariaExpanded;
    const labelPassed =
      openState.isOpen &&
      stillOpenState.isOpen &&
      !closedState.isOpen &&
      (toggleAria === 'false' || toggleAria === 'true');

    if (!labelPassed) {
      passed = false;
    }

    labels.push({
      label,
      passed: labelPassed,
      opensOnHover: openState.isOpen,
      staysOpenInSubmenu: stillOpenState.isOpen,
      closesOnLeave: !closedState.isOpen,
      hasAriaExpanded: toggleAria === 'false' || toggleAria === 'true',
    });
  }

  return { route, passed, labels };
}

async function verifyKeyboardAndMobileSmoke(page) {
  await page.goto(`${BASE_URL}/`, { waitUntil: 'networkidle' });
  await page.setViewportSize({ width: 1440, height: 900 });

  const navVisible = await ensureNavVisible(page);
  if (!navVisible) {
    return {
      passed: false,
      keyboard: { passed: false, reason: 'Nav not visible on desktop route' },
      mobile: { passed: false, reason: 'Nav not visible before mobile checks' },
    };
  }

  const focusOpened = await page.evaluate(() => {
    const item = Array.from(document.querySelectorAll('nav#primary-navigation .menu > li')).find(
      (li) => li.querySelector(':scope > .menu-link-row > a')?.textContent?.trim() === 'Who We Are'
    );
    const trigger = item?.querySelector(':scope > .menu-link-row > a');
    const submenu = item?.querySelector(':scope > ul');
    if (!trigger || !submenu) return false;

    trigger.focus();
    const style = window.getComputedStyle(submenu);
    return style.visibility === 'visible' && style.pointerEvents !== 'none';
  });

  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole('button', { name: /open navigation/i }).click();
  const whoWeAreToggle = page.locator('nav#primary-navigation .menu > li .submenu-toggle').first();
  const beforeAria = await whoWeAreToggle.getAttribute('aria-expanded');

  await whoWeAreToggle.click();
  await page.waitForTimeout(120);
  const expandedAfterClick = await whoWeAreToggle.getAttribute('aria-expanded');

  await whoWeAreToggle.click();
  await page.waitForTimeout(120);
  const collapsedAfterSecondClick = await whoWeAreToggle.getAttribute('aria-expanded');

  const mobilePassed = expandedAfterClick === 'true' && collapsedAfterSecondClick === 'false';

  return {
    passed: focusOpened && mobilePassed,
    keyboard: { passed: focusOpened },
    mobile: {
      passed: mobilePassed,
      beforeAria,
      expandedAfterClick,
      collapsedAfterSecondClick,
    },
  };
}

async function run() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  try {
    const desktopResults = [];

    for (const route of ROUTES) {
      desktopResults.push(await verifyDesktopHover(page, route));
    }

    const keyboardMobileResult = await verifyKeyboardAndMobileSmoke(page);
    const passed =
      desktopResults.every((result) => result.passed) && keyboardMobileResult.passed;

    console.log(
      JSON.stringify(
        {
          baseUrl: BASE_URL,
          desktopResults,
          keyboardMobileResult,
          passed,
        },
        null,
        2
      )
    );

    if (!passed) {
      throw new Error('One or more nav hover smoke checks failed');
    }

    console.log('PASS nav hover smoke checks');
  } finally {
    await browser.close();
  }
}

run().catch((error) => {
  console.error('FAIL nav hover smoke checks');
  console.error(error?.stack || String(error));
  process.exit(1);
});
