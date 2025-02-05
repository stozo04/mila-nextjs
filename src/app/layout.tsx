"use client";
import "./globals.css";
import "@/../public/scss/style.scss";
import { Cormorant_Upright, Dancing_Script } from 'next/font/google';
import Bootstrap from "@/components/Bootstrap/Bootstrap";
import { Suspense } from "react";
import Loading from "./loading";
import GoogleAnalytics from "@/components/Shared/Google/googleAnalytics";
import NavMenu from "@/components/Shared/TopNav/page";
import Footer from "@/components/Shared/Footer/Footer";

const cormorantUpright = Cormorant_Upright({
  subsets: ['latin'], // Or other subsets as needed
  weight: ['400', '700'] // Include 400 for regular and other weights as needed
});

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <title>Mila Rose Gates</title>
      </head>
      <body className={cormorantUpright.className}> {/* Font applied to <body> */}
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
      </body>
    </html>
  );
}