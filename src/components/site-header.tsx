import Link from "next/link";
import Image from "next/image";
import type { PublicContentFor } from "@content/public-content";

import { PrimaryNavigation } from "./mobile-nav";
import { ThemeToggle } from "./play/theme-toggle";
import { PageContainer } from "./ui";

export function SiteHeader({ copy }: { copy: PublicContentFor<"global"> }) {
  return (
    <header className="site-header">
      <PageContainer className="header-inner">
        <Link href="/" className="wordmark" aria-label={copy.homeLabel}>
          <span className="wordmark-mark">
            <Image
              src="/brand/english-club-mark-placeholder.svg"
              alt=""
              width={38}
              height={38}
              priority
            />
          </span>
          <span>{copy.siteName}</span>
        </Link>
        <div className="header-actions">
          <ThemeToggle copy={copy} />
          <PrimaryNavigation copy={copy} />
        </div>
      </PageContainer>
    </header>
  );
}
