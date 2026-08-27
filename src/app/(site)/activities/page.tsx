import type { Metadata } from "next";

import { ActivityRelay } from "@/components/play/activity-relay";
import { PageContainer, TextLink } from "@/components/ui";
import { getPublicPageContent } from "@/lib/public-content";
import { buildPageMetadata } from "@/lib/seo";

export async function generateMetadata(): Promise<Metadata> {
  const copy = await getPublicPageContent("activities");
  return buildPageMetadata({
    title: copy.metadataTitle,
    description: copy.metadataDescription,
    path: "/activities",
  });
}

export default async function ActivitiesPage() {
  const copy = await getPublicPageContent("activities");

  return (
    <>
      <header className="route-stage activities-stage">
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

      <section className="activity-page-relay section-space" aria-labelledby="activity-relay-title">
        <PageContainer>
          <header className="activity-page-heading">
            <h2 id="activity-relay-title">{copy.relayTitle}</h2>
            <p>{copy.relaySupport}</p>
          </header>
          <ActivityRelay copy={copy} context="page" />
        </PageContainer>
      </section>

      <section className="activity-caution section-space" aria-labelledby="activity-caution-title">
        <PageContainer className="activity-caution-grid">
          <h2 id="activity-caution-title">{copy.cautionTitle}</h2>
          <div>
            <p>{copy.cautionBodyOne}</p>
            <p>{copy.cautionBodyTwo}</p>
            <TextLink href="/contact?intent=ask">{copy.cautionLink}</TextLink>
          </div>
        </PageContainer>
      </section>
    </>
  );
}
