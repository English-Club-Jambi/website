import type { Metadata } from "next";

import { DocumentaryImage } from "@/components/documentary-image";
import { Headquarters } from "@/components/headquarters";
import { InstitutionalRecord } from "@/components/institutional-record";
import { PageContainer, TextLink } from "@/components/ui";
import { headquarters } from "@/content/headquarters";
import { institution } from "@/content/institution";
import { media } from "@/content/media";
import { getPrinciples } from "@/content/site-copy";
import { getPublicPageContent } from "@/lib/public-content";
import { absoluteUrl, buildPageMetadata, siteConfig } from "@/lib/seo";
import { serializeJsonLd } from "@/lib/structured-data";

export async function generateMetadata(): Promise<Metadata> {
  const copy = await getPublicPageContent("about");
  return buildPageMetadata({
    title: copy.metadataTitle,
    description: copy.metadataDescription,
    path: "/about",
  });
}

export default async function AboutPage() {
  const copy = await getPublicPageContent("about");
  const principles = getPrinciples(copy);
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "AboutPage",
    "@id": absoluteUrl("/about#about-page"),
    url: absoluteUrl("/about"),
    name: copy.metadataTitle,
    description: copy.metadataDescription,
    inLanguage: siteConfig.language,
    mainEntity: {
      "@type": "Organization",
      "@id": absoluteUrl("/#organization"),
      name: siteConfig.name,
      alternateName: institution.officialRecordName,
      foundingDate: institution.formedOn,
      sameAs: [institution.officialClubUrl],
      subjectOf: {
        "@type": "Article",
        name: "English Club UPT Perpustakaan Resmi Dibentuk",
        url: institution.formationRecordUrl,
        publisher: {
          "@type": "Organization",
          name: institution.unitName,
          url: institution.libraryUrl,
          parentOrganization: {
            "@type": "CollegeOrUniversity",
            name: institution.universityName,
            url: "https://www.unja.ac.id/",
          },
        },
      },
      location: {
        "@type": "Place",
        name: copy.headquartersPlace,
        hasMap: headquarters.mapUrl,
        geo: {
          "@type": "GeoCoordinates",
          latitude: headquarters.latitude,
          longitude: headquarters.longitude,
        },
        address: {
          "@type": "PostalAddress",
          streetAddress: copy.headquartersAddress,
          addressLocality: "Mendalo Darat",
          addressRegion: "Jambi",
          postalCode: "36657",
          addressCountry: headquarters.countryCode,
        },
      },
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(jsonLd) }}
      />
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

      <InstitutionalRecord copy={copy} />

      <Headquarters copy={copy} />

      <section className="route-handoff">
        <PageContainer className="route-handoff-frame">
          <p>{copy.handoffBody}</p>
          <TextLink href="/activities">{copy.handoffLink}</TextLink>
        </PageContainer>
      </section>
    </>
  );
}
