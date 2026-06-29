import { chromium } from 'playwright';

const BASE_URL = process.env.BASE_URL || 'http://localhost:3002';
const ROUTE = '/';
const DESKTOP_VIEWPORT = { width: 1440, height: 900 };

function logStep(step, message) {
  console.log(`[desktop-nav-escape-smoke] [step:${step}] ${message}`);
}

function failStep(step, detail) {
  throw new Error(`[desktop-nav-escape-smoke] [step:${step}] ${detail}`);
}

async function assertTopLevelEscape(page, topLevelIndex) {
  const item = page.locator('nav#primary-navigation .menu > li.hasChildren').nth(topLevelIndex);
  const trigger = item.locator(':scope > .menu-link-row > .menu-item-trigger').first();

  await trigger.waitFor({ state: 'visible', timeout: 5000 });
  await trigger.focus();
  await page.keyboard.press('Tab');

  const submenuFocusState = await item.evaluate((node) => {
    const submenu = node.querySelector(':scope > ul');
    const active = document.activeElement;

    return {
      hasSubmenu: Boolean(submenu),
      focusInsideSubmenu: Boolean(submenu) && Boolean(active) && submenu.contains(active),
      activeText: active?.textContent?.replace(/\s+/g, ' ').trim() ?? '',
    };
  });

  if (!submenuFocusState.hasSubmenu || !submenuFocusState.focusInsideSubmenu) {
    failStep(
      `top-level-${topLevelIndex + 1}-prep`,
      `expected Tab from trigger to move into submenu, got focus on "${submenuFocusState.activeText || 'unknown'}"`
    );
  }

  await page.keyboard.press('Escape');

  await page.waitForFunction(
    (index) => {
      const itemNode = document.querySelectorAll('nav#primary-navigation .menu > li.hasChildren')[index];
      if (!itemNode) return false;

      const triggerNode = itemNode.querySelector(':scope > .menu-link-row > .menu-item-trigger');
      const submenuNode = itemNode.querySelector(':scope > ul');

      if (!triggerNode || !submenuNode) {
        return false;
      }

      const style = window.getComputedStyle(submenuNode);

      return (
        document.activeElement === triggerNode &&
        triggerNode.getAttribute('aria-expanded') === 'false' &&
        submenuNode.getAttribute('aria-hidden') === 'true' &&
        style.visibility === 'hidden' &&
        style.pointerEvents === 'none'
      );
    },
    topLevelIndex,
    { timeout: 2500 }
  );

  const tabState = await (async () => {
    await page.keyboard.press('Tab');
    return page.evaluate((index) => {
      const itemNode = document.querySelectorAll('nav#primary-navigation .menu > li.hasChildren')[index];
      const triggerNode = itemNode?.querySelector(':scope > .menu-link-row > .menu-item-trigger');
      const active = document.activeElement;

      return {
        activeText: active?.textContent?.replace(/\s+/g, ' ').trim() ?? '',
        bodyFocused: active === document.body,
        stillOnTrigger: Boolean(triggerNode) && active === triggerNode,
      };
    }, topLevelIndex);
  })();

  if (tabState.bodyFocused || tabState.stillOnTrigger) {
    failStep(
      `top-level-${topLevelIndex + 1}-tab-order`,
      `expected Tab after Escape to move onward, got focus on "${tabState.activeText || 'body'}"`
    );
  }

  logStep(
    `top-level-${topLevelIndex + 1}`,
    `Escape closed top-level submenu ${topLevelIndex + 1} and returned focus to its trigger`
  );
}

