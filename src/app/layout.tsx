import "./globals.css";
import "@/../public/scss/style.scss";
import { Cormorant_Upright } from 'next/font/google';
import Bootstrap from "@/components/Bootstrap/Bootstrap";
import { Suspense } from "react";
import Loading from "./loading";
import GoogleAnalytics from "@/components/Shared/Google/googleAnalytics";
import NavMenu from "@/components/Shared/TopNav/page";
import Footer from "@/components/Shared/Footer/Footer";
import { Analytics } from "@vercel/analytics/react"
import OpenAIChatBot from "@/components/Shared/Chatbot/OpenAIChatBot";
import { Metadata } from 'next';

const cormorantUpright = Cormorant_Upright({
  subsets: ['latin'], // Or other subsets as needed
  weight: ['400', '700'] // Include 400 for regular and other weights as needed
});

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

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <title>Mila Rose Gates</title>
        <link rel="canonical" href="https://milarosegates.com" />
      </head>
      <body className={cormorantUpright.className}> {/* Font applied to <body> */}
          <Bootstrap>
            <Suspense fallback={<Loading />}>
              <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
                <NavMenu />
                <div className="d-flex flex-column flex-grow-1">
                  {children}
                  <OpenAIChatBot />
                  <Analytics />
                </div>
                <Footer />
              </div>
            </Suspense>
          </Bootstrap>
          <GoogleAnalytics />
      </body>
    </html>
  );
}