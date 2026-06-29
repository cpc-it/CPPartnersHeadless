import { forwardRef, useRef } from 'react';
import { gql } from '@apollo/client';
import Link from 'next/link';
import { FaChevronDown } from 'react-icons/fa';
import { normalizeInternalLink } from 'utilities';

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

  if (!menuItems) {
    return null;
  }

  const isDisclosureOnlyItem = (hasChildren, href) =>
    hasChildren && (!href || /^\/?#$/i.test(href));

  const toggleSubmenu = (itemId, descendantIds = [], triggerElement) => {
    if (triggerElement) {
      submenuTriggerRefs.current[itemId] = triggerElement;
    }

    onToggleItem?.(itemId, descendantIds);
  };

  const focusLastSubmenuTrigger = (itemId) => {
    if (typeof window === 'undefined') {
      return;
    }

    window.requestAnimationFrame(() => {
      submenuTriggerRefs.current[itemId]?.focus();
    });
  };

  const closeExpandedSubmenuOnEscape = (event, { itemId, isExpanded, descendantIds }) => {
    if (event.key !== 'Escape' || !isExpanded) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    toggleSubmenu(itemId, descendantIds);
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
      const isDesktopHovered = hoveredDesktopItemId === item.id;
      const submenuId = `submenu-${item.id}`;
      const href = normalizeInternalLink(item.path ?? '');
      const target = item.target || undefined;
      const rel = target === '_blank' ? 'noopener noreferrer' : undefined;
      const isExternalLink = /^(https?:|mailto:|tel:|\/\/)/i.test(href);
      const descendantIds = hasChildren ? getDescendantIds(item) : [];
      const isDisclosureOnly = isDisclosureOnlyItem(hasChildren, href);
      const isSubmenuVisible = isBranchVisible && isExpanded;
      const focusProps = isBranchVisible ? {} : { tabIndex: -1 };

      return (
        <li
          key={item.id ?? ''}
          className={[
            hasChildren ? 'hasChildren' : '',
            isDisclosureOnly ? 'disclosure-only' : '',
            isSubmenuVisible ? 'expanded' : '',
            isDesktopHovered ? 'hover-open' : '',
          ]
            .filter(Boolean)
            .join(' ')}
          onKeyDown={
            hasChildren
              ? (event) =>
                  closeExpandedSubmenuOnEscape(event, {
                    itemId: item.id,
                    isExpanded,
                    descendantIds,
                  })
              : undefined
          }
          onMouseEnter={
            hasChildren && depth === 0
              ? () => onDesktopHoverStart?.(item.id)
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
                aria-expanded={isSubmenuVisible}
                aria-controls={submenuId}
                onClick={(event) =>
                  toggleSubmenu(
                    item.id,
                    descendantIds,
                    event.currentTarget instanceof HTMLElement ? event.currentTarget : undefined
                  )
                }
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
                onClick={onNavigate}
                {...focusProps}
              >
                {item.label ?? ''}
              </a>
            ) : (
              <Link href={href} className="menu-item-trigger" onClick={onNavigate} {...focusProps}>
                {item.label ?? ''}
              </Link>
            )}
            {hasChildren && (
              <button
                type="button"
                className="submenu-toggle"
                aria-expanded={isSubmenuVisible}
                aria-controls={submenuId}
                aria-label={`Toggle ${item.label ?? 'submenu'} submenu`}
                ref={(node) => {
                  if (node) {
                    submenuTriggerRefs.current[item.id] = node;
                  }
                }}
                onClick={(event) =>
                  toggleSubmenu(
                    item.id,
                    descendantIds,
                    event.currentTarget instanceof HTMLElement ? event.currentTarget : undefined
                  )
                }
                {...focusProps}
              >
                <FaChevronDown aria-hidden="true" />
              </button>
            )}
          </div>
          {hasChildren && (
            <ul id={submenuId} data-depth={depth + 1} aria-hidden={!isSubmenuVisible}>
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