async function assertNestedEscape(page) {
  const parent = page.locator('nav#primary-navigation .menu > li.hasChildren').first();
  const parentTrigger = parent.locator(':scope > .menu-link-row > .menu-item-trigger').first();
  const nestedItem = parent.locator(':scope > ul > li.hasChildren').first();
  const nestedTrigger = nestedItem.locator(':scope > .menu-link-row > .menu-item-trigger').first();

  await parentTrigger.focus();
  await page.keyboard.press('Tab');
  await nestedTrigger.focus();
  await page.keyboard.press('Tab');

  const nestedPrepState = await nestedItem.evaluate((node) => {
    const submenu = node.querySelector(':scope > ul');
    const active = document.activeElement;

    return {
      hasSubmenu: Boolean(submenu),
      focusInsideSubmenu: Boolean(submenu) && Boolean(active) && submenu.contains(active),
      activeText: active?.textContent?.replace(/\s+/g, ' ').trim() ?? '',
    };
  });

  if (!nestedPrepState.hasSubmenu || !nestedPrepState.focusInsideSubmenu) {
    failStep(
      'nested-prep',
      `expected Tab from nested trigger to move into nested submenu, got focus on "${nestedPrepState.activeText || 'unknown'}"`
    );
  }

  await page.keyboard.press('Escape');

  await page.waitForFunction(
    () => {
      const parentNode = document.querySelector('nav#primary-navigation .menu > li.hasChildren');
      const nestedNode = parentNode?.querySelector(':scope > ul > li.hasChildren');
      if (!parentNode || !nestedNode) {
        return false;
      }

      const parentTriggerNode = parentNode.querySelector(':scope > .menu-link-row > .menu-item-trigger');
      const parentSubmenuNode = parentNode.querySelector(':scope > ul');
      const nestedTriggerNode = nestedNode.querySelector(':scope > .menu-link-row > .menu-item-trigger');
      const nestedSubmenuNode = nestedNode.querySelector(':scope > ul');

      if (!parentTriggerNode || !parentSubmenuNode || !nestedTriggerNode || !nestedSubmenuNode) {
        return false;
      }

      const nestedStyle = window.getComputedStyle(nestedSubmenuNode);

      return (
        document.activeElement === nestedTriggerNode &&
        parentTriggerNode.getAttribute('aria-expanded') === 'true' &&
        parentSubmenuNode.getAttribute('aria-hidden') === 'false' &&
        nestedTriggerNode.getAttribute('aria-expanded') === 'false' &&
        nestedSubmenuNode.getAttribute('aria-hidden') === 'true' &&
        nestedStyle.visibility === 'hidden' &&
        nestedStyle.pointerEvents === 'none'
      );
    },
    { timeout: 2500 }
  );

  const shiftTabState = await (async () => {
    await page.keyboard.press('Shift+Tab');
    return page.evaluate(() => {
      const active = document.activeElement;
      const nestedNode = document.querySelector('nav#primary-navigation .menu > li.hasChildren > ul > li.hasChildren');
      const nestedTriggerNode = nestedNode?.querySelector(':scope > .menu-link-row > .menu-item-trigger');

      return {
        activeText: active?.textContent?.replace(/\s+/g, ' ').trim() ?? '',
        bodyFocused: active === document.body,
        stillOnTrigger: Boolean(nestedTriggerNode) && active === nestedTriggerNode,
      };
    });
  })();

  if (shiftTabState.bodyFocused || shiftTabState.stillOnTrigger) {
    failStep(
      'nested-shift-tab-order',
      `expected Shift+Tab after nested Escape to move backward, got focus on "${shiftTabState.activeText || 'body'}"`
    );
  }

  logStep('nested', 'Escape closed nested submenu, preserved parent branch, and returned focus to nested trigger');
}

async function run() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  try {
    await page.setViewportSize(DESKTOP_VIEWPORT);
    await page.goto(`${BASE_URL}${ROUTE}`, { waitUntil: 'networkidle' });

    await assertTopLevelEscape(page, 0);
    await page.goto(`${BASE_URL}${ROUTE}`, { waitUntil: 'networkidle' });

    await assertTopLevelEscape(page, 1);
    await page.goto(`${BASE_URL}${ROUTE}`, { waitUntil: 'networkidle' });

    await assertNestedEscape(page);

    console.log(
      JSON.stringify(
        {
          baseUrl: BASE_URL,
          route: ROUTE,
          viewport: DESKTOP_VIEWPORT,
          checks: [
            'top-level submenu 1 Escape closes and restores focus',
            'top-level submenu 2 Escape closes and restores focus',
            'nested submenu Escape closes only the nested branch',
            'tab order advances after top-level Escape',
            'shift+tab order reverses after nested Escape',
          ],
          passed: true,
        },
        null,
        2
      )
    );

    console.log('PASS desktop nav Escape smoke checks');
  } finally {
    await browser.close();
  }
}

run().catch((error) => {
  console.error('FAIL desktop nav Escape smoke checks');
  console.error(error?.stack || String(error));
  process.exit(1);
});