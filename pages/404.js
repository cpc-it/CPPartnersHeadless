// pages/search.js
import * as MENUS from 'constants/menus';

import { gql, useQuery } from '@apollo/client';
import { getNextStaticProps } from '@faustwp/core';
import {
  Button,
  Header,
  Main,
  Footer,
  NavigationMenu,
  SearchInput,
  SearchResults,
  SEO,
} from 'components';
import { BlogInfoFragment } from 'fragments/GeneralSettings';
import { useState } from 'react';
import { GetSearchResults } from 'queries/GetSearchResults';
import styles from 'styles/pages/_Search.module.scss';
import appConfig from 'app.config';
import { buildKeywordString, normalizeInternalLink } from 'utilities';

export default function Page() {
  const [searchQuery, setSearchQuery] = useState('');

  const { data: pageData, loading: pageLoading } = useQuery(Page.query, {
    variables: Page.variables(),
  });

  const {
    data: searchResultsData,
    loading: searchResultsLoading,
    error: searchResultsError,
    fetchMore: fetchMoreSearchResults,
  } = useQuery(GetSearchResults, {
    variables: {
      first: appConfig.postsPerPage,
      after: '',
      search: searchQuery,
    },
    skip: searchQuery === '',
    fetchPolicy: 'network-only',
  });

  if (pageLoading || !pageData) return null;

  const { title: siteTitle, description: siteDescription } =
    pageData?.generalSettings ?? {};

  const primaryMenu = pageData?.headerMenuItems?.nodes ?? [];
  const footerMenu = pageData?.footerMenuItems?.nodes ?? [];
  const navOneMenuItems = pageData?.footerSecondaryMenuItems?.nodes ?? [];

  // Prefer tertiary-by-location; fall back to tertiary-by-name if empty
  const quickLinksMenuItems =
    (pageData?.footerTertiaryMenuItems?.nodes?.length
      ? pageData.footerTertiaryMenuItems.nodes
      : pageData?.footerTertiaryByName?.menuItems?.nodes) ?? [];
  const description =
    'The page you requested could not be found. Search the site to find related Cal Poly Partners content.';
  const keywords = buildKeywordString({
    title: '404 page not found',
    content: description,
    seedKeywords: ['404', 'page not found', 'site search', 'cal poly partners'],
  });
  const pageUrl = normalizeInternalLink('/404/', { absolute: true });

  return (
    <>
      <SEO
        title={`404 - ${siteTitle || 'Page Not Found'}`}
        description={description}
        keywords={keywords}
        url={pageUrl}
        noindex
      />

      <Header
        title={siteTitle}
        description={siteDescription}
        menuItems={primaryMenu}
      />

      <Main>
        <div className={styles['search-header-pane']}>
          <div className="container small">

            <h1 style={{ color: '#fff', margin: '10rem 0 2rem 0!important', fontSize: '7rem!important;' }}>404: This page could not be found</h1>
            <p style={{ color: '#fff', margin: '2rem 0 2rem 0!important', fontSize: '3rem!important;' }}>You may find what you&apos;re looking for by searching below.</p>

            <h2 style={{ color: '#fff', margin: '5rem 0 1rem 0!important' }}>
              {searchQuery && !searchResultsLoading
                ? `Showing results for "${searchQuery}"`
                : `Search`}
            </h2>
            <SearchInput
              value={searchQuery}
              onChange={(newValue) => setSearchQuery(newValue)}
            />
          </div>
        </div>

        <div className="container small">
          {searchResultsError && (
            <div className="alert-error">
              An error has occurred. Please refresh and try again.
            </div>
          )}

          <SearchResults
            searchResults={searchResultsData?.contentNodes?.edges?.map(
              ({ node }) => node
            )}
            isLoading={searchResultsLoading}
          />

          {searchResultsData?.contentNodes?.pageInfo?.hasNextPage && (
            <div className={styles['load-more']}>
              <Button
                onClick={() => {
                  fetchMoreSearchResults({
                    variables: {
                      after:
                        searchResultsData?.contentNodes?.pageInfo?.endCursor,
                    },
                  });
                }}
              >
                Load more
              </Button>
            </div>
          )}
        </div>


      </Main>

      <Footer
        title={siteTitle}
        menuItems={footerMenu}
        navOneMenuItems={navOneMenuItems}
        quickLinksMenuItems={quickLinksMenuItems}
      />
    </>
  );
}

Page.variables = () => {
  return {
    headerLocation: MENUS.PRIMARY_LOCATION,
    footerLocation: MENUS.FOOTER_LOCATION,
    footerSecondaryLocation: MENUS.FOOTER_SECONDARY_LOCATION,
    footerTertiaryLocation: MENUS.FOOTER_TERTIARY_LOCATION,
    // Change ONLY if your Quick Links menu has a different name in WP Admin → Menus
    footerTertiaryMenuName: 'Quick Links',
  };
};

Page.query = gql`
  ${BlogInfoFragment}
  ${NavigationMenu.fragments.entry}
  query GetPageData(
    $headerLocation: MenuLocationEnum
    $footerLocation: MenuLocationEnum
    $footerSecondaryLocation: MenuLocationEnum
    $footerTertiaryLocation: MenuLocationEnum
    $footerTertiaryMenuName: ID!
  ) {
    generalSettings {
      ...BlogInfoFragment
    }

    headerMenuItems: menuItems(
      where: { location: $headerLocation }
      first: 100
    ) {
      nodes {
        ...NavigationMenuItemFragment
      }
    }

    footerMenuItems: menuItems(
      where: { location: $footerLocation }
      first: 100
    ) {
      nodes {
        ...NavigationMenuItemFragment
      }
    }

    footerSecondaryMenuItems: menuItems(
      where: { location: $footerSecondaryLocation }
      first: 100
    ) {
      nodes {
        ...NavigationMenuItemFragment
      }
    }

    # Tertiary by LOCATION (preferred)
    footerTertiaryMenuItems: menuItems(
      where: { location: $footerTertiaryLocation }
      first: 100
    ) {
      nodes {
        ...NavigationMenuItemFragment
      }
    }

    # Tertiary by NAME (failsafe if location isn’t wired/assigned)
    footerTertiaryByName: menu(id: $footerTertiaryMenuName, idType: NAME) {
      menuItems(first: 100) {
        nodes {
          ...NavigationMenuItemFragment
        }
      }
    }
  }
`;

export function getStaticProps(ctx) {
  return getNextStaticProps(ctx, { Page });
}
