import type { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  const baseUrl = 'https://milagates.com'
  return {
    rules: [
      {
        userAgent: '*',
        disallow: [
          '/blogs',
          '/sonograms',
          '/baby-shower',
          '/gender-reveal',
          '/my-journey',
          '/login',
          '/api',
        ],
      },
    ],
    host: baseUrl.replace('https://', ''),
    sitemap: `${baseUrl}/sitemap.xml`,
  }
}


