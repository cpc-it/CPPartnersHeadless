import { gql, useQuery } from '@apollo/client';
import appConfig from 'app.config';
import {
  buildKeywordString,
  buildMetaDescription,
  normalizeInternalLink,
  pageTitle,
} from 'utilities';

import * as MENUS from '../constants/menus';
import { BlogInfoFragment } from '../fragments/GeneralSettings';
import {
  Header,
  Footer,
  LoadMore,
  Main,
  EntryHeader,
  NavigationMenu,
  Posts,
  FeaturedImage,
  SEO,
} from '../components';

export default function Archive(props) {
  const { uri, name, __typename } = props.data.nodeByUri;
  const { data, loading, fetchMore } = useQuery(Archive.query, {
    variables: Archive.variables({ uri }),
  });

  if (loading) {
    return <></>;
  }

  const { title: siteTitle, description: siteDescription } =
    data?.generalSettings;
  const primaryMenu = data?.headerMenuItems?.nodes ?? [];
  const footerMenu = data?.footerMenuItems?.nodes ?? [];
  const postList = data.nodeByUri?.contentNodes?.edges.map((el) => el.node);
  const archiveTitle = `${__typename}: ${name}`;
  const archiveDescription = buildMetaDescription({
    title: archiveTitle,
    content: data?.nodeByUri?.description,
    fallback: `Browse ${name} content from ${siteTitle}.`,
  });
  const archiveKeywords = buildKeywordString({
    title: archiveTitle,
    content: data?.nodeByUri?.description,
    seedKeywords: [name, 'archive', 'cal poly partners', 'conference planning'],
  });
  const archiveUrl = normalizeInternalLink(uri || '/', { absolute: true });

  return (
    <>
      <SEO
        title={pageTitle(props?.data?.generalSettings, archiveTitle, siteTitle)}
        description={archiveDescription || siteDescription}
        keywords={archiveKeywords}
        url={archiveUrl}
        siteName={siteTitle}
        schemaType="CollectionPage"
      />
      <Header
        title={siteTitle}
        description={siteDescription}
        menuItems={primaryMenu}
      />
      <Main>
        <>
          <EntryHeader title={archiveTitle} />
          <div className="container">
            <Posts posts={postList} titleLevel="h2" />
            <LoadMore
              className="text-center"
              hasNextPage={data.nodeByUri?.contentNodes?.pageInfo.hasNextPage}
              endCursor={data.nodeByUri?.contentNodes?.pageInfo.endCursor}
              isLoading={loading}
              fetchMore={fetchMore}
            />
          </div>
        </>
      </Main>
      <Footer
        title={siteTitle}
        menuItems={footerMenu}
      />
    </>
  );
}

Archive.query = gql`
  ${BlogInfoFragment}
  ${NavigationMenu.fragments.entry}
  ${FeaturedImage.fragments.entry}
  query GetCategoryPage(
    $uri: String!
    $first: Int!
    $after: String!
    $headerLocation: MenuLocationEnum
    $footerLocation: MenuLocationEnum
  ) {
    nodeByUri(uri: $uri) {
      __typename
      id
      uri
      ... on ContentType {
        name
        description
        label
        contentNodes(first: $first, after: $after) {
          edges {
            node {
              id
              ... on NodeWithTitle {
                title
              }
              ... on NodeWithContentEditor {
                content
              }
              date
              uri
              ...FeaturedImageFragment
              ... on NodeWithAuthor {
                author {
                  node {
                    name
                  }
                }
              }
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
      ... on TermNode {
        name
        description
        ... on Category {
          contentNodes(first: $first, after: $after) {
            edges {
              node {
                id
                ... on NodeWithTitle {
                  title
                }
                ... on NodeWithContentEditor {
                  content
                }
                date
                uri
                ...FeaturedImageFragment
                ... on NodeWithAuthor {
                  author {
                    node {
                      name
                    }
                  }
                }
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
        ... on Tag {
          contentNodes(first: $first, after: $after) {
            edges {
              node {
                id
                ... on NodeWithTitle {
                  title
                }
                ... on NodeWithContentEditor {
                  content
                }
                date
                uri
                ...FeaturedImageFragment
                ... on NodeWithAuthor {
                  author {
                    node {
                      name
                    }
                  }
                }
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
  }
`;

Archive.variables = ({ uri }) => {
  return {
    uri,
    first: appConfig.postsPerPage,
    after: '',
    headerLocation: MENUS.PRIMARY_LOCATION,
    footerLocation: MENUS.FOOTER_LOCATION,
  };
};
