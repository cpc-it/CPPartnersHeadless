import Image from 'next/image';
import Link from 'next/link';

import styles from './HomepageCampusLife.module.scss';

export default function HomepageCampusLife() {
  return (
    <div className={styles.cta}>
      <div className="wp-block-media-text has-media-on-the-right is-stacked-on-mobile white-image-right">
        <div className="wp-block-media-text__content">
          <h2 className="wp-block-heading">Enhancing Campus Life</h2>
          <p>
            We take immense pride in our role as a vital contributor to campus life. From delicious dining options to affordable textbooks, cutting-edge technology to academic supplies, spirited gear to faculty and staff housing, Cal Poly Partners is here to enhance the Cal Poly experience. We’re more than just a service provider; we’re an integral part of the fabric that makes Cal Poly thrive.
          </p>
          <p>
            <Link legacyBehavior href="/commercial-services/">
              <a title="Commercial Services">Commercial Services</a>
            </Link>
          </p>
        </div>
        <figure className="wp-block-media-text__media">
          <Image
            src="/home/students-eating-outdoors-campus-mural-patio-area.webp"
            width={980}
            height={630}
            alt="Students sitting under umbrellas at outdoor tables near a colorful mural on a sunny campus patio."
            sizes="(max-width: 768px) 70vw, (max-width: 1200px) 50vw, 30vw"
            style={{ width: '100%', height: 'auto', objectFit: 'cover' }}
            quality={70}
          />
        </figure>
      </div>
    </div>
  );
}
