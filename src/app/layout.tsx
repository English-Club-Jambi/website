import type { Metadata } from "next";
import { Bricolage_Grotesque } from "next/font/google";
import type { ReactNode } from "react";

import { getPublicThemeDelivery } from "@/lib/public-theme";
import { getSiteUrl, siteConfig } from "@/lib/seo";

import "./globals.css";

const bricolage = Bricolage_Grotesque({
  subsets: ["latin"],
  variable: "--font-bricolage",
  display: "swap",
});

const themeBootScript = `
  document.documentElement.dataset.js = "true";
  try {
    var storedTheme = window.localStorage.getItem("english-club-theme");
    var theme = storedTheme === "dark" ? "dark" : "light";
    document.documentElement.dataset.theme = theme;
    document.documentElement.style.colorScheme = theme;
  } catch (error) {
    document.documentElement.dataset.theme = "light";
    document.documentElement.style.colorScheme = "light";
  }
`;

export const metadata: Metadata = {
  metadataBase: getSiteUrl(),
  title: {
    default: "English Club | English grows in company",
    template: "%s | English Club",
  },
  description: siteConfig.shortDescription,
  applicationName: siteConfig.name,
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    siteName: siteConfig.name,
    title: "English Club | English grows in company",
    description: siteConfig.shortDescription,
    url: "/",
  },
  twitter: {
    card: "summary_large_image",
    title: "English Club | English grows in company",
    description: siteConfig.shortDescription,
  },
};

export default async function RootLayout({ children }: { children: ReactNode }) {
  const publicTheme = await getPublicThemeDelivery();

  return (
    <html
      lang="en"
      className={bricolage.variable}
      data-theme="light"
      data-site-theme="published"
      data-site-theme-revision={String(publicTheme.publicRevision)}
      data-scroll-behavior="smooth"
      suppressHydrationWarning
    >
      <head>
        <style
          id="public-theme-tokens"
          data-theme-name={publicTheme.name}
          data-theme-source={publicTheme.source}
          dangerouslySetInnerHTML={{ __html: publicTheme.css }}
        />
        <script dangerouslySetInnerHTML={{ __html: themeBootScript }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
