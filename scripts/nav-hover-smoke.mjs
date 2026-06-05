import { chromium } from 'playwright';

const BASE_URL = process.env.BASE_URL || 'http://localhost:3002';
const ROUTES = ['/', '/contact', '/careers', '/search', '/this-route-should-404'];
const MENU_LABELS = ['Who We Are', 'What We Do'];
const DESKTOP_VIEWPORT = { width: 1440, height: 900 };
const MOBILE_VIEWPORT = { width: 390, height: 844 };

function viewportLabel(viewport) {
  return `${viewport.width}x${viewport.height}`;
}

function buildContext(suite, viewport, route, step) {
  return {
    suite,
    viewport: viewportLabel(viewport),
    route,
    step,
  };
}

function logStep(context, message) {
  console.log(
    `[nav-smoke] [suite:${context.suite}] [viewport:${context.viewport}] [route:${context.route}] [step:${context.step}] ${message}`
  );
}

function failStep(context, detail) {
  const error = new Error(
    `[nav-smoke] [suite:${context.suite}] [viewport:${context.viewport}] [route:${context.route}] [step:${context.step}] ${detail}`
  );
  error.context = context;
  throw error;
}

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
        centerX: triggerRect.x + triggerRect.width / 2,
        centerY: triggerRect.y + triggerRect.height / 2,
      },
      submenuRect: {
        x: submenuRect.x,
        y: submenuRect.y,
        width: submenuRect.width,
        height: submenuRect.height,
        centerX: submenuRect.x + Math.max(10, submenuRect.width / 2),
        centerY: submenuRect.y + Math.max(10, Math.min(submenuRect.height / 2, 36)),
      },
      isOpen:
        computed.visibility === 'visible' &&
        Number.parseFloat(computed.opacity || '0') > 0.5 &&
        computed.pointerEvents !== 'none',
      ariaExpanded: item.querySelector(':scope > .menu-link-row > .submenu-toggle')?.getAttribute('aria-expanded'),
    };
  }, label);
}

async function waitForMenuOpenState(page, label, isOpenExpected) {
  await page.waitForFunction(
    ({ targetLabel, expected }) => {
      const item = Array.from(document.querySelectorAll('nav#primary-navigation .menu > li')).find(
        (li) => li.querySelector(':scope > .menu-link-row > a')?.textContent?.trim() === targetLabel
      );

      if (!item) return false;

      const submenu = item.querySelector(':scope > ul');
      if (!submenu) return false;

      const style = window.getComputedStyle(submenu);
      const isOpen =
        style.visibility === 'visible' &&
        Number.parseFloat(style.opacity || '0') > 0.5 &&
        style.pointerEvents !== 'none';

      return expected ? isOpen : !isOpen;
    },
    { targetLabel: label, expected: isOpenExpected },
    { timeout: 4000 }
  );
}

