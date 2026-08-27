import Link from "next/link";
import type { PublicContentFor } from "@content/public-content";

import { PageContainer } from "./ui";

export function SiteFooter({ copy }: { copy: PublicContentFor<"global"> }) {
  return (
    <footer className="site-footer">
      <PageContainer className="footer-grid">
        <div className="footer-statement">
          <p className="footer-wordmark">{copy.footerWordmark}</p>
          <p>{copy.footerStatement}</p>
          <Link className="footer-institution" href="/about#institution-title">
            {copy.footerInstitution}
          </Link>
        </div>
        <nav className="footer-nav" aria-label={copy.footerNavigationLabel}>
          <Link href="/about">{copy.navAbout}</Link>
          <Link href="/activities">{copy.navActivities}</Link>
          <Link href="/programs">{copy.navPrograms}</Link>
          <Link href="/members">{copy.navMembers}</Link>
          <Link href="/practice">{copy.navPractice}</Link>
          <Link href="/journal">{copy.navJournal}</Link>
          <Link href="/contact">{copy.footerContact}</Link>
          <Link href="/privacy">{copy.footerPrivacy}</Link>
        </nav>
        <div className="footer-intents">
          <Link href="/contact?intent=join">{copy.footerJoin}</Link>
          <Link href="/contact?intent=partner">{copy.footerPartner}</Link>
          <Link href="/contact?intent=ask">{copy.footerAsk}</Link>
        </div>
      </PageContainer>
    </footer>
  );
}
