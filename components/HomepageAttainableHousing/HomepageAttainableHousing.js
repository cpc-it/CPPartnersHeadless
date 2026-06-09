import Image from 'next/image';
import Link from 'next/link';

import styles from './HomepageAttainableHousing.module.scss';

export default function HomepageAttainableHousing() {
  return (
    <div className={styles.cta}>
      <div className="wp-block-media-text has-media-on-the-right is-stacked-on-mobile green-image-right">
        <div className="wp-block-media-text__content">
          <h2 className="wp-block-heading">Developing Attainable Housing</h2>
          <p>Working alongside the university, we are actively striving to meet the housing needs of Cal Poly faculty and staff. Cal Poly Partners is currently developing new neighborhoods on and near campus that will offer for sale and rental housing. This new housing will complement our established Bella Montana faculty and staff community.
          </p>
          <p>
            <Link legacyBehavior href="/real-estate-development/">
              <a title="Real Estate Development and Services" target="_blank">
                Real Estate Development and Services
              </a>
            </Link>
          </p>
        </div>
        <figure className="wp-block-media-text__media">
          <Image
            src="/home/affordable-housing-community-san-luis-obispo-mountain-view.webp"
            width={980}
            height={630}
            alt="Affordable housing development in San Luis Obispo with a scenic view of a mountain in the background."
            sizes="(max-width: 768px) 70vw, (max-width: 1200px) 50vw, 30vw"
            quality={70}
            style={{ width: '100%', height: 'auto', objectFit: 'cover' }}
          />
        </figure>
      </div>
    </div>
  );
}