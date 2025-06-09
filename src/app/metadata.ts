import { Metadata } from 'next';

export const metadata: Metadata = {
  metadataBase: new URL('https://milarosegates.com'),
  title: {
    default: 'Mila Rose Gates',
    template: '%s | Mila Rose Gates'
  },
  description: 'Welcome to Mila Rose Gates\' website',
  openGraph: {
    title: 'Mila Rose Gates',
    description: 'Welcome to Mila Rose Gates\' website',
    url: 'https://milarosegates.com',
    siteName: 'Mila Rose Gates',
    locale: 'en_US',
    type: 'website',
  },
  robots: {
    index: true,
    follow: true,
  },
}; 