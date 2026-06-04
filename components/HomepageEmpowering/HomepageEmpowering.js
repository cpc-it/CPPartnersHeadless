import Image from 'next/image';
import Link from 'next/link';

import styles from './HomepageEmpowering.module.scss';

export default function HomepageEmpowering() {
  return (
    <div className={styles.cta}>
          <div className="wp-block-media-text has-media-on-the-left is-stacked-on-mobile white-image-left">
            <figure className="wp-block-media-text__media">
              <Image
                src="/home/young-professional-in-office-cubicle-smiling-portrait.jpg"
                width={980}
                height={630}
                alt="Young professional woman standing and smiling in an office cubicle workspace environment."
                sizes="(max-width: 768px) 100vw, 50vw"
                style={{ width: '100%', height: 'auto' }}
              />
            </figure>
            <div className="wp-block-media-text__content">
              <h2 className="wp-block-heading">Empowering Through Employment</h2>
              <p>Beyond our core services, we are also one of the largest employers in San Luis Obispo County. In the 2022-23 academic year, we employed over 3,100 students. As a Cal Poly Partners employee, students not only earn a paycheck but also gain invaluable life and career skills, positioning them for success beyond graduation.</p>
              <p>
                <Link legacyBehavior href="/careers/">
                  <a title="Work With Us">
                    Work With Us
                  </a>
                </Link>
              </p>
            </div>
          </div>
    </div>
  );
}
