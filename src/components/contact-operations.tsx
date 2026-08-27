import {
  ArrowTopRightOnSquareIcon,
  AtSymbolIcon,
  ChatBubbleLeftRightIcon,
  ClockIcon,
  PhoneIcon,
  ShieldCheckIcon,
} from "@heroicons/react/24/outline";
import Link from "next/link";
import type { PublicContentFor } from "@content/public-content";

import { institution } from "@/content/institution";

import { PageContainer } from "./ui";
import styles from "./contact-operations.module.css";

const institutionalChannels = [
  {
    href: `mailto:${institution.libraryEmail}`,
    label: institution.libraryEmail,
    support: "Institutional email",
    icon: AtSymbolIcon,
  },
  {
    href: institution.libraryPhoneHref,
    label: institution.libraryPhoneLabel,
    support: "Telephone",
    icon: PhoneIcon,
  },
  {
    href: institution.libraryInstagramUrl,
    label: institution.libraryInstagramLabel,
    support: "Instagram",
    icon: ChatBubbleLeftRightIcon,
  },
  {
    href: institution.libraryXUrl,
    label: institution.libraryXLabel,
    support: "X",
    icon: ChatBubbleLeftRightIcon,
  },
];

export function ContactOperations({
  copy,
}: {
  copy: PublicContentFor<"contact">;
}) {
  return (
    <section className={styles.section} aria-labelledby="contact-operations-title">
      <PageContainer className={styles.frame}>
        <div className={styles.intro}>
          <p>{copy.operationsEyebrow}</p>
          <h2 id="contact-operations-title">{copy.operationsTitle}</h2>
          <p>{copy.operationsBody}</p>
        </div>

        <div className={styles.commitments}>
          <div>
            <ClockIcon aria-hidden width={24} height={24} />
            <p>
              <span>{copy.operationsReviewLabel}</span>
              <strong>{copy.operationsReviewValue}</strong>
            </p>
          </div>
          <div>
            <ShieldCheckIcon aria-hidden width={24} height={24} />
            <p>
              <span>{copy.operationsRetentionLabel}</span>
              <strong>{copy.operationsRetentionValue}</strong>
            </p>
          </div>
          <Link href="/privacy">
            <span>{copy.operationsPrivacyLink}</span>
            <ArrowTopRightOnSquareIcon aria-hidden width={19} height={19} />
          </Link>
        </div>

        <div className={styles.channels}>
          <header>
            <h3>{copy.channelsTitle}</h3>
            <p>{copy.channelsBody}</p>
            <a
              href={institution.libraryContactSourceUrl}
              target="_blank"
              rel="noreferrer"
            >
              Verify on the library website
              <ArrowTopRightOnSquareIcon aria-hidden width={18} height={18} />
            </a>
          </header>
          <ul>
            {institutionalChannels.map((channel) => {
              const Icon = channel.icon;
              const external = channel.href.startsWith("http");
              return (
                <li key={channel.href}>
                  <a
                    href={channel.href}
                    {...(external
                      ? { target: "_blank", rel: "noreferrer" }
                      : {})}
                  >
                    <Icon aria-hidden width={21} height={21} />
                    <span>
                      <small>{channel.support}</small>
                      <strong>{channel.label}</strong>
                    </span>
                    <ArrowTopRightOnSquareIcon
                      className={styles.arrow}
                      aria-hidden
                      width={18}
                      height={18}
                    />
                  </a>
                </li>
              );
            })}
          </ul>
        </div>
      </PageContainer>
    </section>
  );
}