async function verifyDesktopHover(page, route) {
  const baseContext = buildContext('desktop-hover', DESKTOP_VIEWPORT, route, 'load-route');

  await page.goto(`${BASE_URL}${route}`, { waitUntil: 'networkidle' });
  await page.setViewportSize(DESKTOP_VIEWPORT);
  logStep(baseContext, 'loaded page and set desktop viewport');

  const navVisible = await ensureNavVisible(page);
  if (!navVisible) {
    failStep(baseContext, 'primary navigation did not become visible');
  }

  const labels = [];

  for (const label of MENU_LABELS) {
    const lookupContext = buildContext('desktop-hover', DESKTOP_VIEWPORT, route, `lookup-${label}`);
    const before = await getMenuState(page, label);

    if (!before.found || !before.hasSubmenu) {
      failStep(
        lookupContext,
        !before.found ? `top-level item "${label}" not found` : `submenu missing for "${label}"`
      );
    }

    await page.mouse.move(before.triggerRect.centerX, before.triggerRect.centerY);
    await waitForMenuOpenState(page, label, true);
    logStep(buildContext('desktop-hover', DESKTOP_VIEWPORT, route, `hover-open-${label}`), 'submenu opened');

    const openState = await getMenuState(page, label);
    if (!openState.isOpen) {
      failStep(
        buildContext('desktop-hover', DESKTOP_VIEWPORT, route, `hover-open-${label}`),
        `submenu for "${label}" did not open on hover`
      );
    }

    await page.mouse.move(openState.submenuRect.centerX, openState.submenuRect.centerY);
    await page.waitForTimeout(100);

    const stillOpenState = await getMenuState(page, label);
    if (!stillOpenState.isOpen) {
      failStep(
        buildContext('desktop-hover', DESKTOP_VIEWPORT, route, `hover-submenu-${label}`),
        `submenu for "${label}" closed while pointer was inside submenu`
      );
    }

    await page.mouse.move(6, 6);
    await waitForMenuOpenState(page, label, false);

    const closedState = await getMenuState(page, label);
    if (closedState.isOpen) {
      failStep(
        buildContext('desktop-hover', DESKTOP_VIEWPORT, route, `leave-close-${label}`),
        `submenu for "${label}" did not close after pointer left the menu`
      );
    }

    const toggleAria = closedState.ariaExpanded;

    labels.push({
      label,
      passed: true,
      opensOnHover: openState.isOpen,
      staysOpenInSubmenu: stillOpenState.isOpen,
      closesOnLeave: !closedState.isOpen,
      hasAriaExpanded: toggleAria === 'false' || toggleAria === 'true',
    });
  }

  return { route, passed: true, labels };
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

async function verifyMobileDrawerAndSubmenus(page) {
  const route = '/';
  const baseContext = buildContext('mobile-drawer-submenus', MOBILE_VIEWPORT, route, 'load-route');

  await page.goto(`${BASE_URL}${route}`, { waitUntil: 'networkidle' });
  await page.setViewportSize(MOBILE_VIEWPORT);
  logStep(baseContext, 'loaded page and set mobile viewport');

  const navVisible = await ensureNavVisible(page);
  if (!navVisible) {
    failStep(baseContext, 'primary navigation did not become visible');
  }

  const navToggle = page.locator('button[aria-controls="primary-navigation"]');

  await navToggle.click();
  await waitForDrawerExpanded(page, true);
  logStep(buildContext('mobile-drawer-submenus', MOBILE_VIEWPORT, route, 'open-drawer'), 'drawer opened');

  await page.keyboard.press('Escape');
  await waitForDrawerExpanded(page, false);
  logStep(
    buildContext('mobile-drawer-submenus', MOBILE_VIEWPORT, route, 'close-drawer'),
    'drawer closed via Escape key'
  );

  await navToggle.click();
  await waitForDrawerExpanded(page, true);
  logStep(
    buildContext('mobile-drawer-submenus', MOBILE_VIEWPORT, route, 'reopen-drawer'),
    'drawer reopened for submenu checks'
  );

  const menuTree = await page.evaluate(() => {
    const rootItems = Array.from(document.querySelectorAll('nav#primary-navigation .menu > li.hasChildren'));
    const all = [];

    const getLabel = (item) => item.querySelector(':scope > .menu-link-row > a')?.textContent?.trim() || '(unnamed)';

    const walk = (item, parentId = null, depth = 0, ancestorPath = []) => {
      const id = all.length;
      item.setAttribute('data-nav-smoke-id', String(id));
      const label = getLabel(item);
      const path = [...ancestorPath, label];
      all.push({ id, parentId, depth, path: path.join(' > ') });

      const children = Array.from(item.querySelectorAll(':scope > ul > li.hasChildren'));
      children.forEach((child) => walk(child, id, depth + 1, path));
    };

    rootItems.forEach((item) => walk(item));
    return all;
  });

  if (!menuTree.length) {
    failStep(
      buildContext('mobile-drawer-submenus', MOBILE_VIEWPORT, route, 'discover-submenus'),
      'no submenu toggles were found in mobile navigation'
    );
  }

  if (!menuTree.some((node) => node.depth >= 1)) {
    failStep(
      buildContext('mobile-drawer-submenus', MOBILE_VIEWPORT, route, 'discover-nested-submenus'),
      'no nested submenu toggles were found; expected at least one nested item for coverage'
    );
  }

  const expandedOrder = [];

  for (const node of menuTree) {
    const selector = `[data-nav-smoke-id="${node.id}"] > .menu-link-row > .submenu-toggle`;
    const toggle = page.locator(selector);
    await toggle.click();
    await page.waitForFunction(
      (nodeId) =>
        document
          .querySelector(`[data-nav-smoke-id="${nodeId}"] > .menu-link-row > .submenu-toggle`)
          ?.getAttribute('aria-expanded') === 'true',
      node.id,
      { timeout: 2500 }
    );

    expandedOrder.push(node.id);
    logStep(
      buildContext('mobile-drawer-submenus', MOBILE_VIEWPORT, route, `expand-${node.path}`),
      'submenu expanded'
    );
  }

  for (const nodeId of expandedOrder.reverse()) {
    const node = menuTree.find((entry) => entry.id === nodeId);
    const selector = `[data-nav-smoke-id="${node.id}"] > .menu-link-row > .submenu-toggle`;
    const toggle = page.locator(selector);

    await toggle.click();
    await page.waitForFunction(
      (id) =>
        document
          .querySelector(`[data-nav-smoke-id="${id}"] > .menu-link-row > .submenu-toggle`)
          ?.getAttribute('aria-expanded') === 'false',
      node.id,
      { timeout: 2500 }
    );

    logStep(
      buildContext('mobile-drawer-submenus', MOBILE_VIEWPORT, route, `collapse-${node.path}`),
      'submenu collapsed'
    );
  }

  return {
    passed: true,
    route,
    viewport: viewportLabel(MOBILE_VIEWPORT),
    totalSubmenuToggles: menuTree.length,
    nestedSubmenuToggles: menuTree.filter((node) => node.depth >= 1).length,
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

    const mobileResult = await verifyMobileDrawerAndSubmenus(page);
    const passed = desktopResults.every((result) => result.passed) && mobileResult.passed;

    console.log(
      JSON.stringify(
        {
          baseUrl: BASE_URL,
          desktopViewport: viewportLabel(DESKTOP_VIEWPORT),
          mobileViewport: viewportLabel(MOBILE_VIEWPORT),
          desktopResults,
          mobileResult,
          passed,
        },
        null,
        2
      )
    );

    if (!passed) {
      throw new Error('One or more nav hover smoke checks failed');
    }

    console.log('PASS nav smoke checks');
  } finally {
    await browser.close();
  }
}

run().catch((error) => {
  console.error('FAIL nav smoke checks');
  console.error(error?.stack || String(error));
  process.exit(1);
});
