import Image from 'next/image';

import styles from './HomepageFoodInsecurity.module.scss';

export default function HomepageFoodInsecurity() {
  return (
    <div className={styles.cta}>
          <div className="wp-block-media-text has-media-on-the-right is-stacked-on-mobile yellow-image-right">
            <div className="wp-block-media-text__content">
              <h2 className="wp-block-heading">Alleviating Food Insecurity</h2>
              <p>We partner closely with the university’s basic needs program to help alleviate food insecurity on campus. In the 2023-24 academic year, we aim to provide 50,000 meals to students in need. That’s a 4x increase over last year. This donation is in addition to our annual contribution to Cal Poly Athletics, ensuring that student-athletes have access to free or reduced meals.</p>
              <p>
                <a
                  href="https://donate.stripe.com/5kAbLtgBw6WH6Ag7st"
                  title="Donate Now"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Donate Now
                </a>
              </p>
            </div>
            <figure className="wp-block-media-text__media">
              <Image
                src="/home/glean-slo-volunteers-harvesting-oranges-food-rescue-program.jpg"
                width={980}
                height={630}
                alt="Group of GleanSLO volunteers standing in a citrus orchard behind bins filled with freshly harvested oranges, smiling and holding a banner for the food rescue program."
                style={{ width: '100%', height: 'auto' }}
              />
            </figure>
          </div>
    </div>
  );
}
