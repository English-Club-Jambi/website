"use client";

import {
  ArrowPathIcon,
  CheckCircleIcon,
  EnvelopeIcon,
  ExclamationCircleIcon,
  PaperAirplaneIcon,
  SwatchIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import type { Route } from "next";
import Link from "next/link";
import Script from "next/script";
import {
  useEffect,
  useId,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent,
} from "react";

import {
  certificateTemplates,
  defaultCertificateTemplateKey,
  getCertificateTemplate,
  type CertificateTemplate,
  type CertificateTemplateKey,
} from "@content/full-practice-delivery";
import styles from "./practice.module.css";

export type ResultEmailDeliveryInput = {
  recipientName: string;
  recipientEmail: string;
  certificateTemplate: CertificateTemplateKey;
  consent: true;
  consentVersion: 1;
  requestId: string;
  turnstileToken: string;
};

export type ResultEmailDeliveryFailureCode =
  | "provider_unavailable"
  | "delivery_uncertain"
  | "certificate_failed"
  | "certificate_name_invalid"
  | "rate_limited"
  | "ownership_unavailable"
  | "unknown";

export type ResultEmailDeliveryOutcome =
  | {
      status: "accepted";
      maskedEmail: string;
      reviewHref?: string;
      reviewExpiresAt: number;
    }
  | {
      status: "rejected";
      code: ResultEmailDeliveryFailureCode;
    };

export type ResultEmailDeliveryCopy = {
  title: string;
  support: string;
  nameLabel: string;
  nameHelp: string;
  emailLabel: string;
  emailHelp: string;
  designLabel: string;
  changeDesign: string;
  pickerTitle: string;
  pickerSupport: string;
  pickerLegend: string;
  closePicker: string;
  keepCurrentDesign: string;
  useDesign: string;
  defaultLabel: string;
  consent: string;
  privacyLead: string;
  privacyLink: string;
  retention: string;
  send: string;
  preparing: string;
  preparingStatus: string;
  nameError: string;
  emailError: string;
  consentError: string;
  validationSummary: string;
  acceptedTitle: string;
  acceptedBody: string;
  expiryLead: string;
  openReview: string;
  sendAnother: string;
  retry: string;
  providerError: string;
  uncertainTitle: string;
  uncertainBody: string;
  sendSeparateCopy: string;
  verificationLabel: string;
  verificationUnavailable: string;
  verificationFailed: string;
  verificationExpired: string;
  verificationRetry: string;
  revokeReview: string;
  revokedReview: string;
  revokeReviewError: string;
  certificateError: string;
  certificateNameError: string;
  rateLimitError: string;
  ownershipError: string;
  unknownError: string;
};

export type ResultEmailDeliveryProps = {
  onSend: (
    input: ResultEmailDeliveryInput,
  ) => Promise<ResultEmailDeliveryOutcome>;
  onRevokeReviewLinks?: () => Promise<number>;
  copy?: Partial<ResultEmailDeliveryCopy>;
  privacyHref?: string;
  initialCertificateName?: string;
  turnstileSiteKey?: string;
  disabled?: boolean;
};

const defaultCopy: ResultEmailDeliveryCopy = {
  title: "Keep a copy of this result.",
  support:
    "Email the score, section notes, a completion certificate, and a private link to the full review.",
  nameLabel: "Name on certificate",
  nameHelp:
    "Use the spelling you want printed in the PDF. English Club does not verify identity for this completion record.",
  emailLabel: "Email address",
  emailHelp: "We will use this address only to deliver this practice record.",
  designLabel: "Certificate design",
  changeDesign: "Choose another design",
  pickerTitle: "Choose a certificate design",
  pickerSupport:
    "The wording and result stay the same. Only the layout changes.",
  pickerLegend: "Certificate layouts",
  closePicker: "Close certificate chooser",
  keepCurrentDesign: "Keep current design",
  useDesign: "Use this design",
  defaultLabel: "Default",
  consent:
    "I agree that English Club may use this name and email address to prepare and send this practice record.",
  privacyLead: "Read how this delivery is handled in our",
  privacyLink: "Privacy notice",
  retention:
    "The private review link expires after 30 days. English Club does not store the name or email address in its delivery log. Brevo processes the email under its own retention terms.",
  send: "Email my result",
  preparing: "Preparing email",
  preparingStatus: "Preparing your certificate and email.",
  nameError: "Enter the name to print on the certificate.",
  emailError: "Enter a valid email address.",
  consentError: "Confirm that we may use these details for this delivery.",
  validationSummary: "Check the marked delivery details.",
  acceptedTitle: "Your email is on its way.",
  acceptedBody:
    "Brevo accepted the message for {email}. It may take a few minutes to arrive.",
  expiryLead: "The private review link expires on",
  openReview: "Open review here",
  sendAnother: "Send another copy",
  retry: "Try again",
  providerError:
    "We could not confirm delivery. Check your inbox before trying again. Your result is still here.",
  uncertainTitle: "Delivery status is unclear.",
  uncertainBody:
    "Brevo may already have accepted this message. We will not resend it automatically. Check your inbox and spam folder first.",
  sendSeparateCopy: "Prepare a separate copy",
  verificationLabel: "Human verification",
  verificationUnavailable:
    "Email delivery is not configured for this site yet.",
  verificationFailed:
    "Cloudflare could not complete this check (code {code}). Retry it. If it fails again, disable privacy extensions or a VPN, or use another network.",
  verificationExpired:
    "The verification expired. Complete it again before sending.",
  verificationRetry: "Retry verification",
  revokeReview: "Revoke private review link",
  revokedReview: "The emailed review link has been revoked.",
  revokeReviewError:
    "The review link could not be revoked just now. It remains active until you try again or it expires.",
  certificateError:
    "The certificate could not be prepared, so no email was sent.",
  certificateNameError:
    "That name cannot fit this certificate yet. Shorten it or use Latin letters and common diacritics.",
  rateLimitError:
    "This result was emailed recently. Wait a few minutes before sending another copy.",
  ownershipError: "This result is no longer available from this session.",
  unknownError: "We could not prepare this email. Try again in a moment.",
};

type FieldErrors = {
  name?: string;
  email?: string;
  consent?: string;
};

type DeliveryState =
  | { kind: "idle" }
  | { kind: "pending" }
  | { kind: "error"; code: ResultEmailDeliveryFailureCode }
  | { kind: "uncertain" }
  | {
      kind: "accepted";
      maskedEmail: string;
      reviewHref: string;
      reviewExpiresAt: number;
    };

type TurnstileIssue =
  { kind: "failed"; code: string } | { kind: "expired" } | { kind: "script" };

type TurnstileApi = {
  render: (
    container: HTMLElement,
    options: {
      sitekey: string;
      action: string;
      theme: "auto";
      size: "flexible";
      callback: (token: string) => void;
      "expired-callback": () => void;
      "error-callback": (errorCode: string) => boolean;
      retry: "never";
    },
  ) => string;
  reset: (widgetId: string) => void;
  remove: (widgetId: string) => void;
};

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

const patternCells = Array.from({ length: 12 }, (_, index) => index);

function templateByKey(key: CertificateTemplateKey) {
  return getCertificateTemplate(key);
}

function normalizeName(value: string) {
  return value.normalize("NFKC").trim().replace(/\s+/gu, " ");
}

function isValidName(value: string) {
  const normalized = normalizeName(value);
  const length = Array.from(normalized).length;
  return (
    length >= 2 && length <= 80 && !/[\u0000-\u001f\u007f]/u.test(normalized)
  );
}

function isValidEmail(value: string) {
  const normalized = value.trim();
  return (
    normalized.length <= 254 &&
    !/[\u0000-\u001f\u007f\s]/u.test(normalized) &&
    /^[^@]+@[^@]+\.[^@]+$/u.test(normalized)
  );
}

function newRequestId() {
  if (typeof globalThis.crypto?.randomUUID === "function") {
    return globalThis.crypto.randomUUID();
  }
  if (typeof globalThis.crypto?.getRandomValues === "function") {
    const values = globalThis.crypto.getRandomValues(new Uint32Array(4));
    return Array.from(values, (value) =>
      value.toString(16).padStart(8, "0"),
    ).join("");
  }
  return `delivery-${Date.now().toString(36)}`;
}

function formatExpiry(timestamp: number) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(timestamp));
}

