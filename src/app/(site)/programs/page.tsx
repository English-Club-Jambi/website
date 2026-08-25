import { ArrowRightIcon } from "@heroicons/react/24/outline";
import type { Metadata } from "next";
import Link from "next/link";

import { ProgramLedger } from "@/components/programs/program-ledger";
import styles from "@/components/programs/programs.module.css";
import { PageContainer } from "@/components/ui";
import { getPublicPageContent } from "@/lib/public-content";
import { getPublicPrograms } from "@/lib/programs";
import { absoluteUrl, siteConfig } from "@/lib/seo";

export async function generateMetadata(): Promise<Metadata> {
  const copy = await getPublicPageContent("programs");
  return {
    title: copy.metadataTitle,
    description: copy.metadataDescription,
    alternates: { canonical: "/programs" },
    openGraph: {
      title: copy.metadataTitle,
      description: copy.metadataDescription,
      url: absoluteUrl("/programs"),
      siteName: siteConfig.name,
      type: "website",
    },
  };
}

export default async function ProgramsPage() {
  const [copy, programs] = await Promise.all([
    getPublicPageContent("programs"),
    getPublicPrograms(),
  ]);

  return (
    <div className={styles.page}>
      <header className={styles.hero}>
        <PageContainer className={styles.heroInner}>
          <span className={styles.heroIndex} aria-hidden>
            06
          </span>
          <p className={styles.heroEyebrow}>{copy.heroEyebrow}</p>
          <h1>
            <span>{copy.heroTitleLineOne}</span>
            <span>{copy.heroTitleLineTwo}</span>
          </h1>
          <p className={styles.heroSupport}>{copy.heroSupport}</p>
        </PageContainer>
      </header>

      <PageContainer>
        <aside className={styles.bridge} aria-label={copy.bridgeLabel}>
          <strong>{copy.bridgeLabel}</strong>
          <p>{copy.bridgeBody}</p>
          <Link href="/activities">
            {copy.bridgeLink}
            <ArrowRightIcon aria-hidden width={18} height={18} />
          </Link>
        </aside>

        <ProgramLedger programs={programs} copy={copy} />

        <section className={styles.communityClose}>
          <p>{copy.recordNote}</p>
          <Link href="/contact?intent=partner">{copy.plannedLink}</Link>
        </section>
      </PageContainer>
    </div>
  );
}
