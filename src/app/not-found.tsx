import { ButtonLink, PageContainer, TextLink } from "@/components/ui";

export default function NotFound() {
  return (
    <section className="not-found-page">
      <PageContainer className="not-found-inner">
        <p className="not-found-code" aria-hidden>
          404
        </p>
        <h1>This page left the room.</h1>
        <p>The address may have changed, or the story is not public.</p>
        <div className="not-found-actions">
          <ButtonLink href="/">Return home</ButtonLink>
          <TextLink href="/journal" className="text-link-on-dark">
            Browse the journal
          </TextLink>
        </div>
      </PageContainer>
    </section>
  );
}
