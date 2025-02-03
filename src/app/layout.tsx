"use client";
import "./globals.css";
import "@/../public/scss/style.scss";
import { Dancing_Script } from 'next/font/google';
import Bootstrap from "@/components/Bootstrap/Bootstrap";
import Provider from "@/components/Provider/Provider";
import { Suspense } from "react";
import Loading from "./loading";
import GoogleAnalytics from "@/components/Shared/Google/googleAnalytics";
import NavMenu from "@/components/Shared/TopNav/page";
import Footer from "@/components/Shared/Footer/Footer";

const dancingScript = Dancing_Script({ 
  subsets: ['latin'],
  weight: ['400', '700'] 
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning={true} className={dancingScript.className}>
      <head>
        <title>Mila Rose Gates</title>
      </head>
      <body>
        <Provider>
          <Bootstrap>
            <Suspense fallback={<Loading />}>
            <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
                <NavMenu />
                <div className="d-flex flex-column flex-grow-1 overflow-hidden">

                {children}
                </div>
                <Footer />
              </div>
            </Suspense>
          </Bootstrap>
          <GoogleAnalytics />
        </Provider>
      </body>
    </html>
  );
}