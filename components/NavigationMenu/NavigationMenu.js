import { forwardRef, useRef, useState } from 'react';
import { gql } from '@apollo/client';
import Link from 'next/link';
import { FaChevronDown } from 'react-icons/fa';
import { normalizeInternalLink } from 'utilities';

const NAV_COLLAPSE_BREAKPOINT = 1212;

const NavigationMenu = forwardRef(function NavigationMenu(
  {
    menuItems,
    className,
    children,
    id,
    onNavigate,
    expandedItems = [],
    onToggleItem,
    hoveredDesktopItemId,
    onDesktopHoverStart,
    onDesktopHoverEnd,
  },
  ref
) {
  const submenuTriggerRefs = useRef({});
  const [keyboardOpenItems, setKeyboardOpenItems] = useState([]);
  const [dismissedDesktopItems, setDismissedDesktopItems] = useState([]);

  if (!menuItems) {
    return null;
  }

  const isDesktopNavigation = () =>
    typeof window !== 'undefined' && window.innerWidth >= NAV_COLLAPSE_BREAKPOINT;

  const registerTriggerRef = (itemId, triggerType, node) => {
    if (!node) {
      return;
    }

    const currentRefs = submenuTriggerRefs.current[itemId] ?? {};

    submenuTriggerRefs.current[itemId] = {
      ...currentRefs,
      [triggerType]: node,
    };
  };

  const setLastTrigger = (itemId, triggerType, triggerElement) => {
    if (triggerElement) {
      registerTriggerRef(itemId, triggerType, triggerElement);
    }

    submenuTriggerRefs.current[itemId] = {
      ...(submenuTriggerRefs.current[itemId] ?? {}),
      lastInteracted: triggerType,
    };
  };

  const clearKeyboardState = (ids = []) => {
    if (!ids.length) {
      return;
    }

    const idsToClear = new Set(ids);

    setKeyboardOpenItems((current) => current.filter((id) => !idsToClear.has(id)));
    setDismissedDesktopItems((current) => current.filter((id) => !idsToClear.has(id)));
  };

  const openKeyboardSubmenu = (itemId) => {
    if (!isDesktopNavigation()) {
      return;
    }

    setKeyboardOpenItems((current) => (current.includes(itemId) ? current : [...current, itemId]));
    setDismissedDesktopItems((current) => current.filter((id) => id !== itemId));
  };

  const handleItemFocusCapture = (itemId, event) => {
    const triggerRefs = submenuTriggerRefs.current[itemId] ?? {};
    const focusTarget = event.target;
    const isTriggerFocusTarget =
      focusTarget === triggerRefs.primary || focusTarget === triggerRefs.toggle;

    if (dismissedDesktopItems.includes(itemId) && isTriggerFocusTarget) {
      return;
    }

    openKeyboardSubmenu(itemId);
  };

  const dismissKeyboardSubmenu = (itemId, descendantIds = []) => {
    const idsToClear = [itemId, ...descendantIds];

    setKeyboardOpenItems((current) => current.filter((id) => !idsToClear.includes(id)));

    if (!isDesktopNavigation()) {
      setDismissedDesktopItems((current) => current.filter((id) => !idsToClear.includes(id)));
      return;
    }

    setDismissedDesktopItems((current) => {
      if (current.includes(itemId)) {
        return current.filter((id) => !descendantIds.includes(id));
      }

      return [...current.filter((id) => !descendantIds.includes(id)), itemId];
    });
  };

  const isDisclosureOnlyItem = (hasChildren, href) =>
    hasChildren && (!href || /^\/?#$/i.test(href));

  const toggleSubmenu = (itemId, descendantIds = [], triggerType, triggerElement) => {
    if (triggerType) {
      setLastTrigger(itemId, triggerType, triggerElement);
    }

    clearKeyboardState(descendantIds);
    setDismissedDesktopItems((current) => current.filter((id) => id !== itemId));

    onToggleItem?.(itemId, descendantIds);
  };

  const focusLastSubmenuTrigger = (itemId) => {
    if (typeof window === 'undefined') {
      return;
    }

    window.requestAnimationFrame(() => {
      const triggerRefs = submenuTriggerRefs.current[itemId] ?? {};
      const preferredTrigger =
        triggerRefs[triggerRefs.lastInteracted] ?? triggerRefs.primary ?? triggerRefs.toggle;

      preferredTrigger?.focus();
    });
  };

  const closeExpandedSubmenuOnEscape = (
    event,
    { itemId, isExpanded, isKeyboardOpen, descendantIds }
  ) => {
    if (event.key !== 'Escape' || (!isExpanded && !isKeyboardOpen)) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();

    if (isExpanded) {
      toggleSubmenu(itemId, descendantIds);
    }

    dismissKeyboardSubmenu(itemId, descendantIds);
    focusLastSubmenuTrigger(itemId);
  };

  const getDescendantIds = (item) => {
    const ids = [];

    const walk = (currentItem) => {
      currentItem.children?.forEach((child) => {
        ids.push(child.id);
        walk(child);
      });
    };

    walk(item);

    return ids;
  };

  // Convert flat list to tree structure
  const buildMenuTree = (items) => {
    const map = {};
    const roots = [];

    items.forEach((item) => {
      map[item.id] = { ...item, children: [] };
    });

    items.forEach((item) => {
      if (item.parentId && map[item.parentId]) {
        map[item.parentId].children.push(map[item.id]);
      } else {
        roots.push(map[item.id]);
      }
    });

    return roots;
  };

  const renderMenuItems = (items, depth = 0, isBranchVisible = true) => {
    return items.map((item) => {
      const hasChildren = item.children?.length > 0;
      const isExpanded = expandedItems.includes(item.id);
      const isKeyboardOpen = keyboardOpenItems.includes(item.id);
      const isDismissedDesktopItem = dismissedDesktopItems.includes(item.id);
      const isDesktopHovered = hoveredDesktopItemId === item.id;
      const submenuId = `submenu-${item.id}`;
      const href = normalizeInternalLink(item.path ?? '');
      const target = item.target || undefined;
      const rel = target === '_blank' ? 'noopener noreferrer' : undefined;
      const isExternalLink = /^(https?:|mailto:|tel:|\/\/)/i.test(href);
      const descendantIds = hasChildren ? getDescendantIds(item) : [];
      const isDisclosureOnly = isDisclosureOnlyItem(hasChildren, href);
      const isSubmenuVisible =
        isBranchVisible && (isExpanded || isKeyboardOpen) && !isDismissedDesktopItem;
      const focusProps = isBranchVisible ? {} : { tabIndex: -1 };
      const submenuTriggerProps = hasChildren
        ? {
            'aria-controls': submenuId,
            'aria-expanded': isSubmenuVisible,
            'aria-haspopup': 'menu',
          }
        : {};

      return (
        <li
          key={item.id ?? ''}
          className={[
            hasChildren ? 'hasChildren' : '',
            isDisclosureOnly ? 'disclosure-only' : '',
            isSubmenuVisible ? 'expanded' : '',
            isDismissedDesktopItem ? 'escape-dismissed' : '',
            isDesktopHovered ? 'hover-open' : '',
          ]
            .filter(Boolean)
            .join(' ')}
          onFocusCapture={
            hasChildren ? (event) => handleItemFocusCapture(item.id, event) : undefined
          }
          onBlur={
            hasChildren
              ? (event) => {
                  const nextFocusedElement = event.relatedTarget;

                  if (event.currentTarget.contains(nextFocusedElement)) {
                    return;
                  }

                  clearKeyboardState([item.id, ...descendantIds]);
                }
              : undefined
          }
          onMouseEnter={
            hasChildren
              ? () => {
                  setDismissedDesktopItems((current) => current.filter((id) => id !== item.id));

                  if (depth === 0) {
                    onDesktopHoverStart?.(item.id);
                  }
                }
              : undefined
          }
          onMouseLeave={
            hasChildren && depth === 0 ? () => onDesktopHoverEnd?.(item.id) : undefined
          }
        >
          <div className="menu-link-row">
            {isDisclosureOnly ? (
              <button
                type="button"
                className="menu-item-trigger menu-parent-trigger"
                ref={(node) => registerTriggerRef(item.id, 'primary', node)}
                onFocus={(event) =>
                  setLastTrigger(
                    item.id,
                    'primary',
                    event.currentTarget instanceof HTMLElement ? event.currentTarget : undefined
                  )
                }
                onClick={(event) =>
                  toggleSubmenu(
                    item.id,
                    descendantIds,
                    'primary',
                    event.currentTarget instanceof HTMLElement ? event.currentTarget : undefined
                  )
                }
                {...submenuTriggerProps}
                {...focusProps}
              >
                {item.label ?? ''}
              </button>
            ) : isExternalLink || target ? (
              <a
                href={href}
                target={target}
                rel={rel}
                className="menu-item-trigger"
                ref={(node) => registerTriggerRef(item.id, 'primary', node)}
                onClick={onNavigate}
                onFocus={(event) =>
                  hasChildren
                    ? setLastTrigger(
                        item.id,
                        'primary',
                        event.currentTarget instanceof HTMLElement
                          ? event.currentTarget
                          : undefined
                      )
                    : undefined
                }
                {...submenuTriggerProps}
                {...focusProps}
              >
                {item.label ?? ''}
              </a>
            ) : (
              <Link
                href={href}
                className="menu-item-trigger"
                ref={(node) => registerTriggerRef(item.id, 'primary', node)}
                onClick={onNavigate}
                onFocus={(event) =>
                  hasChildren
                    ? setLastTrigger(
                        item.id,
                        'primary',
                        event.currentTarget instanceof HTMLElement
                          ? event.currentTarget
                          : undefined
                      )
                    : undefined
                }
                {...submenuTriggerProps}
                {...focusProps}
              >
                {item.label ?? ''}
              </Link>
            )}
            {hasChildren && (
              <button
                type="button"
                className="submenu-toggle"
                aria-label={`Toggle ${item.label ?? 'submenu'} submenu`}
                ref={(node) => {
                  registerTriggerRef(item.id, 'toggle', node);
                }}
                onFocus={(event) =>
                  setLastTrigger(
                    item.id,
                    'toggle',
                    event.currentTarget instanceof HTMLElement ? event.currentTarget : undefined
                  )
                }
                onClick={(event) =>
                  toggleSubmenu(
                    item.id,
                    descendantIds,
                    'toggle',
                    event.currentTarget instanceof HTMLElement ? event.currentTarget : undefined
                  )
                }
                {...submenuTriggerProps}
                {...focusProps}
              >
                <FaChevronDown aria-hidden="true" />
              </button>
            )}
          </div>
          {hasChildren && (
            <ul
              id={submenuId}
              data-depth={depth + 1}
              aria-hidden={!isSubmenuVisible}
              onKeyDown={(event) =>
                closeExpandedSubmenuOnEscape(event, {
                  itemId: item.id,
                  isExpanded,
                  isKeyboardOpen,
                  descendantIds,
                })
              }
            >
              {renderMenuItems(item.children, depth + 1, isSubmenuVisible)}
            </ul>
          )}
        </li>
      );
    });
  };

  const menuTree = buildMenuTree(menuItems);

  return (
    <nav
      id={id}
      ref={ref}
      className={className}
      role="navigation"
      aria-label={`${menuItems[0]?.menu?.node?.name ?? 'Main'} menu`}
    >
      <ul className="menu">
        {renderMenuItems(menuTree)}
        {children}
      </ul>
    </nav>
  );
});

NavigationMenu.fragments = {
  entry: gql`
    fragment NavigationMenuItemFragment on MenuItem {
      id
      path
      target
      label
      parentId
      cssClasses
      menu {
        node {
          name
        }
      }
    }
  `,
};

export default NavigationMenu;
