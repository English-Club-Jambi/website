import type { Metadata } from "next";
import Image from "next/image";

import { MemberRelay } from "@/components/members/member-relay";
import { media } from "@/content/media";
import { getPublishedMembers } from "@/lib/members";
import { getPublicPageContent } from "@/lib/public-content";
import { buildPageMetadata } from "@/lib/seo";

import styles from "@/components/members/member-relay.module.css";

export async function generateMetadata(): Promise<Metadata> {
  const copy = await getPublicPageContent("members");
  return buildPageMetadata({
    title: copy.metadataTitle,
    description: copy.metadataDescription,
    path: "/members",
  });
}

export const dynamic = "force-dynamic";

export default async function MembersPage() {
  const [directory, copy] = await Promise.all([
    getPublishedMembers(),
    getPublicPageContent("members"),
  ]);
  const hero = media["member-relay-placeholder"];

  return (
    <>
      <header className={styles.memberHero}>
        <div className={styles.heroBackdrop} aria-hidden>
          <Image
            src={hero.src}
            alt=""
            fill
            sizes="100vw"
            priority
          />
        </div>
        <div className={`page-container ${styles.heroFrame}`}>
          <div className={styles.heroCopy}>
            <p>{copy.heroEyebrow}</p>
            <h1>
              <span>{copy.heroTitleLineOne}</span>
              <span>{copy.heroTitleLineTwo}</span>
            </h1>
          </div>
          <p className={styles.heroSupport}>{copy.heroSupport}</p>
        </div>
      </header>

      <MemberRelay directory={directory} copy={copy} />
    </>
  );
}
