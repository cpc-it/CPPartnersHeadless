import className from 'classnames/bind';
import Image from 'next/image';
import { FeaturedImage, Heading, PostInfo } from 'components';
import { useRouter } from 'next/router';

import styles from './EntryHeader.module.scss';
const cx = className.bind(styles);
/**
 * A Page or Post entry header component
 * @param {Props} props The props object.
 * @param {string} props.title The post/page title.
 * @param {MediaItem} props.image The image node.
 * @param {string} props.date The post/page publish date.
 * @param {string} props.author The post/page author's name.
 * @param {string} props.className An optional className to be added to the EntryHeader.
 * @return {React.ReactElement} The EntryHeader component.
 */
export default function EntryHeader({ title, image, date, author, className }) {
  const hasText = title || date || author;
  const { pathname } = useRouter(); // Get the current path
  const isHome = pathname === '/'; // Check if it's the home page
  return (
    <div className={cx(['entry-header', className])}>
      {image && (
        <div className={cx('image')}>
          {/* <div className="container"> */}
          {hasText && (
              <div className={cx('text')}>
                {!!title && <Heading className={cx('title', 'container')}>{title}</Heading>}
                <PostInfo className={cx('byline')} author={author} date={date} />
              </div>
            )}

          {isHome && (
            <Heading className={cx('heading-home')} level="h1">
              Shaping<br />Tomorrow,<br />Together
            </Heading>
          )}

          {isHome && (
            <Image
              src="/static/cpp-85-years.png"
              width={450}
              height={450}
              alt="Cal Poly Partners 85 years anniversary mark"
              className={cx('anniversary')}
            />
          )}

            <FeaturedImage
              className={cx('featured-image')}
              image={image}
              sourceSize="large"
              priority
            />
          {/* </div> */}
        </div>
      )}
    </div>
  );
}
