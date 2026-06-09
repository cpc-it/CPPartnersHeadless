import * as MENUS from 'constants/menus';

import { gql } from '@apollo/client';
import {
  Header,
  EntryHeader,
  Footer,
  ProjectHeader,
  ContentWrapper,
  NavigationMenu,
  FeaturedImage,
  Main,
  SEO,
} from 'components';
import { BlogInfoFragment } from 'fragments/GeneralSettings';
import {
  buildBreadcrumbs,
  buildKeywordString,
  buildMetaDescription,
  normalizeInternalLink,
} from 'utilities';

export default function Component(props) {
  // Loading state for previews
  if (props.loading) {
    return <>Loading...</>;
  }
  const { title: siteTitle, description: siteDescription } =
    props?.data?.generalSettings;
  const primaryMenu = props?.data?.headerMenuItems?.nodes ?? [];
  const footerMenu = props?.data?.footerMenuItems?.nodes ?? [];
  const { featuredImage } = props.data.project;
  const { title, summary, contentArea } = props.data.project.projectFields;
  const description = buildMetaDescription({
    title,
    content: `${summary ?? ''} ${contentArea ?? ''}`,
    fallback: siteDescription,
  });
  const keywords = buildKeywordString({
    title,
    content: `${summary ?? ''} ${contentArea ?? ''}`,
    seedKeywords: [
      'project',
      'portfolio',
      'cal poly partners',
      'conference planning',
      'event planning',
    ],
  });
  const projectUrl = normalizeInternalLink(props?.data?.project?.uri || '/projects/', {
    absolute: true,
  });
  const breadcrumbs = buildBreadcrumbs({
    url: projectUrl,
    title,
    trail: [{
      name: 'Projects',
      url: normalizeInternalLink('/projects/', { absolute: true }),
    }],
  });
  return (
    <>
      <SEO
        title={`${title} - ${props?.data?.generalSettings?.title}`}
        description={description}
        keywords={keywords}
        imageUrl={featuredImage?.node?.sourceUrl}
        url={projectUrl}
        breadcrumbs={breadcrumbs}
        siteName={siteTitle}
        schemaType="WebPage"
      />

      <Header menuItems={primaryMenu} />

      <Main>
        <EntryHeader title={title} />
        <ProjectHeader
          image={featuredImage?.node}
          summary={summary}
          title={title}
        />
        <div className="container">
          <ContentWrapper content={contentArea} />
        </div>
      </Main>

      <Footer
        title={siteTitle}
        menuItems={footerMenu}
      />
    </>
  );
}

Component.query = gql`
  ${BlogInfoFragment}
  ${NavigationMenu.fragments.entry}
  ${FeaturedImage.fragments.entry}
  query GetPost(
    $databaseId: ID!
    $headerLocation: MenuLocationEnum
    $footerLocation: MenuLocationEnum
    $asPreview: Boolean = false
  ) {
    project(id: $databaseId, idType: DATABASE_ID, asPreview: $asPreview) {
      uri
      projectFields {
        title: projectTitle
        summary
        contentArea
      }
      ...FeaturedImageFragment
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

Component.variables = ({ databaseId }, ctx) => {
  return {
    databaseId,
    headerLocation: MENUS.PRIMARY_LOCATION,
    footerLocation: MENUS.FOOTER_LOCATION,
    asPreview: ctx?.asPreview,
  };
};
