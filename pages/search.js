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
import {
  buildKeywordString,
  buildMetaDescription,
  normalizeInternalLink,
} from 'utilities';

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
  const resultText = searchResultsData?.contentNodes?.edges
    ?.map(({ node }) => `${node?.title ?? ''} ${node?.excerpt ?? ''}`)
    .join(' ');
  const searchDescription = searchQuery
    ? buildMetaDescription({
        title: `Search results for ${searchQuery}`,
        content: resultText,
        fallback: `Search results for "${searchQuery}" across Cal Poly Partners content.`,
      })
    : 'Search Cal Poly Partners content, projects, resources, and news.';
  const searchKeywords = buildKeywordString({
    title: searchQuery ? `Search ${searchQuery}` : 'Search',
    content: `${searchDescription} ${searchQuery}`,
    seedKeywords: ['search', 'site search', 'cal poly partners'],
  });
  const searchUrl = normalizeInternalLink('/search/', { absolute: true });

  return (
    <>
      <SEO
        title={searchQuery ? `${searchQuery} Search - ${siteTitle}` : `Search - ${siteTitle}`}
        description={searchDescription || siteDescription}
        keywords={searchKeywords}
        url={searchUrl}
      />

      <Header
        title={siteTitle}
        description={siteDescription}
        menuItems={primaryMenu}
      />

      <Main>
        <div className={styles['search-header-pane']}>
          <div className="container small">
            <h1 className={styles['search-header-text']}>
              {searchQuery && !searchResultsLoading
                ? `Showing results for "${searchQuery}"`
                : `Search`}
            </h1>
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
            searchQuery={searchQuery}
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
