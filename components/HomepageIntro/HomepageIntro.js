import Image from 'next/image';
import Link from 'next/link';

import styles from './HomepageIntro.module.scss';

export default function HomepageIntro() {
  return (
    <div className={styles.homeIntroWrapper}>
    <section className={`bg-green ${styles.homeIntro}`}>
      <div>
        <div className={styles.box}>
          <div className={styles.heading}>
            <h2>
              As the university&apos;s nonprofit auxiliary, Cal Poly Partners&apos; purpose is
              crystal clear: to propel Cal Poly forward.
            </h2>
          </div>

          <div className={styles.content}>
            <p>
              Cal Poly Partners is a mission-driven organization built on the belief of
              positive doing to elevate education, empower individuals and enhance the
              university experience.
            </p>
            <p>
              Through our flexible approach and an unyielding spirit, we break boundaries
              to provide essential university resources and services. Our unwavering
              commitment to these principles is what sets us apart.
            </p>
            <p>
              At Cal Poly Partners, we don&apos;t just provide services; we forge partnerships
              that shape the future. Join us in building a brighter tomorrow for Cal Poly
              and its community. Together, we can accomplish more than we ever imagined.
            </p>
            <p>
              <Link legacyBehavior href="/news/">
                <a title="News">News</a>
              </Link>
            </p>

          <Image
            src="/home/partnership-85.png"
            width={160}
            height={160}
            alt="Green circular text logo reading 85 years of partnership"
            className={styles.image}
            sizes="160px"
            style={{ width: '100%', height: 'auto' }}
          />

          </div>

        </div>
      </div>
    </section>
    </div>
  );
}