function focusInView(element: HTMLElement | null) {
  if (!element) return;
  element.focus({ preventScroll: true });
  element.scrollIntoView?.({ block: "center", inline: "nearest" });
}

function errorMessage(
  code: ResultEmailDeliveryFailureCode,
  copy: ResultEmailDeliveryCopy,
) {
  switch (code) {
    case "provider_unavailable":
      return copy.providerError;
    case "delivery_uncertain":
      return copy.uncertainBody;
    case "certificate_failed":
      return copy.certificateError;
    case "certificate_name_invalid":
      return copy.certificateNameError;
    case "rate_limited":
      return copy.rateLimitError;
    case "ownership_unavailable":
      return copy.ownershipError;
    case "unknown":
      return copy.unknownError;
  }
}

function BatikCadence() {
  return (
    <span className={styles.certificatePattern} aria-hidden="true">
      {patternCells.map((cell) => (
        <span className={styles.certificatePatternCell} key={cell} />
      ))}
    </span>
  );
}

function CertificatePreview({ template }: { template: CertificateTemplate }) {
  return (
    <div
      className={styles.certificatePreview}
      data-template={template.key}
      role="img"
      aria-label={`${template.name} certificate preview. The issued certificate will use your name and completed practice result.`}
    >
      <div className={styles.certificatePreviewRail} aria-hidden="true">
        <span>English Club</span>
        <BatikCadence />
        <small>Completion date</small>
      </div>
      <div className={styles.certificatePreviewPage} aria-hidden="true">
        <div className={styles.certificatePreviewIssuer}>
          <strong>EC</strong>
          <span>English Club</span>
        </div>
        <p>Certificate of practice completion</p>
        <span>Practice record prepared for</span>
        <strong className={styles.certificatePreviewName}>Your name</strong>
        <span>completed English Club Full Practice</span>
        <div className={styles.certificatePreviewResult}>
          <small>English Club practice estimate</small>
          <strong>Not shown</strong>
        </div>
        <small className={styles.certificatePreviewLimit}>
          A completion record, not proof of English proficiency.
        </small>
        <BatikCadence />
      </div>
    </div>
  );
}

