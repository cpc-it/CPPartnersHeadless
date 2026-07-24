import { useState, useEffect, useRef } from 'react';
import parse, { attributesToProps, domToReact } from 'html-react-parser';
import className from 'classnames/bind';
import { Carousel } from 'react-responsive-carousel';
import { CountUp } from 'countup.js';
import 'react-responsive-carousel/lib/styles/carousel.min.css';
import { normalizeInternalLink } from 'utilities';

import styles from './ContentWrapper.module.scss';

const cx = className.bind(styles);

export default function ContentWrapper({ content, className, children }) {
  const [isMobile, setIsMobile] = useState(false);
  const articleRef = useRef(null);

  useEffect(() => {
    const handleResize = () => {
      // Adjust breakpoint as needed (e.g., 768px)
      setIsMobile(window.innerWidth <= 768);
    };

    handleResize(); // run on mount
    window.addEventListener('resize', handleResize);

    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const root = articleRef.current;
    if (!root) return;

    const els = Array.from(root.querySelectorAll('.countup'));
    if (!els.length) return;

    const startCountUp = (el) => {
      if (!el || el.dataset.countupInitialized === 'true') return;

      const text = (el.textContent || '').trim();
      const match = text.match(/^([^\d-]*)(-?[\d,.]+)(.*)$/);
      if (!match) return;

      const prefix = match[1] || '';
      const numeric = match[2].replace(/,/g, '');
      const suffix = match[3] || '';
      const value = Number.parseFloat(numeric);

      if (Number.isNaN(value)) return;

      const countUp = new CountUp(el, value, {
        prefix,
        suffix,
        separator: ',',
      });

      if (countUp.error) return;

      el.dataset.countupInitialized = 'true';
      countUp.start();
    };

    if (typeof window === 'undefined' || !('IntersectionObserver' in window)) {
      els.forEach((el) => startCountUp(el));
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          startCountUp(entry.target);
          observer.unobserve(entry.target);
        });
      },
      {
        threshold: 0,
        rootMargin: '0px 0px -10% 0px',
      }
    );

    els.forEach((el) => observer.observe(el));

    return () => {
      observer.disconnect();
    };
  }, [content]);

  const transform = (node) => {
    if (node.name === 'a' && node.attribs?.href) {
      const props = attributesToProps(node.attribs);

      return (
        <a {...props} href={normalizeInternalLink(node.attribs.href)}>
          {domToReact(node.children ?? [], parserOptions)}
        </a>
      );
    }

    const isTickerGroup =
      node.name === 'div' &&
      node.attribs?.class?.includes('wp-block-group') &&
      node.attribs?.class?.includes('ticker');

    if (isTickerGroup) {
      const figures = node.children?.filter(
        (child) =>
          child.name === 'figure' &&
          child.attribs?.class?.includes('wp-block-image')
      );

      return (
        <Carousel
          autoPlay
          infiniteLoop
          interval={3000}
          showArrows={!isMobile}        // optionally hide arrows on mobile
          showThumbs={false}
          showStatus={false}
          showIndicators={false}
          stopOnHover
          centerMode={!isMobile}        // no centerMode on mobile
          centerSlidePercentage={isMobile ? 100 : 33} // 1 slide vs ~3 slides
          swipeable
          emulateTouch
          transitionTime={700}
        >
          {figures.map((fig, index) => (
            <div key={index}>{domToReact([fig], parserOptions)}</div>
          ))}
        </Carousel>
      );
    }
  };

  const parserOptions = { replace: transform };

  return (
    <article ref={articleRef} className={cx('content', className)}>
      {parse(content ?? '', parserOptions)}
      {children}
    </article>
  );
}
