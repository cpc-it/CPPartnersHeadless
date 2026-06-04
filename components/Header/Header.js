import { useState, useEffect, useRef } from 'react';
import classNames from 'classnames/bind';
import { FaBars, FaSearch, FaTimes } from 'react-icons/fa';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/router';

import { NavigationMenu, SkipNavigationLink } from '../';
import * as SELECTORS from '../../constants/selectors';

import styles from './Header.module.scss';
let cx = classNames.bind(styles);
const NAV_COLLAPSE_BREAKPOINT = 1212;

export default function Header({ className, menuItems }) {
  const [isNavShown, setIsNavShown] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [expandedItems, setExpandedItems] = useState([]);
  const menuRef = useRef(null);
  const router = useRouter();

  // Classes with scroll-aware styles
  const headerClasses = cx('header', className, { scrolled: isScrolled });
  const logoWrapClasses = cx('logo-wrap', { scrolled: isScrolled });
  const headerContentClasses = cx('container', 'header-content', {
    scrolled: isScrolled,
  });

  const navClasses = cx(
    'primary-navigation',
    isNavShown ? cx('show') : undefined
  );

  const closeNavigation = () => {
    setIsNavShown(false);
    setExpandedItems([]);
  };

  const toggleNavigation = () => {
    setIsNavShown((current) => {
      const next = !current;

      if (!next) {
        setExpandedItems([]);
      }

      return next;
    });
  };

  const toggleExpandedItem = (itemId) => {
    setExpandedItems((current) =>
      current.includes(itemId)
        ? current.filter((id) => id !== itemId)
        : [...current, itemId]
    );
  };

  const handleHomeClick = (event) => {
    closeNavigation();

    if (typeof window === 'undefined') {
      return;
    }

    if (router.asPath === '/') {
      event.preventDefault();

      window.history.replaceState(null, '', '/');
      window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
      document.getElementById(SELECTORS.MAIN_CONTENT_ID)?.focus();
    }
  };

  // Handle scroll detection
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 0);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    closeNavigation();
  }, [router.asPath]);

  useEffect(() => {
    if (!isNavShown) {
      document.body.style.overflow = '';
      return undefined;
    }

    document.body.style.overflow = 'hidden';

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        closeNavigation();
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isNavShown]);

  // Handle submenu overflow flipping
  useEffect(() => {
    const items = menuRef.current?.querySelectorAll('li.hasChildren') || [];
    const cleanups = [];

    const resetSubmenuPosition = (submenu) => {
      submenu.style.left = '';
      submenu.style.right = '';
    };

    items.forEach((li) => {
      const submenu = li.querySelector(':scope > ul');
      if (!submenu) return;

      const handlePositionSubmenu = () => {
        if (window.innerWidth < NAV_COLLAPSE_BREAKPOINT) {
          resetSubmenuPosition(submenu);
          li.classList.remove('submenu-align-end', 'submenu-open-left');
          return;
        }

        const isTopLevel = li.parentElement?.classList.contains('menu');

        li.classList.remove('submenu-align-end', 'submenu-open-left');
        resetSubmenuPosition(submenu);

        if (isTopLevel) {
          submenu.style.left = '0';
          submenu.style.right = 'auto';
        } else {
          submenu.style.left = '100%';
          submenu.style.right = 'auto';
        }

        const rect = submenu.getBoundingClientRect();
        const overflowsRight = rect.right > window.innerWidth;
        const overflowsLeft = rect.left < 0;

        if (isTopLevel) {
          if (overflowsRight) {
            li.classList.add('submenu-align-end');
            submenu.style.left = 'auto';
            submenu.style.right = '0';
          }

          return;
        }

        if (overflowsRight && !overflowsLeft) {
          li.classList.add('submenu-open-left');
          submenu.style.left = 'auto';
          submenu.style.right = '100%';
        }
      };

      li.addEventListener('mouseenter', handlePositionSubmenu);
      li.addEventListener('focusin', handlePositionSubmenu);
      window.addEventListener('resize', handlePositionSubmenu);

      cleanups.push(() => {
        li.removeEventListener('mouseenter', handlePositionSubmenu);
        li.removeEventListener('focusin', handlePositionSubmenu);
        window.removeEventListener('resize', handlePositionSubmenu);
      });
    });

    return () => {
      cleanups.forEach((cleanup) => cleanup());
    };
  }, [menuItems]);

  return (
    <header className={headerClasses}>
      <div className={logoWrapClasses}>
        <div className="container">
          <div className={cx('logo')}>
            <Link legacyBehavior href="/">
              <a title="Home" onClick={handleHomeClick}>
                <Image
                  src="/logo.png"
                  width={400}
                  height={80}
                  alt="Cal Poly University logo"
                  style={{ width: '100%', height: 'auto' }}
                />
              </a>
            </Link>
          </div>
        </div>
      </div>

      <SkipNavigationLink />

      <div className={headerContentClasses}>
        <div className={cx('bar')}>
          <Link href="/" className={cx('titleName')} onClick={handleHomeClick}>
            Cal Poly Partners
          </Link>

          <div className={cx('header-actions')}>
            <Link legacyBehavior href="/search">
              <a
                className={cx('search-link')}
                aria-label="Search the site"
                onClick={closeNavigation}
              >
                <FaSearch aria-hidden="true" focusable="false" />
              </a>
            </Link>

            <button
              type="button"
              className={cx('nav-toggle')}
              onClick={toggleNavigation}
              aria-label={isNavShown ? 'Close navigation' : 'Open navigation'}
              aria-controls="primary-navigation"
              aria-expanded={isNavShown}
            >
              {isNavShown ? <FaTimes /> : <FaBars />}
            </button>
          </div>

          <button
            type="button"
            className={cx('nav-backdrop', { show: isNavShown })}
            aria-label="Close navigation"
            tabIndex={isNavShown ? 0 : -1}
            onClick={closeNavigation}
          />

          <NavigationMenu
            id="primary-navigation"
            className={navClasses}
            menuItems={menuItems}
            ref={menuRef}
            onNavigate={closeNavigation}
            expandedItems={expandedItems}
            onToggleItem={toggleExpandedItem}
          >
            {isNavShown ? (
              <li className="mobile-search-link">
                <Link href="/search" onClick={closeNavigation}>
                  Search
                </Link>
              </li>
            ) : null}
          </NavigationMenu>

          {isNavShown ? (
            <button
              type="button"
              className={cx('mobile-close')}
              aria-label="Close navigation"
              onClick={closeNavigation}
            >
              <FaTimes aria-hidden="true" />
            </button>
          ) : null}
        </div>
      </div>
    </header>
  );
}
