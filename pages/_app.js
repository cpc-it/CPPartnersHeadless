import '../faust.config';
import React, { useEffect } from 'react';
import { useRouter } from 'next/router';
import { FaustProvider } from '@faustwp/core';
import Script from 'next/script';
import 'normalize.css/normalize.css';
import '@fontsource/source-sans-pro/300.css';
import '@fontsource/source-sans-pro/400.css';
import '@fontsource/source-sans-pro/600.css';
import '@fontsource/source-sans-pro/700.css';
import '../styles/main.scss';
import ThemeStyles from 'components/ThemeStyles/ThemeStyles';

const GA_TRACKING_ID = 'G-1KSLJ61R0V'; 

export default function MyApp({ Component, pageProps }) {
  const router = useRouter();

  // Google Analytics route change tracking
  useEffect(() => {
    const handleRouteChange = (url) => {
      if (typeof window.gtag !== 'undefined') {
        window.gtag('config', GA_TRACKING_ID, {
          page_path: url,
        });
      }

      // Ensure we land at top on route changes unless there's an anchor hash.
      if (typeof window !== 'undefined' && !window.location.hash) {
        window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
      }
    };

    router.events.on('routeChangeComplete', handleRouteChange);
    return () => {
      router.events.off('routeChangeComplete', handleRouteChange);
    };
  }, [router.events]);

  // Your parallax and link logic
  useEffect(() => {
    if (typeof window === 'undefined') {
      return undefined;
    }

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const isDesktop = window.innerWidth >= 1024;
    const shouldRunParallax = isDesktop && !prefersReducedMotion;

    let frameId = null;

    const handleScroll = () => {
      if (!shouldRunParallax) {
        return;
      }

      if (frameId !== null) {
        return;
      }

      frameId = window.requestAnimationFrame(() => {
        frameId = null;

        const parallaxEls = document.querySelectorAll('.wp-block-image.parallax img');
        parallaxEls.forEach((el) => {
          const container = el.closest('.parallax');
          if (!container) return;
          const rect = container.getBoundingClientRect();
          const windowHeight = window.innerHeight;
          const progress = 1 - Math.min(Math.max(rect.top / windowHeight, 0), 1);
          const maxOffset = 130;
          const offset = Math.max(Math.min((progress - 0.5) * 2 * maxOffset, maxOffset), -maxOffset);
          el.style.transform = `translateY(${offset}px)`;
        });
      });
    };

    const checkStandaloneLinks = () => {
      const links = document.querySelectorAll(
        '.bg-green a, .bg-white a, .bg-yellow a, .green-image-right a, .white-image-left a, .white-image-right a, .yellow-image-left a, .intro-text a'
      );

      links.forEach((link) => {
        const parent = link.parentElement;
        if (!parent) return;

        const visualChildren = Array.from(parent.childNodes).filter((node) => {
          return (
            node.nodeType === Node.ELEMENT_NODE ||
            (node.nodeType === Node.TEXT_NODE && node.textContent.trim() !== '')
          );
        });

        const isOnlyChild = visualChildren.length === 1 && visualChildren[0] === link;
        const rect = link.getBoundingClientRect();
        const parentRect = parent.getBoundingClientRect();

        const isFullBlock =
          Math.abs(rect.top - parentRect.top) < 2 &&
          Math.abs(rect.bottom - parentRect.bottom) < 2;

        const parentText = parent.innerText.trim();
        const linkText = link.innerText.trim();
        const isOnlyTextMatch = parentText === linkText;

        const isStandalone = isOnlyChild && isFullBlock && isOnlyTextMatch;
        link.classList.toggle('standalone-link', isStandalone);
      });
    };

    const runDeferredWork = () => {
      if (shouldRunParallax) {
        handleScroll();
      }

      checkStandaloneLinks();
    };

    const idleCallbackId =
      typeof window.requestIdleCallback === 'function'
        ? window.requestIdleCallback(runDeferredWork)
        : window.setTimeout(runDeferredWork, 250);

    if (shouldRunParallax) {
      window.addEventListener('scroll', handleScroll, { passive: true });
    }

    window.addEventListener('resize', checkStandaloneLinks);

    return () => {
      if (frameId !== null) {
        window.cancelAnimationFrame(frameId);
      }

      if (typeof window.cancelIdleCallback === 'function' && typeof idleCallbackId === 'number') {
        window.cancelIdleCallback(idleCallbackId);
      } else {
        clearTimeout(idleCallbackId);
      }

      if (shouldRunParallax) {
        window.removeEventListener('scroll', handleScroll);
      }

      window.removeEventListener('resize', checkStandaloneLinks);
    };
  }, []);

  return (
    <>
      {/* ✅ Google Analytics scripts */}
      <Script
        strategy="lazyOnload"
        src={`https://www.googletagmanager.com/gtag/js?id=${GA_TRACKING_ID}`}
      />
      <Script
        id="gtag-init"
        strategy="lazyOnload"
        dangerouslySetInnerHTML={{
          __html: `
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', '${GA_TRACKING_ID}', {
              page_path: window.location.pathname,
            });
          `,
        }}
      />

      <ThemeStyles />
      <FaustProvider pageProps={pageProps}>
        <Component {...pageProps} key={router.asPath} />
      </FaustProvider>
    </>
  );
}
