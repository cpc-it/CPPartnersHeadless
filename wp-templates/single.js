import * as MENUS from 'constants/menus';

import { gql } from '@apollo/client';
import {
  Header,
  Footer,
  Main,
  NavigationMenu,
  ContentWrapper,
  FeaturedImage,
  SEO,
  Posts,
} from 'components';
import Image from 'next/image';
import {
  buildBreadcrumbs,
  buildKeywordString,
  buildMetaDescription,
  normalizeInternalLink,
  pageTitle,
} from 'utilities';
import { BlogInfoFragment } from 'fragments/GeneralSettings';

export default function Component(props) {
  if (props.loading) {
    return <>Loading...</>;
  }

  const { title: siteTitle, description: siteDescription } =
    props?.data?.generalSettings;
  const primaryMenu = props?.data?.headerMenuItems?.nodes ?? [];
  const footerMenu = props?.data?.footerMenuItems?.nodes ?? [];

  // Destructure post, alias core WP author, and grab ACF group
  const {
    title,
    content,
    uri,
    featuredImage,
    date,
    author: wpAuthor,
    postsFields,
  } = props.data.post;

  const recentPosts = props?.data?.posts?.nodes ?? [];
  const description = buildMetaDescription({
    title,
    content,
    fallback: siteDescription,
  });
  const keywords = buildKeywordString({
    title,
    content,
    seedKeywords: [
      'news',
      'blog',
      'cal poly partners',
      'conference planning',
      'event planning',
    ],
  });
  const postUrl = normalizeInternalLink(uri || '/posts/', { absolute: true });
  const siteOrigin = new URL(postUrl).origin;
  const publishedAt = postsFields?.datePublished || date;
  const normalizedPublishedAt = Number.isNaN(Date.parse(publishedAt))
    ? undefined
    : new Date(publishedAt).toISOString();
  const articleAuthorName = postsFields?.author || wpAuthor?.node?.name || 'Cal Poly Partners';
  const breadcrumbs = buildBreadcrumbs({
    url: postUrl,
    title,
    trail: [{
      name: 'News',
      url: normalizeInternalLink('/news/', { absolute: true }),
    }],
  });
  const blogPostingSchema = {
    '@type': 'BlogPosting',
    '@id': `${postUrl.replace(/\/$/, '')}/#blogposting`,
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': `${postUrl.replace(/\/$/, '')}/#webpage`,
    },
    headline: title,
    description,
    image: featuredImage?.node?.sourceUrl,
    datePublished: normalizedPublishedAt,
    dateModified: normalizedPublishedAt,
    author: {
      '@type': 'Person',
      name: articleAuthorName,
      url: siteOrigin,
    },
    publisher: {
      '@type': 'Organization',
      '@id': `${siteOrigin}/#organization`,
      name: siteTitle,
      logo: {
        '@type': 'ImageObject',
        url: `${siteOrigin}/logo.png`,
      },
    },
  };

  // 🔹 Date formatter
  function formatDate(dateString) {
    const date = new Date(dateString);
    const day = date.getDate();
    const ordinal =
      day % 10 === 1 && day !== 11
        ? 'st'
        : day % 10 === 2 && day !== 12
        ? 'nd'
        : day % 10 === 3 && day !== 13
        ? 'rd'
        : 'th';

    return date
      .toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
      })
      .replace(/\d+/, `${day}${ordinal}`);
  }

  return (
    <>
      <SEO
        title={pageTitle(
          props?.data?.generalSettings,
          title,
          props?.data?.generalSettings?.title
        )}
        description={description}
        keywords={keywords}
        imageUrl={featuredImage?.node?.sourceUrl}
        url={postUrl}
        breadcrumbs={breadcrumbs}
        siteName={siteTitle}
        schemaType="WebPage"
        additionalSchemaEntities={blogPostingSchema}
      />
      <Header
        title={siteTitle}
        description={siteDescription}
        menuItems={primaryMenu}
      />
      <Main className="singleMain">
        <>
          <div className="container singleContainer twoCol">
            <article className="postArea">
              <h1 className="postTitle">{title}</h1>

              <div className="postAttribution">
                {/* External publication */}
                {postsFields?.publication && (
                  <p>
                    <em>Originally published in</em>{" "}
                    <strong>{postsFields.publication}</strong>
                  </p>
                )}

                <p>
                  {/* External author */}
                  {postsFields?.author && <>By {postsFields.author}</>}

                  {/* If publication exists but no custom author, fallback to WP author */}
                  {wpAuthor?.node?.name && !postsFields?.author && postsFields?.publication && (
                    <>By {wpAuthor.node.name}</>
                  )}

                  {/* Internal fallback — no external publication */}
                  {!postsFields?.publication && !postsFields?.author && (
                    <>By Cal Poly Partners</>
                  )}

                  {/* Date handling — prefer custom field, fallback to WP date */}
                  {/* Date handling — prefer custom field, fallback to WP date */}
                  {(postsFields?.datePublished || date) && (
                    <> • {formatDate(postsFields?.datePublished || date)}</>
                  )}

                </p>

                {/* Show source link only if external publication */}
                {postsFields?.link && postsFields?.publication && (
                  <p>
                    <a href={postsFields.link} target="_blank" rel="noopener noreferrer">
                      View Original Source
                    </a>
                  </p>
                )}
              </div>





              {featuredImage?.node?.sourceUrl && (
                <figure
                  className={`featuredImage${
                    featuredImage?.node?.caption ? ' hasCaption' : ''
                  }`}
                >
                  <Image
                    src={featuredImage.node.sourceUrl}
                    width={1200}
                    height={675}
                    alt={featuredImage.node.altText || title}
                    sizes="(max-width: 900px) 100vw, 840px"
                    style={{ width: '100%', height: 'auto' }}
                  />
                  {featuredImage?.node?.caption && (
                    <figcaption
                      className="featuredImage__caption"
                      dangerouslySetInnerHTML={{ __html: featuredImage.node.caption }}
                    />
                  )}
                </figure>
              )}


              <ContentWrapper content={content} />


            </article>

            <aside className="sidebar">
              <h2 className="sidebarHeading">Recent News</h2>
              <ul className="recent-posts">
                {recentPosts.map((post) => {
                  return (
                    <li key={post.id}>
                      <div className="post-meta">
                        {post.date && (
                          <time dateTime={post.date}>
                            {formatDate(post.date)}
                          </time>
                        )}
                        {/* Example if you want to surface ACF data in sidebar too */}
                        {post.postsFields?.publication && (
                          <span> · {post.postsFields.publication}</span>
                        )}
                      </div>
                      <a href={post.uri}>{post.title}</a>
                    </li>
                  );
                })}
              </ul>
            </aside>
          </div>
          {/*
          <section className={`${styles.posts} container`}>
            <h2 className={styles.heading}>Recent News</h2>
            <Posts posts={recentPosts} />
          </section>
          */}
        </>
      </Main>
      <Footer
        title={siteTitle}
        menuItems={footerMenu}
        navOneMenuItems={props?.data?.footerSecondaryMenuItems?.nodes ?? []}
        navTwoMenuItems={props?.data?.footerTertiaryMenuItems?.nodes ?? []}
      />
    </>
  );
}

