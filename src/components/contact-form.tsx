"use client";

import {
  CheckCircleIcon,
  PaperAirplaneIcon,
} from "@heroicons/react/24/outline";
import { useActionState, useEffect, useRef } from "react";
import type { PublicContentFor } from "@content/public-content";

import {
  submitContact,
} from "@/actions/contact";
import {
  emptyContactValues,
  type ContactIntent,
  type ContactState,
} from "@/lib/contact";

export function ContactForm({
  initialIntent,
  copy,
}: {
  initialIntent: ContactIntent;
  copy: PublicContentFor<"contact">;
}) {
  const intentOptions: Array<{ value: ContactIntent; label: string }> = [
    { value: "join", label: copy.intentJoin },
    { value: "partner", label: copy.intentPartner },
    { value: "ask", label: copy.intentAsk },
  ];
  const successRef = useRef<HTMLDivElement>(null);
  const startState: ContactState = {
    status: "idle",
    message: "",
    fieldErrors: {},
    values: { ...emptyContactValues, intent: initialIntent },
  };
  const [state, formAction, pending] = useActionState(submitContact, startState);

  useEffect(() => {
    if (state.status !== "error") {
      return;
    }

    const firstInvalid = document.querySelector<HTMLElement>(
      "#contact-form [aria-invalid='true']",
    );
    firstInvalid?.focus();
  }, [state.status, state.message]);

  useEffect(() => {
    if (state.status !== "success") {
      return;
    }

    successRef.current?.focus({ preventScroll: true });
    successRef.current?.scrollIntoView({ behavior: "instant", block: "start" });
  }, [state.status]);

  if (state.status === "success") {
    return (
      <div
        ref={successRef}
        className="contact-success"
        role="status"
        aria-live="polite"
        tabIndex={-1}
      >
        <p className="contact-success-mark">
          <CheckCircleIcon width={76} height={76} strokeWidth={1.5} aria-hidden />
          <span className="visually-hidden">{copy.successSentLabel}</span>
        </p>
        <h2>{copy.successTitle}</h2>
        <p>{state.message}</p>
        <p>{copy.successSupport}</p>
      </div>
    );
  }

  return (
    <form id="contact-form" className="contact-form" action={formAction}>
      <div className="form-field">
        <label htmlFor="name">{copy.nameLabel}</label>
        <input
          id="name"
          name="name"
          type="text"
          autoComplete="name"
          minLength={2}
          maxLength={80}
          required
          defaultValue={state.values.name}
          aria-invalid={Boolean(state.fieldErrors.name)}
          aria-describedby={state.fieldErrors.name ? "name-error" : undefined}
        />
        {state.fieldErrors.name ? (
          <p id="name-error" className="field-error">
            {state.fieldErrors.name}
          </p>
        ) : null}
      </div>

      <div className="form-field">
        <label htmlFor="email">{copy.emailLabel}</label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          maxLength={254}
          required
          defaultValue={state.values.email}
          aria-invalid={Boolean(state.fieldErrors.email)}
          aria-describedby={state.fieldErrors.email ? "email-error" : undefined}
        />
        {state.fieldErrors.email ? (
          <p id="email-error" className="field-error">
            {state.fieldErrors.email}
          </p>
        ) : null}
      </div>

      <fieldset
        className="intent-fieldset"
        aria-invalid={Boolean(state.fieldErrors.intent)}
        aria-describedby={state.fieldErrors.intent ? "intent-error" : undefined}
      >
        <legend>{copy.intentLegend}</legend>
        <div className="intent-options">
          {intentOptions.map((option) => (
            <label key={option.value} className="intent-option">
              <input
                type="radio"
                name="intent"
                value={option.value}
                defaultChecked={state.values.intent === option.value}
              />
              <span>{option.label}</span>
            </label>
          ))}
        </div>
        {state.fieldErrors.intent ? (
          <p id="intent-error" className="field-error">
            {state.fieldErrors.intent}
          </p>
        ) : null}
      </fieldset>

      <div className="form-field">
        <label htmlFor="message">{copy.messageLabel}</label>
        <textarea
          id="message"
          name="message"
          minLength={20}
          maxLength={2_000}
          required
          defaultValue={state.values.message}
          placeholder={copy.messagePlaceholder}
          aria-invalid={Boolean(state.fieldErrors.message)}
          aria-describedby={
            state.fieldErrors.message
              ? "message-help message-error"
              : "message-help"
          }
        />
        <p id="message-help" className="field-help">
          {copy.messageHelp}
        </p>
        {state.fieldErrors.message ? (
          <p id="message-error" className="field-error">
            {state.fieldErrors.message}
          </p>
        ) : null}
      </div>

      <div className="honeypot" aria-hidden="true">
        <label htmlFor="website">{copy.websiteLabel}</label>
        <input id="website" name="website" type="text" tabIndex={-1} autoComplete="off" />
      </div>

      <div className="consent-row">
        <input
          id="consent"
          name="consent"
          type="checkbox"
          defaultChecked={state.values.consent}
          required
          aria-invalid={Boolean(state.fieldErrors.consent)}
          aria-describedby={
            state.fieldErrors.consent
              ? "consent-help consent-error"
              : "consent-help"
          }
        />
        <div>
          <label htmlFor="consent">
            {copy.consentLabel}
          </label>
          <p id="consent-help" className="field-help" lang="id">
            {copy.consentHelp}
          </p>
          {state.fieldErrors.consent ? (
            <p id="consent-error" className="field-error">
              {state.fieldErrors.consent}
            </p>
          ) : null}
        </div>
      </div>

      {state.message ? (
        <p className="form-status" role="alert" aria-live="assertive">
          {state.message}
        </p>
      ) : null}

      <button className="submit-button" type="submit" disabled={pending}>
        <span>{pending ? copy.sendingLabel : copy.submitLabel}</span>
        <PaperAirplaneIcon width={20} height={20} strokeWidth={2} aria-hidden />
      </button>
    </form>
  );
}