function CertificateDesignDialog({
  open,
  selected,
  copy,
  triggerRef,
  onApply,
  onClose,
}: {
  open: boolean;
  selected: CertificateTemplateKey;
  copy: ResultEmailDeliveryCopy;
  triggerRef: React.RefObject<HTMLButtonElement | null>;
  onApply: (template: CertificateTemplateKey) => void;
  onClose: () => void;
}) {
  const [draft, setDraft] = useState(selected);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const ignoreCloseEvent = useRef(false);
  const titleId = useId();
  const supportId = useId();

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog || !open) return;

    const previousBodyOverflow = document.body.style.overflow;
    const returnFocusTarget = triggerRef.current;
    document.body.style.overflow = "hidden";
    if (!dialog.open) {
      dialog.showModal();
    }
    queueMicrotask(() => {
      if (dialog.open) {
        dialog
          .querySelector<HTMLInputElement>("input:checked")
          ?.focus({ preventScroll: true });
      }
    });

    return () => {
      document.body.style.overflow = previousBodyOverflow;
      if (dialog.open) {
        ignoreCloseEvent.current = true;
        dialog.close();
      }
      returnFocusTarget?.focus({ preventScroll: true });
    };
  }, [open, triggerRef]);

  function containFocus(event: KeyboardEvent<HTMLDialogElement>) {
    if (event.key !== "Tab") return;
    const controls = Array.from(
      event.currentTarget.querySelectorAll<HTMLElement>(
        'input:not([disabled]), button:not([disabled]), [href], [tabindex]:not([tabindex="-1"])',
      ),
    );
    const first = controls[0];
    const last = controls.at(-1);
    if (!first || !last) {
      event.preventDefault();
      event.currentTarget.focus({ preventScroll: true });
    } else if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus({ preventScroll: true });
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus({ preventScroll: true });
    }
  }

  const draftTemplate = templateByKey(draft);

  return (
    <dialog
      ref={dialogRef}
      className={styles.certificateDialog}
      aria-labelledby={titleId}
      aria-describedby={supportId}
      aria-modal="true"
      tabIndex={-1}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClose={() => {
        if (ignoreCloseEvent.current) {
          ignoreCloseEvent.current = false;
          return;
        }
        if (open) onClose();
      }}
      onClick={(event) => {
        if (event.target === dialogRef.current) onClose();
      }}
      onKeyDown={containFocus}
    >
      <div className={styles.certificateDialogPanel}>
        <header className={styles.certificateDialogHeader}>
          <div>
            <h2 id={titleId}>{copy.pickerTitle}</h2>
            <p id={supportId}>{copy.pickerSupport}</p>
          </div>
          <button type="button" onClick={onClose} aria-label={copy.closePicker}>
            <XMarkIcon
              width={22}
              height={22}
              strokeWidth={1.8}
              aria-hidden="true"
            />
          </button>
        </header>

        <div className={styles.certificateDialogBody}>
          <div className={styles.certificateDialogPreview} key={draft}>
            <CertificatePreview template={draftTemplate} />
            <p aria-live="polite">
              <strong>{draftTemplate.name}</strong>
              <span>{draftTemplate.description}</span>
            </p>
          </div>

          <fieldset className={styles.certificateOptions}>
            <legend>{copy.pickerLegend}</legend>
            {certificateTemplates.map((template) => (
              <label className={styles.certificateOption} key={template.key}>
                <input
                  type="radio"
                  name="certificate-template"
                  value={template.key}
                  checked={draft === template.key}
                  onChange={() => setDraft(template.key)}
                />
                <span
                  className={styles.certificateOptionMark}
                  data-template={template.key}
                  aria-hidden="true"
                >
                  <CheckCircleIcon width={21} height={21} strokeWidth={1.8} />
                </span>
                <span className={styles.certificateOptionCopy}>
                  <strong>
                    {template.name}
                    {template.isDefault ? (
                      <small>{copy.defaultLabel}</small>
                    ) : null}
                  </strong>
                  <span>{template.description}</span>
                </span>
              </label>
            ))}
          </fieldset>
        </div>

        <footer className={styles.certificateDialogActions}>
          <button
            type="button"
            className={styles.quietButton}
            onClick={onClose}
          >
            {copy.keepCurrentDesign}
          </button>
          <button
            type="button"
            className={styles.primaryButton}
            onClick={() => onApply(draft)}
          >
            <CheckCircleIcon
              width={20}
              height={20}
              strokeWidth={1.9}
              aria-hidden="true"
            />
            {copy.useDesign}
          </button>
        </footer>
      </div>
    </dialog>
  );
}

