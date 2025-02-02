"use client";
import "./globals.css";
import "@/../public/scss/style.scss";
import Bootstrap from "@/components/Bootstrap/Bootstrap";
import Provider from "@/components/Provider/Provider";
import { Suspense } from "react";
import Loading from "./loading";
import GoogleAnalytics from "@/components/Shared/Google/googleAnalytics";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning={true}>
      <head>
        <title>Mila Rose Gates</title>
      </head>
      <body>
        <Provider>
          <Bootstrap>
            <Suspense fallback={<Loading />}>
              <div>{children}</div>
            </Suspense>
          </Bootstrap>
          <GoogleAnalytics />
        </Provider>
      </body>
    </html>
  );
}
