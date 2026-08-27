"use client";

import {
  ArrowTopRightOnSquareIcon,
  CheckIcon,
  ClipboardDocumentIcon,
  MapPinIcon,
} from "@heroicons/react/24/outline";
import { useState } from "react";

import type { PublicContentFor } from "@content/public-content";
import { headquarters } from "@/content/headquarters";

import styles from "./headquarters.module.css";

type CopyState = "idle" | "address" | "plus-code" | "failed";

export function Headquarters({
  copy,
}: {
  copy: PublicContentFor<"about">;
}) {
  const [copyState, setCopyState] = useState<CopyState>("idle");

  async function copyLocation(
    kind: Exclude<CopyState, "idle" | "failed">,
    value: string,
  ) {
    try {
      if (navigator.clipboard === undefined) {
        throw new Error("Clipboard API is unavailable.");
      }

      await navigator.clipboard.writeText(value);
      setCopyState(kind);
    } catch {
      setCopyState("failed");
    }
  }

  const statusMessage =
    copyState === "address"
      ? copy.headquartersAddressCopied
      : copyState === "plus-code"
        ? copy.headquartersPlusCodeCopied
        : copyState === "failed"
          ? copy.headquartersCopyFailed
          : "";

  return (
    <section
      className={`${styles.section} section-space`}
      aria-labelledby="headquarters-title"
    >
      <div className={`page-container ${styles.frame}`}>
        <header className={styles.intro}>
          <h2 id="headquarters-title">{copy.headquartersTitle}</h2>
          <p>{copy.headquartersIntro}</p>
          <a
            className={styles.mapLink}
            href={headquarters.mapUrl}
            target="_blank"
            rel="noreferrer"
            aria-label={`${copy.headquartersMapLink} (opens in a new tab)`}
          >
            <span>{copy.headquartersMapLink}</span>
            <ArrowTopRightOnSquareIcon aria-hidden width={20} height={20} />
          </a>
        </header>

        <div className={styles.locator}>
          <div className={styles.mapBlock}>
            <div className={styles.mapMeta}>
              <span>{copy.headquartersMapLabel}</span>
              <p id="headquarters-map-help">{copy.headquartersMapHelp}</p>
            </div>
            <div className={styles.mapViewport}>
              <iframe
                className={styles.mapFrame}
                src={headquarters.embedUrl}
                title={copy.headquartersMapTitle}
                aria-describedby="headquarters-map-help"
                loading="lazy"
                referrerPolicy="strict-origin-when-cross-origin"
              />
            </div>
          </div>

          <div className={styles.destination}>
            <MapPinIcon aria-hidden width={32} height={32} />
            <div>
              <span>{copy.headquartersLabel}</span>
              <strong>{copy.headquartersPlace}</strong>
            </div>
          </div>

          <address className={styles.address}>
            <div className={styles.addressRow}>
              <div>
                <span>{copy.headquartersAddressLabel}</span>
                <p id="headquarters-street-address">
                  {copy.headquartersAddress}
                </p>
              </div>
              <button
                type="button"
                className={styles.copyButton}
                aria-describedby="headquarters-copy-status"
                onClick={() =>
                  void copyLocation("address", copy.headquartersAddress)
                }
              >
                {copyState === "address" ? (
                  <CheckIcon aria-hidden width={18} height={18} />
                ) : (
                  <ClipboardDocumentIcon aria-hidden width={18} height={18} />
                )}
                <span>{copy.headquartersCopyAddress}</span>
              </button>
            </div>

            <div className={styles.addressRow}>
              <div>
                <span>{copy.headquartersPlusCodeLabel}</span>
                <p id="headquarters-plus-code">{copy.headquartersPlusCode}</p>
              </div>
              <button
                type="button"
                className={styles.copyButton}
                aria-describedby="headquarters-copy-status"
                onClick={() =>
                  void copyLocation("plus-code", copy.headquartersPlusCode)
                }
              >
                {copyState === "plus-code" ? (
                  <CheckIcon aria-hidden width={18} height={18} />
                ) : (
                  <ClipboardDocumentIcon aria-hidden width={18} height={18} />
                )}
                <span>{copy.headquartersCopyPlusCode}</span>
              </button>
            </div>
          </address>

          <p
            id="headquarters-copy-status"
            className={styles.status}
            aria-live="polite"
            aria-atomic="true"
          >
            {statusMessage}
          </p>
        </div>
      </div>
    </section>
  );
}