export function ResultEmailDelivery({
  onSend,
  onRevokeReviewLinks,
  copy: copyOverrides,
  privacyHref = "/privacy",
  initialCertificateName = "",
  turnstileSiteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY,
  disabled = false,
}: ResultEmailDeliveryProps) {
  const copy = { ...defaultCopy, ...copyOverrides };
  const [certificateName, setCertificateName] = useState(
    initialCertificateName,
  );
  const [email, setEmail] = useState("");
  const [consent, setConsent] = useState(false);
  const [selectedTemplate, setSelectedTemplate] =
    useState<CertificateTemplateKey>(defaultCertificateTemplateKey);
  const [chooserOpen, setChooserOpen] = useState(false);
  const [selectionAnnouncement, setSelectionAnnouncement] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [validationAttempted, setValidationAttempted] = useState(false);
  const [delivery, setDelivery] = useState<DeliveryState>({ kind: "idle" });
  const [turnstileScriptReady, setTurnstileScriptReady] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState("");
  const [turnstileIssue, setTurnstileIssue] = useState<TurnstileIssue | null>(
    null,
  );
  const [reviewRevoked, setReviewRevoked] = useState(false);
  const [revokeError, setRevokeError] = useState(false);
  const [revoking, setRevoking] = useState(false);
  const requestIdRef = useRef("");
  const turnstileHostRef = useRef<HTMLDivElement>(null);
  const turnstileWidgetRef = useRef<string | null>(null);
  const nameRef = useRef<HTMLInputElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);
  const consentRef = useRef<HTMLInputElement>(null);
  const chooserTriggerRef = useRef<HTMLButtonElement>(null);
  const acceptedHeadingRef = useRef<HTMLHeadingElement>(null);
  const titleId = useId();
  const nameInputId = useId();
  const nameHelpId = useId();
  const nameErrorId = useId();
  const emailInputId = useId();
  const emailHelpId = useId();
  const emailErrorId = useId();
  const consentErrorId = useId();

  const pending = delivery.kind === "pending";
  const controlsDisabled = disabled || pending;
  const selected = templateByKey(selectedTemplate);

  useEffect(() => {
    if (!window.turnstile) return;
    queueMicrotask(() => setTurnstileScriptReady(true));
  }, []);

  useEffect(() => {
    const host = turnstileHostRef.current;
    const turnstile = window.turnstile;
    if (
      !turnstileSiteKey ||
      (delivery.kind !== "idle" && delivery.kind !== "error") ||
      !turnstileScriptReady ||
      !host ||
      !turnstile ||
      turnstileWidgetRef.current !== null
    ) {
      return;
    }
    const widgetId = turnstile.render(host, {
      sitekey: turnstileSiteKey,
      action: "full-practice-result-email",
      theme: "auto",
      size: "flexible",
      retry: "never",
      callback: (token) => {
        setTurnstileIssue(null);
        setTurnstileToken(token);
      },
      "expired-callback": () => {
        setTurnstileToken("");
        setTurnstileIssue({ kind: "expired" });
      },
      "error-callback": (errorCode) => {
        setTurnstileToken("");
        setTurnstileIssue({ kind: "failed", code: errorCode });
        return true;
      },
    });
    turnstileWidgetRef.current = widgetId;
    return () => {
      turnstile.remove(widgetId);
      turnstileWidgetRef.current = null;
    };
  }, [delivery.kind, turnstileScriptReady, turnstileSiteKey]);

  useEffect(() => {
    if (delivery.kind === "accepted") {
      focusInView(acceptedHeadingRef.current);
    }
  }, [delivery.kind]);

  function resetDeliveryForEdit() {
    if (delivery.kind === "error") setDelivery({ kind: "idle" });
    requestIdRef.current = "";
  }

  function resetHumanVerification() {
    setTurnstileToken("");
    setTurnstileIssue(null);
    const widgetId = turnstileWidgetRef.current;
    if (widgetId !== null) window.turnstile?.reset(widgetId);
  }

  function validate() {
    const nextErrors: FieldErrors = {};
    if (!isValidName(certificateName)) nextErrors.name = copy.nameError;
    if (!isValidEmail(email)) nextErrors.email = copy.emailError;
    if (!consent) nextErrors.consent = copy.consentError;
    setFieldErrors(nextErrors);
    setValidationAttempted(true);

    if (nextErrors.name) focusInView(nameRef.current);
    else if (nextErrors.email) focusInView(emailRef.current);
    else if (nextErrors.consent) focusInView(consentRef.current);

    return Object.keys(nextErrors).length === 0;
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (controlsDisabled || !validate() || !turnstileToken) return;

    if (!requestIdRef.current) requestIdRef.current = newRequestId();
    setDelivery({ kind: "pending" });

    try {
      const outcome = await onSend({
        recipientName: normalizeName(certificateName),
        recipientEmail: email.trim(),
        certificateTemplate: selectedTemplate,
        consent: true,
        consentVersion: 1,
        requestId: requestIdRef.current,
        turnstileToken,
      });
      resetHumanVerification();

      if (outcome.status === "accepted") {
        setDelivery({
          kind: "accepted",
          maskedEmail: outcome.maskedEmail,
          reviewHref: outcome.reviewHref ?? "#answer-review-title",
          reviewExpiresAt: outcome.reviewExpiresAt,
        });
      } else {
        if (outcome.code === "delivery_uncertain") {
          setDelivery({ kind: "uncertain" });
          return;
        }
        if (
          outcome.code === "provider_unavailable" ||
          outcome.code === "certificate_failed" ||
          outcome.code === "certificate_name_invalid"
        ) {
          requestIdRef.current = "";
        }
        setDelivery({ kind: "error", code: outcome.code });
      }
    } catch {
      resetHumanVerification();
      setDelivery({ kind: "uncertain" });
    }
  }

  if (delivery.kind === "uncertain") {
    return (
      <section className={styles.deliverySection} aria-labelledby={titleId}>
        <div className={styles.deliveryUncertain}>
          <ExclamationCircleIcon
            width={30}
            height={30}
            strokeWidth={1.7}
            aria-hidden="true"
          />
          <div>
            <h2 id={titleId}>{copy.uncertainTitle}</h2>
            <p>{copy.uncertainBody}</p>
            <button
              type="button"
              className={styles.quietButton}
              onClick={() => {
                requestIdRef.current = "";
                setDelivery({ kind: "idle" });
              }}
            >
              <EnvelopeIcon
                width={20}
                height={20}
                strokeWidth={1.8}
                aria-hidden="true"
              />
              {copy.sendSeparateCopy}
            </button>
          </div>
        </div>
      </section>
    );
  }

  if (delivery.kind === "accepted") {
    return (
      <section className={styles.deliverySection} aria-labelledby={titleId}>
        <div className={styles.deliveryAccepted}>
          <CheckCircleIcon
            width={30}
            height={30}
            strokeWidth={1.7}
            aria-hidden="true"
          />
          <div>
            <h2 ref={acceptedHeadingRef} id={titleId} tabIndex={-1}>
              {copy.acceptedTitle}
            </h2>
            <p>{copy.acceptedBody.replace("{email}", delivery.maskedEmail)}</p>
            <p>
              {copy.expiryLead}{" "}
              <time dateTime={new Date(delivery.reviewExpiresAt).toISOString()}>
                {formatExpiry(delivery.reviewExpiresAt)}
              </time>
              .
            </p>
            <div className={styles.deliveryAcceptedActions}>
              <Link
                className={styles.primaryLink}
                href={delivery.reviewHref as Route}
              >
                {copy.openReview}
              </Link>
              <button
                type="button"
                className={styles.quietButton}
                onClick={() => {
                  setEmail("");
                  setConsent(false);
                  setFieldErrors({});
                  setValidationAttempted(false);
                  requestIdRef.current = "";
                  setReviewRevoked(false);
                  setRevokeError(false);
                  resetHumanVerification();
                  setDelivery({ kind: "idle" });
                }}
              >
                <EnvelopeIcon
                  width={20}
                  height={20}
                  strokeWidth={1.8}
                  aria-hidden="true"
                />
                {copy.sendAnother}
              </button>
              {onRevokeReviewLinks && !reviewRevoked ? (
                <button
                  type="button"
                  className={styles.quietButton}
                  disabled={revoking}
                  onClick={() => {
                    setRevoking(true);
                    setRevokeError(false);
                    void onRevokeReviewLinks()
                      .then(() => setReviewRevoked(true))
                      .catch(() => setRevokeError(true))
                      .finally(() => setRevoking(false));
                  }}
                >
                  {copy.revokeReview}
                </button>
              ) : null}
            </div>
            {reviewRevoked ? <p role="status">{copy.revokedReview}</p> : null}
            {revokeError ? (
              <p className={styles.deliveryError} role="alert">
                {copy.revokeReviewError}
              </p>
            ) : null}
          </div>
        </div>
      </section>
    );
  }

  return (
    <section
      className={styles.deliverySection}
      aria-labelledby={titleId}
      aria-busy={pending}
    >
      <div className={styles.deliveryIntro}>
        <EnvelopeIcon
          width={27}
          height={27}
          strokeWidth={1.65}
          aria-hidden="true"
        />
        <h2 id={titleId}>{copy.title}</h2>
        <p>{copy.support}</p>
      </div>

      <form
        className={styles.deliveryForm}
        noValidate
        onSubmit={(event) => void submit(event)}
      >
        {turnstileSiteKey ? (
          <Script
            src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"
            strategy="afterInteractive"
            onReady={() => {
              setTurnstileScriptReady(true);
              setTurnstileIssue((current) =>
                current?.kind === "script" ? null : current,
              );
            }}
            onError={() => {
              setTurnstileScriptReady(false);
              setTurnstileIssue({ kind: "script" });
            }}
          />
        ) : null}
        {validationAttempted && Object.keys(fieldErrors).length > 0 ? (
          <p className={styles.deliveryValidationSummary} role="alert">
            {copy.validationSummary}
          </p>
        ) : null}

        <div className={styles.deliveryFields}>
          <div className={styles.deliveryField}>
            <label htmlFor={nameInputId}>{copy.nameLabel}</label>
            <input
              id={nameInputId}
              ref={nameRef}
              type="text"
              autoComplete="name"
              value={certificateName}
              disabled={controlsDisabled}
              aria-invalid={fieldErrors.name ? "true" : undefined}
              aria-describedby={`${nameHelpId}${fieldErrors.name ? ` ${nameErrorId}` : ""}`}
              onChange={(event) => {
                setCertificateName(event.target.value);
                setFieldErrors((current) => ({ ...current, name: undefined }));
                resetDeliveryForEdit();
              }}
            />
            <small id={nameHelpId}>{copy.nameHelp}</small>
            {fieldErrors.name ? (
              <small id={nameErrorId} className={styles.deliveryFieldError}>
                {fieldErrors.name}
              </small>
            ) : null}
          </div>

          <div className={styles.deliveryField}>
            <label htmlFor={emailInputId}>{copy.emailLabel}</label>
            <input
              id={emailInputId}
              ref={emailRef}
              type="email"
              inputMode="email"
              autoComplete="email"
              spellCheck="false"
              value={email}
              disabled={controlsDisabled}
              aria-invalid={fieldErrors.email ? "true" : undefined}
              aria-describedby={`${emailHelpId}${fieldErrors.email ? ` ${emailErrorId}` : ""}`}
              onChange={(event) => {
                setEmail(event.target.value);
                setFieldErrors((current) => ({ ...current, email: undefined }));
                resetDeliveryForEdit();
              }}
            />
            <small id={emailHelpId}>{copy.emailHelp}</small>
            {fieldErrors.email ? (
              <small id={emailErrorId} className={styles.deliveryFieldError}>
                {fieldErrors.email}
              </small>
            ) : null}
          </div>
        </div>

        <div className={styles.deliveryDesignRow}>
          <SwatchIcon
            width={22}
            height={22}
            strokeWidth={1.75}
            aria-hidden="true"
          />
          <div>
            <span>{copy.designLabel}</span>
            <strong>{selected.name} is ready.</strong>
            <p>{selected.description}</p>
          </div>
          <button
            ref={chooserTriggerRef}
            type="button"
            className={styles.quietButton}
            disabled={controlsDisabled}
            aria-haspopup="dialog"
            onClick={() => setChooserOpen(true)}
          >
            {copy.changeDesign}
          </button>
        </div>

        <p className={styles.visuallyHidden} aria-live="polite">
          {selectionAnnouncement}
        </p>

        <label className={styles.deliveryConsent}>
          <input
            ref={consentRef}
            type="checkbox"
            checked={consent}
            disabled={controlsDisabled}
            aria-invalid={fieldErrors.consent ? "true" : undefined}
            aria-describedby={fieldErrors.consent ? consentErrorId : undefined}
            onChange={(event) => {
              setConsent(event.target.checked);
              setFieldErrors((current) => ({ ...current, consent: undefined }));
              resetDeliveryForEdit();
            }}
          />
          <span>{copy.consent}</span>
        </label>
        {fieldErrors.consent ? (
          <p id={consentErrorId} className={styles.deliveryFieldError}>
            {fieldErrors.consent}
          </p>
        ) : null}

        <div className={styles.deliveryVerification}>
          <span>{copy.verificationLabel}</span>
          {turnstileSiteKey ? (
            <div
              className={styles.deliveryVerificationWidget}
              ref={turnstileHostRef}
            />
          ) : (
            <p role="status">{copy.verificationUnavailable}</p>
          )}
          {turnstileIssue ? (
            <div className={styles.deliveryVerificationIssue}>
              <p role="alert">
                {turnstileIssue.kind === "failed"
                  ? copy.verificationFailed.replace(
                      "{code}",
                      turnstileIssue.code,
                    )
                  : turnstileIssue.kind === "expired"
                    ? copy.verificationExpired
                    : copy.verificationUnavailable}
              </p>
              {turnstileIssue.kind !== "script" ? (
                <button
                  type="button"
                  className={styles.quietButton}
                  onClick={resetHumanVerification}
                >
                  <ArrowPathIcon
                    width={20}
                    height={20}
                    strokeWidth={1.8}
                    aria-hidden="true"
                  />
                  {copy.verificationRetry}
                </button>
              ) : null}
            </div>
          ) : null}
        </div>

        <p className={styles.deliveryPrivacy}>
          {copy.privacyLead}{" "}
          <Link href={privacyHref as Route}>{copy.privacyLink}</Link>.{" "}
          {copy.retention}
        </p>

        {delivery.kind === "pending" ? (
          <p className={styles.deliveryStatus} role="status">
            {copy.preparingStatus}
          </p>
        ) : null}

        {delivery.kind === "error" ? (
          <p className={styles.deliveryError} role="alert">
            <ExclamationCircleIcon
              width={21}
              height={21}
              strokeWidth={1.8}
              aria-hidden="true"
            />
            {errorMessage(delivery.code, copy)}
          </p>
        ) : null}

        <button
          type="submit"
          className={`${styles.primaryButton} ${styles.deliverySubmit}`}
          disabled={controlsDisabled || !turnstileToken}
        >
          <PaperAirplaneIcon
            width={20}
            height={20}
            strokeWidth={1.85}
            aria-hidden="true"
          />
          {pending
            ? copy.preparing
            : delivery.kind === "error"
              ? copy.retry
              : copy.send}
        </button>
      </form>

      {chooserOpen ? (
        <CertificateDesignDialog
          open
          selected={selectedTemplate}
          copy={copy}
          triggerRef={chooserTriggerRef}
          onClose={() => setChooserOpen(false)}
          onApply={(template) => {
            setSelectedTemplate(template);
            const applied = templateByKey(template);
            setSelectionAnnouncement(`${applied.name} selected.`);
            resetDeliveryForEdit();
            setChooserOpen(false);
          }}
        />
      ) : null}
    </section>
  );
}
