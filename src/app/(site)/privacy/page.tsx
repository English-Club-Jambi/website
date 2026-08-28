import {
  ArrowTopRightOnSquareIcon,
  BuildingLibraryIcon,
  ClockIcon,
  CloudIcon,
  EnvelopeIcon,
  IdentificationIcon,
  ShieldCheckIcon,
} from "@heroicons/react/24/outline";
import type { Metadata } from "next";
import Link from "next/link";

import { PageContainer } from "@/components/ui";
import { institution } from "@/content/institution";
import { getPublicPageContent } from "@/lib/public-content";
import { absoluteUrl, buildPageMetadata, siteConfig } from "@/lib/seo";
import { serializeJsonLd } from "@/lib/structured-data";

import styles from "./privacy.module.css";

export async function generateMetadata(): Promise<Metadata> {
  const copy = await getPublicPageContent("privacy");
  return buildPageMetadata({
    title: copy.metadataTitle,
    description: copy.metadataDescription,
    path: "/privacy",
  });
}

export default async function PrivacyPage() {
  const copy = await getPublicPageContent("privacy");
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    "@id": absoluteUrl("/privacy#privacy-page"),
    url: absoluteUrl("/privacy"),
    name: copy.metadataTitle,
    description: copy.metadataDescription,
    inLanguage: siteConfig.language,
    dateModified: "2026-08-28",
    isPartOf: { "@id": absoluteUrl("/#website") },
    about: { "@id": absoluteUrl("/#organization") },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(jsonLd) }}
      />
      <header className="route-stage">
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

      <div className={styles.policy}>
        <PageContainer>
          <section className={styles.summary} aria-labelledby="privacy-summary-title">
            <p>{copy.summaryTitle}</p>
            <h2 id="privacy-summary-title">{copy.summaryBody}</h2>
            <dl>
              <div>
                <dt>{copy.operatorLabel}</dt>
                <dd>{copy.operatorBody}</dd>
              </div>
              <div>
                <dt>{copy.basisLabel}</dt>
                <dd>{copy.basisBody}</dd>
              </div>
              <div>
                <dt>{copy.lastReviewedLabel}</dt>
                <dd>
                  <time dateTime="2026-08-28">{copy.lastReviewedValue}</time>
                </dd>
              </div>
            </dl>
          </section>

          <div className={styles.ledger}>
            <section aria-labelledby="privacy-contact-title">
              <EnvelopeIcon aria-hidden width={26} height={26} />
              <div>
                <p>01 / Contact desk</p>
                <h2 id="privacy-contact-title">{copy.contactTitle}</h2>
                <p>{copy.contactBody}</p>
                <dl className={styles.retention}>
                  <div>
                    <ClockIcon aria-hidden width={20} height={20} />
                    <dt>{copy.contactRetentionLabel}</dt>
                    <dd>{copy.contactRetentionValue}</dd>
                  </div>
                </dl>
                <p>{copy.contactRetentionBody}</p>
              </div>
            </section>

            <section aria-labelledby="privacy-member-title">
              <IdentificationIcon aria-hidden width={26} height={26} />
              <div>
                <p>02 / Public directory</p>
                <h2 id="privacy-member-title">{copy.memberTitle}</h2>
                <p>{copy.memberBody}</p>
              </div>
            </section>

            <section aria-labelledby="privacy-practice-title">
              <ShieldCheckIcon aria-hidden width={26} height={26} />
              <div>
                <p>03 / Practice records</p>
                <h2 id="privacy-practice-title">{copy.practiceTitle}</h2>
                <p>{copy.practiceBody}</p>
                <h3>{copy.practiceDeliveryTitle}</h3>
                <p>{copy.practiceDeliveryBody}</p>
              </div>
            </section>

            <section aria-labelledby="privacy-media-title">
              <CloudIcon aria-hidden width={26} height={26} />
              <div>
                <p>04 / Browser and media</p>
                <h2 id="privacy-media-title">{copy.mediaTitle}</h2>
                <p>{copy.mediaBody}</p>
                <h3>{copy.providersTitle}</h3>
                <p>{copy.providersBody}</p>
              </div>
            </section>
          </div>

          <section className={styles.request} aria-labelledby="privacy-request-title">
            <div>
              <p>Correction and removal</p>
              <h2 id="privacy-request-title">{copy.requestTitle}</h2>
              <p>{copy.requestBody}</p>
              <Link href="/contact?intent=ask">
                <span>{copy.requestLink}</span>
                <ArrowTopRightOnSquareIcon aria-hidden width={20} height={20} />
              </Link>
            </div>
            <aside>
              <BuildingLibraryIcon aria-hidden width={30} height={30} />
              <h3>{copy.institutionalTitle}</h3>
              <p>{copy.institutionalBody}</p>
              <a href={`mailto:${institution.libraryEmail}`}>
                {institution.libraryEmail}
              </a>
              <a
                href={institution.libraryContactSourceUrl}
                target="_blank"
                rel="noreferrer"
              >
                Verify the institutional channels
                <ArrowTopRightOnSquareIcon aria-hidden width={17} height={17} />
              </a>
            </aside>
          </section>
        </PageContainer>
      </div>
    </>
  );
}
