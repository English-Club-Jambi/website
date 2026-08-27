import type { Metadata } from "next";
import {
  ArrowRightIcon,
  ArrowUpRightIcon,
} from "@heroicons/react/24/outline";
import Link from "next/link";

import { DocumentaryImage } from "@/components/documentary-image";
import { ActivityRelay } from "@/components/play/activity-relay";
import { JournalRelay } from "@/components/play/journal-relay";
import { PromptMixer } from "@/components/play/prompt-mixer";
import { SentencePlayground } from "@/components/play/sentence-playground";
import { ProgrammeQuiz } from "@/components/practice/programme-quiz";
import { PageContainer, TextLink } from "@/components/ui";
import { buildProgrammeQuiz } from "@/content/assessment";
import { institution } from "@/content/institution";
import { media } from "@/content/media";
import { getActivityThemes } from "@/content/site-copy";
import { getPublishedPosts } from "@/lib/journal";
import { absoluteUrl, buildPageMetadata, siteConfig } from "@/lib/seo";
import { serializeJsonLd } from "@/lib/structured-data";

import { getPublicPageContent } from "@/lib/public-content";

export async function generateMetadata(): Promise<Metadata> {
  const copy = await getPublicPageContent("home");
  return buildPageMetadata({
    title: copy.metadataTitle,
    description: copy.metadataDescription,
    path: "/",
    absoluteTitle: true,
  });
}

export default async function HomePage() {
  const [copy, activitiesCopy, globalCopy, posts] = await Promise.all([
    getPublicPageContent("home"),
    getPublicPageContent("activities"),
    getPublicPageContent("global"),
    getPublishedPosts(3),
  ]);
  const programmeQuestions = buildProgrammeQuiz(
    getActivityThemes(activitiesCopy),
    {
      body: activitiesCopy.cautionBodyOne,
      linkLabel: activitiesCopy.cautionLink,
    },
    {
      speak: copy.programmeQuizSpeakPrompt,
      exchange: copy.programmeQuizExchangePrompt,
      make: copy.programmeQuizMakePrompt,
      schedule: copy.programmeQuizSchedulePrompt,
      scheduleYes: copy.programmeQuizScheduleYes,
      scheduleNo: copy.programmeQuizScheduleNo,
    },
  );
  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "WebSite",
      "@id": absoluteUrl("/#website"),
      name: globalCopy.siteName,
      url: absoluteUrl("/"),
      description: copy.metadataDescription,
      inLanguage: siteConfig.language,
      publisher: { "@id": absoluteUrl("/#organization") },
    },
    {
      "@context": "https://schema.org",
      "@type": "Organization",
      "@id": absoluteUrl("/#organization"),
      name: globalCopy.siteName,
      alternateName: institution.officialRecordName,
      url: absoluteUrl("/"),
      description: copy.metadataDescription,
      foundingDate: institution.formedOn,
      sameAs: [institution.officialClubUrl],
    },
  ];

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(jsonLd) }}
      />

      <SentencePlayground copy={copy} />
      <PromptMixer copy={copy} />

      <section className="home-activity-stage section-space" aria-labelledby="activities-title">
        <PageContainer>
          <header className="chapter-heading chapter-heading-activities">
            <div>
              <p>{copy.activitiesEyebrow}</p>
              <h2 id="activities-title">{copy.activitiesTitle}</h2>
            </div>
            <p>{copy.activitiesSupport}</p>
          </header>

          <ActivityRelay copy={activitiesCopy} />

          <div className="chapter-link">
            <TextLink href="/activities">{copy.activitiesLink}</TextLink>
          </div>
        </PageContainer>
      </section>

      <ProgrammeQuiz questions={programmeQuestions} copy={copy} />

      <section className="documentary-handoff section-space" aria-labelledby="handoff-title">
        <PageContainer className="documentary-handoff-grid">
          <div className="handoff-copy">
            <p className="handoff-line">
              <span className="visually-hidden">{copy.handoffSequenceLabel}</span>
              <span className="handoff-sequence" aria-hidden>
                <span>{copy.handoffAsk}</span>
                <ArrowRightIcon width={24} height={24} strokeWidth={2} />
                <span>{copy.handoffListen}</span>
                <ArrowRightIcon width={24} height={24} strokeWidth={2} />
                <span>{copy.handoffAnswer}</span>
              </span>
            </p>
            <h2 id="handoff-title">{copy.handoffTitle}</h2>
            <p>{copy.handoffBody}</p>
            <TextLink href="/about">{copy.handoffLink}</TextLink>
          </div>
          <DocumentaryImage
            media={media["activity-room-relay-v2"]}
            ratio="4 / 3"
            sizes="(max-width: 879px) 100vw, 43vw"
            className="handoff-image"
          />
        </PageContainer>
      </section>

      <section className="home-journal section-space" aria-labelledby="journal-title">
        <PageContainer>
          <header className="journal-chapter-heading">
            <h2 id="journal-title">{copy.journalTitle}</h2>
            <TextLink href="/journal">{copy.journalLink}</TextLink>
          </header>

          {posts.length > 0 ? (
            <JournalRelay posts={posts} />
          ) : (
            <p className="empty-copy">{copy.journalEmpty}</p>
          )}
        </PageContainer>
      </section>

      <section className="intent-close" aria-labelledby="intent-title">
        <PageContainer className="intent-close-frame">
          <h2 id="intent-title">{copy.closeTitle}</h2>
          <div className="intent-links">
            <Link href="/contact?intent=join">
              <span>{copy.closeJoin}</span>
              <ArrowUpRightIcon width={28} height={28} strokeWidth={2} aria-hidden />
            </Link>
            <Link href="/contact?intent=partner">
              <span>{copy.closePartner}</span>
              <ArrowUpRightIcon width={28} height={28} strokeWidth={2} aria-hidden />
            </Link>
            <Link href="/contact?intent=ask">
              <span>{copy.closeAsk}</span>
              <ArrowUpRightIcon width={28} height={28} strokeWidth={2} aria-hidden />
            </Link>
          </div>
        </PageContainer>
      </section>
    </>
  );
}
