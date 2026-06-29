import { forwardRef } from 'react';
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
  if (!menuItems) {
    return null;
  }

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
      const isSubmenuVisible = isBranchVisible && isExpanded;
      const focusProps = isBranchVisible ? {} : { tabIndex: -1 };

      return (
        <li
          key={item.id ?? ''}
          className={[
            hasChildren ? 'hasChildren' : '',
            isExpanded ? 'expanded' : '',
            isDesktopHovered ? 'hover-open' : '',
          ]
            .filter(Boolean)
            .join(' ')}
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
            {isExternalLink || target ? (
              <a href={href} target={target} rel={rel} onClick={onNavigate} {...focusProps}>
                {item.label ?? ''}
              </a>
            ) : (
              <Link href={href} onClick={onNavigate} {...focusProps}>
                {item.label ?? ''}
              </Link>
            )}
            {hasChildren && (
              <button
                type="button"
                className="submenu-toggle"
                aria-expanded={isExpanded}
                aria-controls={submenuId}
                aria-label={`Toggle ${item.label ?? 'submenu'} submenu`}
                onClick={() => onToggleItem?.(item.id, descendantIds)}
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
