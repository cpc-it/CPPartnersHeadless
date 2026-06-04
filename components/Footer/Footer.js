import classNames from 'classnames/bind';
import {
  FaFacebookF,
  FaInstagram,
  FaLinkedinIn,
  FaXTwitter,
} from 'react-icons/fa6';
import Image from 'next/image';
import Link from 'next/link';
import appConfig from 'app.config.js';

import { NavigationMenu } from '../';

import styles from './Footer.module.scss';

let cx = classNames.bind(styles);

/**
 * The Blueprint's Footer component
 * @return {React.ReactElement} The Footer component.
 */
export default function Footer({
  siteTitle,
  title,
  menuItems, // PRIMARY footer menu
  navOneMenuItems, // SECONDARY footer menu
  navTwoMenuItems, // TERTIARY footer menu
}) {
  const socialLabels = {
    facebook: 'Cal Poly Partners on Facebook',
    instagram: 'Cal Poly Partners on Instagram',
    linkedin: 'Cal Poly Partners on LinkedIn',
    twitter: 'Cal Poly Partners on X',
    calPolyFacebook: 'Cal Poly on Facebook',
    calPolyInstagram: 'Cal Poly on Instagram',
    calPolyTwitter: 'Cal Poly on X',
  };

  return (
    <footer className={cx('footer')}>
      <div className="container">

        <div className={cx('footer-nav-contact-info')}>
          <div className={cx('footer-nav')}>
            <h3>Quick Links</h3>
            <NavigationMenu className={cx('quick')} menuItems={menuItems} />
          </div>

          <div className={cx('contact-info')}>
            <Link href="/" className={cx('cppText')}>
              {title ?? 'Cal Poly Partners'}
            </Link>
            <a href="tel:8057561451" className={cx('phone')}>
              (805) 756-1451
            </a>

            {appConfig?.socialLinks && (
              <div className={cx('social-links')}>
                <ul aria-label="Social media">
                  {appConfig.socialLinks?.facebookUrl && (
                    <li>
                      <a
                        target="_blank"
                        rel="noopener noreferrer"
                        className={cx('social-icon-link')}
                        aria-label={socialLabels.facebook}
                        href={appConfig.socialLinks.facebookUrl}
                      >
                        <FaFacebookF
                          className={cx('social-icon')}
                          aria-hidden="true"
                          focusable="false"
                        />
                      </a>
                    </li>
                  )}
                  {appConfig.socialLinks?.instagramUrl && (
                    <li>
                      <a
                        target="_blank"
                        rel="noopener noreferrer"
                        className={cx('social-icon-link')}
                        aria-label={socialLabels.instagram}
                        href={appConfig.socialLinks.instagramUrl}
                      >
                        <FaInstagram
                          className={cx('social-icon')}
                          aria-hidden="true"
                          focusable="false"
                        />
                      </a>
                    </li>
                  )}
                  {appConfig.socialLinks?.linkedinUrl && (
                    <li>
                      <a
                        target="_blank"
                        rel="noopener noreferrer"
                        className={cx('social-icon-link')}
                        aria-label={socialLabels.linkedin}
                        href={appConfig.socialLinks.linkedinUrl}
                      >
                        <FaLinkedinIn
                          className={cx('social-icon')}
                          aria-hidden="true"
                          focusable="false"
                        />
                      </a>
                    </li>
                  )}
                  {appConfig.socialLinks?.twitterUrl && (
                    <li>
                      <a
                        target="_blank"
                        rel="noopener noreferrer"
                        className={cx('social-icon-link')}
                        aria-label={socialLabels.twitter}
                        href={appConfig.socialLinks.twitterUrl}
                      >
                        <FaXTwitter
                          className={cx('social-icon')}
                          aria-hidden="true"
                          focusable="false"
                        />
                      </a>
                    </li>
                  )}
                </ul>
              </div>
            )}
          </div>
        </div>

        <div className={cx('logo-address')}>
          <div className={cx('logo')}>
            <Link legacyBehavior href="/">
              <a title="Home">
                <Image
                  src="/logo.png"
                  width={400}
                  height={80}
                  alt="Cal Poly University logo"
                  sizes="(max-width: 768px) 180px, 250px"
                  style={{ width: '100%', height: 'auto' }}
                />
              </a>
            </Link>
          </div>

          <p>1 Grand Avenue, San Luis Obispo, CA 93407</p>

          <a href="tel:8057561111" className={cx('phone')}>
            (805) 756-1111
          </a>

          <div className={cx('social-links', 'cp-links')}>
            <ul aria-label="Social media">
              <li>
                <a
                  target="_blank"
                  rel="noopener noreferrer"
                  className={cx('social-icon-link')}
                  aria-label={socialLabels.calPolyFacebook}
                  href="https://www.facebook.com/CalPoly/"
                >
                  <FaFacebookF
                    className={cx('social-icon')}
                    aria-hidden="true"
                    focusable="false"
                  />
                </a>
              </li>
              <li>
                <a
                  target="_blank"
                  rel="noopener noreferrer"
                  className={cx('social-icon-link')}
                  aria-label={socialLabels.calPolyInstagram}
                  href="https://www.instagram.com/calpoly/"
                >
                  <FaInstagram
                    className={cx('social-icon')}
                    aria-hidden="true"
                    focusable="false"
                  />
                </a>
              </li>
              <li>
                <a
                  target="_blank"
                  rel="noopener noreferrer"
                  className={cx('social-icon-link')}
                  aria-label={socialLabels.calPolyTwitter}
                  href="https://x.com/CalPoly"
                >
                  <FaXTwitter
                    className={cx('social-icon')}
                    aria-hidden="true"
                    focusable="false"
                  />
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* 🔥 These are your custom menus */}
        <div className={cx('nav-one')}>
          <NavigationMenu className={cx('nav')} menuItems={navOneMenuItems} />
        </div>

        <div className={cx('nav-two')}>
          <NavigationMenu className={cx('nav')} menuItems={navTwoMenuItems} />
        </div>

      <div className={cx('copyright')}>
          &copy; {new Date().getFullYear()} {siteTitle ?? 'Cal Poly Partners'}
        </div>
      </div>
    </footer>
  );
}
