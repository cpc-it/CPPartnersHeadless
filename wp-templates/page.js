import * as MENUS from 'constants/menus';

import { gql, useQuery } from '@apollo/client';
import appConfig from 'app.config';
import { BlogInfoFragment } from 'fragments/GeneralSettings';
import dynamic from 'next/dynamic';
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  buildKeywordString,
  buildMetaDescription,
  normalizeInternalLink,
  pageTitle,
} from 'utilities';

import {
  Header,
  Footer,
  Main,
  ContentWrapper,
  EntryHeader,
  NavigationMenu,
  FeaturedImage,
  SEO,
  Posts,
  LoadMore,
} from '../components';

// Client-only form to avoid SSR/client mismatch
const ContactForm = dynamic(() => import('components/ContactForm'), { ssr: false });

const TOKEN = '<!-- FORMSPREE_CONTACT -->';
const SLOT_HTML = '<div id="contact-form-slot"></div>';
const NEWS_PAGE_POST_COUNT = appConfig.postsPerPage;

// Portals the ContactForm into the placeholder div after mount.
function ContactFormIntoSlot() {
  const [slot, setSlot] = useState(null);
  useEffect(() => {
    setSlot(document.getElementById('contact-form-slot'));
  }, []);
  if (!slot) return null;
  return createPortal(<ContactForm />, slot);
}


export default function Component(props) {
  const pageData = props?.data?.page;
  const isNewsPage = pageData?.slug === 'news';
  const newsQuery = useQuery(Component.newsPostsQuery, {
    variables: {
      first: NEWS_PAGE_POST_COUNT,
      after: '',
    },
    skip: !isNewsPage,
    notifyOnNetworkStatusChange: true,
  });

  const { title: siteTitle, description: siteDescription } =
    props?.data?.generalSettings;
  const primaryMenu = props?.data?.headerMenuItems?.nodes ?? [];
  const footerMenu = props?.data?.footerMenuItems?.nodes ?? [];
  const { title, content, featuredImage, slug, seoControls, uri } = pageData ?? {};
  const noindex = !!seoControls?.disableIndexing;
  const description = buildMetaDescription({
    title,
    content,
    fallback: siteDescription,
  });
  const keywords = buildKeywordString({
    title,
    content,
    seedKeywords: ['cal poly partners', 'conference planning', 'event planning'],
  });
  const newsPostsConnection = newsQuery.data?.posts ?? props?.data?.posts;
  const recentPosts =
    newsPostsConnection?.edges?.map((edge) => edge?.node).filter(Boolean) ?? [];
  const pageUrl = normalizeInternalLink(uri || (slug ? `/${slug}/` : '/'), {
    absolute: true,
  });

  // Replace the marker with a stable placeholder DIV for SSR
  const htmlWithSlot = (content ?? '').split(TOKEN).join(SLOT_HTML);

  // Prevent unexpected scroll jumps on the news page when arriving via link.
  useEffect(() => {
    if (slug === 'news' && typeof window !== 'undefined' && !window.location.hash) {
      window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
    }
  }, [slug]);

  if (props.loading) return <>Loading...</>;

  return (
    <>
      <SEO
        title={pageTitle(props?.data?.generalSettings, title, siteTitle)}
        description={description}
        keywords={keywords}
        imageUrl={featuredImage?.node?.sourceUrl}
        url={pageUrl}
        noindex={noindex}
      />
      <Header
        title={siteTitle}
        description={siteDescription}
        menuItems={primaryMenu}
      />
      <Main className={`page page-${slug || 'unknown'}`}>
        <>
          <EntryHeader title={title} image={featuredImage?.node} />
          <div className="container">
            <ContentWrapper content={htmlWithSlot} />
            {/* After hydration, portal the interactive form into the slot */}
            <ContactFormIntoSlot />
            {slug === 'news' && (
              <div className="posts-listing-news-page">
                <Posts posts={recentPosts} />
                <LoadMore
                  className="text-center"
                  hasNextPage={newsPostsConnection?.pageInfo?.hasNextPage}
                  endCursor={newsPostsConnection?.pageInfo?.endCursor}
                  isLoading={newsQuery.loading}
                  fetchMore={newsQuery.fetchMore}
                />
              </div>
            )}
          </div>
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

Component.variables = ({ databaseId }, ctx) => {
  return {
    databaseId,
    headerLocation: MENUS.PRIMARY_LOCATION,
    footerLocation: MENUS.FOOTER_LOCATION,
    footerSecondaryLocation: MENUS.FOOTER_SECONDARY_LOCATION,
    footerTertiaryLocation: MENUS.FOOTER_TERTIARY_LOCATION,
    first: NEWS_PAGE_POST_COUNT,
    after: '',
    asPreview: ctx?.asPreview,
  };
};

Component.query = gql`
  ${BlogInfoFragment}
  ${NavigationMenu.fragments.entry}
  ${FeaturedImage.fragments.entry}
  ${Posts.fragments.entry}
  query GetPageData(
    $databaseId: ID!
    $headerLocation: MenuLocationEnum
    $footerLocation: MenuLocationEnum
    $footerSecondaryLocation: MenuLocationEnum
    $footerTertiaryLocation: MenuLocationEnum
    $first: Int!
    $after: String
    $asPreview: Boolean = false
  ) {
    page(id: $databaseId, idType: DATABASE_ID, asPreview: $asPreview) {
      databaseId
      title
      content
      slug
      uri
      seoControls {
        disableIndexing
      }
      ...FeaturedImageFragment
    }
    posts(first: $first, after: $after) {
      edges {
        node {
          ...PostsItemFragment
        }
      }
      pageInfo {
        hasNextPage
        hasPreviousPage
        startCursor
        endCursor
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

Component.newsPostsQuery = gql`
  ${Posts.fragments.entry}
  query GetNewsPagePosts($first: Int!, $after: String) {
    posts(first: $first, after: $after) {
      edges {
        node {
          ...PostsItemFragment
        }
      }
      pageInfo {
        hasNextPage
        hasPreviousPage
        startCursor
        endCursor
      }
    }
  }
`;
