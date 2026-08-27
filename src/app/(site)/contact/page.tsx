import type { Metadata } from "next";

import { ContactForm } from "@/components/contact-form";
import { PageContainer } from "@/components/ui";
import { parseContactIntent } from "@/lib/contact";
import { getPublicPageContent } from "@/lib/public-content";
import { buildPageMetadata } from "@/lib/seo";

export async function generateMetadata(): Promise<Metadata> {
  const copy = await getPublicPageContent("contact");
  return buildPageMetadata({
    title: copy.metadataTitle,
    description: copy.metadataDescription,
    path: "/contact",
  });
}

type ContactPageProps = {
  searchParams: Promise<{ intent?: string | string[] }>;
};

export default async function ContactPage({ searchParams }: ContactPageProps) {
  const [query, copy] = await Promise.all([
    searchParams,
    getPublicPageContent("contact"),
  ]);
  const initialIntent = parseContactIntent(query.intent);

  return (
    <>
      <header className="route-stage contact-stage">
        <PageContainer className="route-stage-frame contact-stage-frame">
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

      <section className="contact-section section-space" aria-labelledby="contact-form-title">
        <PageContainer className="contact-grid">
          <div className="contact-context">
            <h2 id="contact-form-title">{copy.formTitle}</h2>
            <p>{copy.formSupport}</p>
            <dl className="contact-notes">
              <div>
                <dt>{copy.nextTitle}</dt>
                <dd>{copy.nextBody}</dd>
              </div>
              <div>
                <dt>{copy.includeTitle}</dt>
                <dd>{copy.includeBody}</dd>
              </div>
            </dl>
          </div>
          <ContactForm initialIntent={initialIntent} copy={copy} />
        </PageContainer>
      </section>
    </>
  );
}
