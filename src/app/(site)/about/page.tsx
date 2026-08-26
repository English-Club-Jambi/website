import type { Metadata } from "next";

import { DocumentaryImage } from "@/components/documentary-image";
import { PageContainer, TextLink } from "@/components/ui";
import { media } from "@/content/media";
import { getPrinciples } from "@/content/site-copy";
import { getPublicPageContent } from "@/lib/public-content";

export async function generateMetadata(): Promise<Metadata> {
  const copy = await getPublicPageContent("about");
  return {
    title: copy.metadataTitle,
    description: copy.metadataDescription,
    alternates: { canonical: "/about" },
  };
}

export default async function AboutPage() {
  const copy = await getPublicPageContent("about");
  const principles = getPrinciples(copy);

  return (
    <>
      <header className="route-stage about-stage">
        <PageContainer className="route-stage-frame">
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

      <section className="about-purpose section-space" aria-labelledby="about-purpose-title">
        <PageContainer className="about-purpose-grid">
          <h2 id="about-purpose-title">{copy.purposeTitle}</h2>
          <div className="about-purpose-copy">
            <p>{copy.purposeBodyOne}</p>
            <p>{copy.purposeBodyTwo}</p>
          </div>
        </PageContainer>
      </section>

      <section className="principle-relay section-space" aria-labelledby="principles-title">
        <PageContainer className="principle-relay-grid">
          <div className="principle-relay-intro">
            <h2 id="principles-title">{copy.principlesTitle}</h2>
            <p>{copy.principlesSupport}</p>
          </div>
          <div className="principle-relay-list">
            {principles.map((principle) => (
              <article key={principle.title} className="principle-relay-row">
                <h3>{principle.title}</h3>
                <p>{principle.body}</p>
              </article>
            ))}
          </div>
        </PageContainer>
      </section>

      <section className="evidence-boundary section-space" aria-labelledby="record-title">
        <PageContainer className="evidence-boundary-grid">
          <DocumentaryImage
            media={media["about-record-relay-v2"]}
            ratio="5 / 4"
            sizes="(max-width: 879px) 100vw, 40vw"
            className="evidence-boundary-image"
          />
          <div className="evidence-boundary-copy">
            <p className="evidence-word" aria-hidden>
              {copy.recordWord}
            </p>
            <h2 id="record-title">{copy.recordTitle}</h2>
            <p>{copy.recordBody}</p>
            <TextLink href="/journal">{copy.recordLink}</TextLink>
          </div>
        </PageContainer>
      </section>

      <section className="route-handoff">
        <PageContainer className="route-handoff-frame">
          <p>{copy.handoffBody}</p>
          <TextLink href="/activities">{copy.handoffLink}</TextLink>
        </PageContainer>
      </section>
    </>
  );
}