Component.query = gql`
  ${BlogInfoFragment}
  ${NavigationMenu.fragments.entry}
  ${FeaturedImage.fragments.entry}
  ${Posts.fragments.entry}

  query GetPost(
    $databaseId: ID!
    $headerLocation: MenuLocationEnum
    $footerLocation: MenuLocationEnum
    $footerSecondaryLocation: MenuLocationEnum
    $footerTertiaryLocation: MenuLocationEnum
    $asPreview: Boolean = false
  ) {
    post(id: $databaseId, idType: DATABASE_ID, asPreview: $asPreview) {
      uri
      title
      content
      date
      author {
        node {
          name
        }
      }
      tags {
        edges {
          node {
            name
            uri
          }
        }
      }
      categories {
        edges {
          node {
            name
            uri
          }
        }
      }
      postsFields {
        publication
        datePublished
        author
        link
      }
      ...FeaturedImageFragment
    }

    posts(first: 8) {
      nodes {
        ...PostsItemFragment
        date
        excerpt
        uri
        id
        postsFields {
          publication
          datePublished
          author
          link
        }
      }
    }

    generalSettings {
      ...BlogInfoFragment
    }

    headerMenuItems: menuItems(where: { location: $headerLocation }, first: 100) {
      nodes {
        ...NavigationMenuItemFragment
      }
    }

    footerMenuItems: menuItems(where: { location: $footerLocation }) {
      nodes {
        ...NavigationMenuItemFragment
      }
    }

    footerSecondaryMenuItems: menuItems(where: { location: $footerSecondaryLocation }) {
      nodes {
        ...NavigationMenuItemFragment
      }
    }

    footerTertiaryMenuItems: menuItems(where: { location: $footerTertiaryLocation }) {
      nodes {
        ...NavigationMenuItemFragment
      }
    }
  }
`;

Component.variables = ({ databaseId }, ctx) => {
  return {
    databaseId,
    headerLocation: MENUS.PRIMARY_LOCATION,
    footerLocation: MENUS.FOOTER_LOCATION,
    footerSecondaryLocation: MENUS.FOOTER_SECONDARY_LOCATION,
    footerTertiaryLocation: MENUS.FOOTER_TERTIARY_LOCATION,
    asPreview: ctx?.asPreview,
  };
};
