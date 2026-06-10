import { gql } from '@apollo/client';
import Image from 'next/image';
import { useRouter } from 'next/router';

import styles from './FeaturedImage.module.scss';

export default function FeaturedImage({
  className,
  image,
  width,
  height,
  sizes,
  priority = false,
  quality,
  sourceSize = 'full',
  ...props
}) {
  const router = useRouter();
  const isHome = router.pathname === '/';

  let src;
  if (sourceSize === 'large' && image?.sourceUrlLarge) {
    src = image.sourceUrlLarge;
  } else if (image?.sourceUrl instanceof Function) {
    src = image.sourceUrl();
  } else {
    src = image?.sourceUrl;
  }

  const { altText = '' } = image || {};

  const resolvedWidth =
    width || image?.mediaDetails?.width || 1200;
  const resolvedHeight =
    height || image?.mediaDetails?.height || 800;

  const resolvedSizes =
    sizes ||
    (isHome
      ? '(max-width: 768px) 100vw, 1200px'
      : '(max-width: 768px) 100vw, 1200px');

  const combinedClassName = [
    styles['featured-image'],
    className,
    isHome ? styles['home-image'] : '',
  ]
    .filter(Boolean)
    .join(' ');

  return src && resolvedWidth && resolvedHeight ? (
    <figure className={combinedClassName}>
        <Image
          src={src}
          width={resolvedWidth}
          height={resolvedHeight}
          alt={altText}
          sizes={resolvedSizes}
          priority={priority}
          quality={quality ?? (isHome ? 80 : 60)}
          style={{ objectFit: 'cover', width: '100%', height: 'auto' }}
          {...props}
        />
    </figure>
  ) : null;
}

FeaturedImage.fragments = {
  entry: gql`
    fragment FeaturedImageFragment on NodeWithFeaturedImage {
      featuredImage {
        node {
          id
          sourceUrl
          sourceUrlLarge: sourceUrl(size: LARGE)
          altText
          caption
          mediaDetails {
            width
            height
          }
        }
      }
    }
  `,
};
