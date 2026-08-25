import type { ReactNode } from "react";

import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { getPublicPageContent } from "@/lib/public-content";

export default async function PublicSiteLayout({ children }: { children: ReactNode }) {
  const copy = await getPublicPageContent("global");

  return (
    <>
      <a className="skip-link" href="#main-content">
        {copy.skipLink}
      </a>
      <SiteHeader copy={copy} />
      <main id="main-content" tabIndex={-1}>
        {children}
      </main>
      <SiteFooter copy={copy} />
    </>
  );
}
