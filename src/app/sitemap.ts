import type { MetadataRoute } from 'next'

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = 'https://milagates.com'
  const now = new Date()
  return [
    {
      url: `${baseUrl}/`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 1,
    },
    {
      url: `${baseUrl}/privacy-policy`,
      lastModified: now,
      changeFrequency: 'yearly',
      priority: 0.3,
    },
  ]
}


