import * as MENUS from 'constants/menus';

import { useQuery, gql } from '@apollo/client';
import styles from 'styles/pages/_Home.module.scss';
import {
  EntryHeader,
  Main,
  Heading,
  NavigationMenu,
  SEO,
  Header,
  Footer,
  Posts,
  Testimonials,
  HomepageCampusLife,
  HomepageIntro,
  HomepageNonprofit,
  HomepageTicker,
  HomepageAdvancing,
  HomepageAttainableHousing,
  HomepageEmpowering,
  HomepageFoodInsecurity,
} from 'components';
import { BlogInfoFragment } from 'fragments/GeneralSettings';
import { buildKeywordString, normalizeInternalLink } from 'utilities';

const postsPerPage = 4;

export default function Component() {
  const { data, loading } = useQuery(Component.query, {
    variables: Component.variables(),
  });
  if (loading) {
    return null;
  }

  const { title: siteTitle, description: siteDescription } =
    data?.generalSettings;
  const primaryMenu = data?.headerMenuItems?.nodes ?? [];
  const footerMenu = data?.footerMenuItems?.nodes ?? [];
  const homepagePosts = (data?.posts?.nodes ?? []).slice(0, postsPerPage);
  const homeDescription =
    'Cal Poly Partners supports conferences, events, dining, housing, staffing, and campus experiences with end-to-end planning and on-site coordination.';
  const homeKeywords = buildKeywordString({
    title: siteTitle,
    content: `${homeDescription} Explore event support, testimonials, nonprofit services, campus life programs, attainable housing initiatives, and recent news.`,
    seedKeywords: [
      'cal poly partners',
      'conference planning',
      'event planning',
      'campus events',
      'guest services',
    ],
  });
  const homeUrl = normalizeInternalLink('/', { absolute: true });

  const mainBanner = {
    sourceUrl: '/static/banner.jpeg',
    mediaDetails: { width: 1200, height: 600 },
    altText: 'Portfolio Banner',
  };
  return (
    <>
      <SEO
        title={siteTitle}
        description={homeDescription || siteDescription}
        keywords={homeKeywords}
        url={homeUrl}
      />

      <Header
        title={siteTitle}
        description={siteDescription}
        menuItems={primaryMenu}
      />

      <Main className={styles.home}>

        <EntryHeader image={mainBanner} />

        <div className="container">

          <HomepageIntro />

          <HomepageNonprofit />
          
        </div>  

          <HomepageTicker />

        <div className="container">

          <HomepageCampusLife />

          <HomepageAdvancing />

          <section className={styles.testimonials}>
            <Testimonials testimonials={data?.testimonials?.nodes} />
          </section>

          <HomepageAttainableHousing />

          <HomepageEmpowering />

          <HomepageFoodInsecurity />

          <section className={styles.posts}>
            <Heading className={styles.heading} level="h2">
              News
            </Heading>
            <Posts posts={homepagePosts} id="posts-list" titleLevel="h3" />
          </section>

        </div>

      </Main>

      <Footer
        title={siteTitle}
        menuItems={footerMenu}
        navOneMenuItems={data?.footerSecondaryMenuItems?.nodes ?? []}
        navTwoMenuItems={data?.footerTertiaryMenuItems?.nodes ?? []}
      />


    </>
  );
}

Component.variables = () => {
  return {
    headerLocation: MENUS.PRIMARY_LOCATION,
    footerLocation: MENUS.FOOTER_LOCATION,
    footerSecondaryLocation: MENUS.FOOTER_SECONDARY_LOCATION,
    footerTertiaryLocation: MENUS.FOOTER_TERTIARY_LOCATION,
    first: postsPerPage,
  };
};

Component.query = gql`
  ${BlogInfoFragment}
  ${NavigationMenu.fragments.entry}
  ${Posts.fragments.entry}
  ${Testimonials.fragments.entry}
  query GetPageData(
    $headerLocation: MenuLocationEnum
    $footerLocation: MenuLocationEnum
    $footerSecondaryLocation: MenuLocationEnum
    $footerTertiaryLocation: MenuLocationEnum
    $first: Int
  ) {
    posts(first: $first) {
      nodes {
        ...PostsItemFragment
      }
    }
    testimonials {
      nodes {
        ...TestimonialsFragment
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
