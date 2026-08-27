import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { JournalArchive } from "@/components/journal/journal-archive";
import archiveStyles from "@/components/journal/journal-archive.module.css";
import { PageContainer } from "@/components/ui";
import { getPublishedPostsPage, parseJournalCursor } from "@/lib/journal";
import { getPublicPageContent } from "@/lib/public-content";
import { buildPageMetadata } from "@/lib/seo";

type JournalPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata({
  searchParams,
}: JournalPageProps): Promise<Metadata> {
  const [params, copy] = await Promise.all([
    searchParams,
    getPublicPageContent("journal"),
  ]);
  const cursor = parseJournalCursor(params.after);
  const journalMetadata = buildPageMetadata({
    title: copy.metadataTitle,
    description: copy.metadataDescription,
    path: "/journal",
  });
  return cursor.state === "cursor"
    ? {
        ...journalMetadata,
        robots: { index: false, follow: true },
      }
    : journalMetadata;
}

export default async function JournalPage({ searchParams }: JournalPageProps) {
  const cursor = parseJournalCursor((await searchParams).after);
  if (cursor.state === "invalid") {
    redirect("/journal#journal-archive");
  }

  const [page, copy] = await Promise.all([
    getPublishedPostsPage(
      cursor.state === "cursor" ? cursor.cursor : undefined,
    ),
    getPublicPageContent("journal"),
  ]);

  return (
    <>
      <header className={`route-stage journal-stage ${archiveStyles.journalStage}`}>
        <PageContainer
          className={`route-stage-frame journal-stage-frame ${archiveStyles.journalStageFrame}`}
        >
          <div className="route-stage-title">
            <p>{copy.heroEyebrow}</p>
            <h1>
              <span>{copy.heroTitleLineOne}</span>
              <span>{copy.heroTitleLineTwo}</span>
            </h1>
          </div>
          <p className="route-stage-support">{copy.heroSupport}</p>
        </PageContainer>
      </header>

      <JournalArchive
        page={page}
        isCursorPage={cursor.state === "cursor"}
        copy={copy}
      />
    </>
  );
}
