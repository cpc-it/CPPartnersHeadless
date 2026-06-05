const { withFaust, getWpHostname } = require('@faustwp/core');

module.exports = withFaust({
  reactStrictMode: true,
  sassOptions: {
    includePaths: ['node_modules'],
  },
  images: {
    domains: [
      getWpHostname(),
      'cms.calpolypartners.org',
    ],
    // Prefer modern formats where supported
    formats: ['image/avif', 'image/webp'],

    // Fine-tune the generated widths so Next doesn’t overshoot as much
    deviceSizes: [360, 480, 640, 768, 1024, 1280], // responsive layouts
    imageSizes: [160, 240, 320, 340, 420],         // fixed/card/avatar sizes

    // Long-lived cache for optimized images
    minimumCacheTTL: 60 * 60 * 24 * 365, // 1 year
  },
  i18n: {
    locales: ['en'],
    defaultLocale: 'en',
  },

  async redirects() {
    return [
      {
        source: '/news/:slug',
        destination: '/:slug',
        permanent: true,
      },
      {
        source: '/wp-content/uploads/2024/05/PTRS_logo_rev.png',
        destination:
          'https://cms.calpolypartners.org/wp-content/uploads/2023/08/logo_rev.png',
        permanent: true,
      },
      {
        source: '/wp-content/uploads/2023/08/logo_grn.png',
        destination:
          'https://cms.calpolypartners.org/wp-content/uploads/2025/10/logo_grn.png',
        permanent: true,
      },
      {
        source: '/mission-vision-and-values/annual-report-22-23',
        destination: '/mission-vision-values/annual-report',
        permanent: true,
      },
      {
        source: '/mission-vision-and-values/annual-report-23-24',
        destination: '/mission-vision-values/annual-report',
        permanent: true,
      },
    ];
  },

  async headers() {
    return [
      {
        source: '/_next/image',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        source: '/_next/static/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
    ];
  },
});
