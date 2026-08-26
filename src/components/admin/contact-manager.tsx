"use client";

import {
  EnvelopeIcon,
  InboxStackIcon,
  LinkIcon,
  QuestionMarkCircleIcon,
  UserPlusIcon,
} from "@heroicons/react/24/outline";
import type { FunctionReturnType } from "convex/server";
import { useMutation, usePaginatedQuery } from "convex/react";
import { useMemo, useRef, useState } from "react";

import { SelectField } from "@/components/forms/select-field";
import { api } from "../../../convex/_generated/api";

import {
  AdminEmpty,
  AdminError,
  AdminLoadingRows,
  AdminPageHeading,
  AdminSection,
  AdminStatus,
  LoadMoreButton,
  formatAdminDate,
  humanizeError,
} from "./admin-ui";
import styles from "./admin-shell.module.css";

type ContactRecord = FunctionReturnType<
  typeof api.adminSubmissions.listPage
>["page"][number];
type ContactIntent = ContactRecord["intent"];
type ContactStatus = ContactRecord["status"];
type IntentFilter = "all" | ContactIntent;
type StatusFilter = "all" | ContactStatus;

const intentDefinitions = [
  {
    value: "all",
    label: "All messages",
    description: "Every contact route",
    icon: InboxStackIcon,
  },
  {
    value: "join",
    label: "Join the club",
    description: "Membership requests",
    icon: UserPlusIcon,
  },
  {
    value: "partner",
    label: "Propose something together",
    description: "Collaboration proposals",
    icon: LinkIcon,
  },
  {
    value: "ask",
    label: "Ask a question",
    description: "Questions for the club",
    icon: QuestionMarkCircleIcon,
  },
] as const;

const statusOptions = [
  { value: "all", label: "All statuses" },
  { value: "new", label: "Needs review" },
  { value: "reviewing", label: "In progress" },
  { value: "replied", label: "Reply sent" },
  { value: "closed", label: "Complete" },
  { value: "spam", label: "Spam" },
] as const;

const workingStatusOptions = statusOptions.slice(1);

const intentLabels: Record<ContactIntent, string> = {
  join: "Join the club",
  partner: "Propose something together",
  ask: "Ask a question",
};

const statusLabels: Record<ContactStatus, string> = {
  new: "Needs review",
  reviewing: "In progress",
  replied: "Reply sent",
  closed: "Complete",
  spam: "Spam",
};

function statusTone(status: ContactStatus) {
  if (status === "closed" || status === "replied") return "success" as const;
  if (status === "reviewing") return "warning" as const;
  if (status === "spam") return "danger" as const;
  return "neutral" as const;
}

function mailtoRecipient(email: string) {
  return encodeURIComponent(email).replaceAll("%40", "@");
}

export function ContactManager() {
  const [intent, setIntent] = useState<IntentFilter>("all");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [selectedId, setSelectedId] = useState<ContactRecord["_id"] | null>(
    null,
  );
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const detailRef = useRef<HTMLElement>(null);
  const updateStatus = useMutation(api.adminSubmissions.setStatus);
  const queryArgs = {
    ...(intent === "all" ? {} : { intent }),
    ...(status === "all" ? {} : { status }),
  };
  const {
    results,
    status: paginationStatus,
    loadMore,
  } = usePaginatedQuery(api.adminSubmissions.listPage, queryArgs, {
    initialNumItems: 20,
  });

  const selected = useMemo(
    () => results.find((entry) => entry._id === selectedId) ?? results[0] ?? null,
    [results, selectedId],
  );

  function chooseIntent(next: IntentFilter) {
    setIntent(next);
    setSelectedId(null);
    setError("");
    setNotice("");
  }

  function chooseRecord(id: ContactRecord["_id"]) {
    setSelectedId(id);
    setError("");
    setNotice("");
    if (window.matchMedia("(max-width: 980px)").matches) {
      const reduceMotion = window.matchMedia(
        "(prefers-reduced-motion: reduce)",
      ).matches;
      window.requestAnimationFrame(() =>
        detailRef.current?.scrollIntoView({
          behavior: reduceMotion ? "auto" : "smooth",
          block: "start",
        }),
      );
    }
  }

  async function changeStatus(next: ContactStatus) {
    if (selected === null || next === selected.status || pending) return;
    setPending(true);
    setError("");
    setNotice("");
    try {
      const result = await updateStatus({
        id: selected._id,
        status: next,
        expectedUpdatedAt: selected.updatedAt,
      });
      if (!result.ok) {
        setError(
          "This message changed in another session. The latest version is loading; review it before trying again.",
        );
        return;
      }
      setNotice(`Marked ${statusLabels[next].toLowerCase()}.`);
      if (status !== "all" && status !== next) setSelectedId(null);
    } catch (caught) {
      setError(humanizeError(caught));
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      <AdminPageHeading
        title="Contact desk"
        description="Review membership requests, collaboration proposals, and questions without mixing their purpose. Replies still leave through your email."
      />

      <AdminSection
        title="Incoming messages"
        description="Choose a route first, then record what the club has done with each message."
      >
        <div className={styles.contactIntentRail} aria-label="Contact routes">
          {intentDefinitions.map((definition) => {
            const Icon = definition.icon;
            return (
              <button
                key={definition.value}
                type="button"
                className={styles.contactIntentButton}
                aria-label={definition.label}
                aria-pressed={intent === definition.value}
                onClick={() => chooseIntent(definition.value)}
              >
                <Icon aria-hidden width={22} height={22} strokeWidth={1.8} />
                <span>
                  <strong>{definition.label}</strong>
                  <small>{definition.description}</small>
                </span>
              </button>
            );
          })}
        </div>

        <div className={styles.contactToolbar}>
          <SelectField
            label="Work status"
            value={status}
            options={statusOptions}
            onValueChange={(next) => {
              setStatus(next as StatusFilter);
              setSelectedId(null);
              setError("");
              setNotice("");
            }}
          />
          <div className={styles.workspaceFact}>
            <span>Loaded in this view</span>
            <strong>
              {results.length} {results.length === 1 ? "message" : "messages"}
            </strong>
          </div>
          <p>
            Status is an internal work note. It never sends an email by itself.
          </p>
        </div>

        {error ? <AdminError>{error}</AdminError> : null}
        {notice ? (
          <p className={styles.contactNotice} role="status">
            {notice}
          </p>
        ) : null}

        {paginationStatus === "LoadingFirstPage" ? (
          <AdminLoadingRows label="Loading contact messages" />
        ) : results.length === 0 ? (
          <AdminEmpty
            title="No messages in this view"
            description="Choose another contact route or work status. New public submissions will appear here automatically."
          />
        ) : (
          <div className={styles.contactDesk}>
            <div className={styles.contactList} aria-label="Contact messages">
              {results.map((entry) => (
                <button
                  key={entry._id}
                  type="button"
                  className={styles.contactListRow}
                  data-active={selected?._id === entry._id}
                  aria-pressed={selected?._id === entry._id}
                  onClick={() => chooseRecord(entry._id)}
                >
                  <span className={styles.contactListHead}>
                    <strong data-contact-pii>{entry.name}</strong>
                    <time dateTime={new Date(entry.createdAt).toISOString()}>
                      {formatAdminDate(entry.createdAt)}
                    </time>
                  </span>
                  <span data-contact-pii>{entry.email}</span>
                  <small>{intentLabels[entry.intent]}</small>
                  <AdminStatus tone={statusTone(entry.status)}>
                    {statusLabels[entry.status]}
                  </AdminStatus>
                </button>
              ))}
              {paginationStatus !== "Exhausted" ? (
                <div className={styles.contactLoadMore}>
                  <LoadMoreButton
                    loading={paginationStatus === "LoadingMore"}
                    onClick={() => loadMore(20)}
                  />
                </div>
              ) : null}
            </div>

            {selected ? (
              <article
                ref={detailRef}
                className={styles.contactDetail}
                aria-labelledby="contact-detail-title"
              >
                <header className={styles.contactDetailHeader}>
                  <div>
                    <span>{intentLabels[selected.intent]}</span>
                    <h3 id="contact-detail-title" data-contact-pii>
                      {selected.name}
                    </h3>
                  <a
                      href={`mailto:${mailtoRecipient(selected.email)}`}
                      data-contact-pii
                    >
                      {selected.email}
                    </a>
                  </div>
                  <a
                    className={styles.primaryButton}
                    href={`mailto:${mailtoRecipient(selected.email)}?subject=${encodeURIComponent(`English Club: ${intentLabels[selected.intent]}`)}`}
                    aria-label={`Write an email to ${selected.name}`}
                  >
                    <EnvelopeIcon aria-hidden width={18} height={18} />
                    Write email
                  </a>
                </header>

                <dl className={styles.contactFacts}>
                  <div>
                    <dt>Received</dt>
                    <dd>{formatAdminDate(selected.createdAt)}</dd>
                  </div>
                  <div>
                    <dt>Permission recorded</dt>
                    <dd>{formatAdminDate(selected.consentAt)}</dd>
                  </div>
                </dl>

                <div className={styles.contactMessage}>
                  <span>Message</span>
                  <p data-contact-pii>{selected.message}</p>
                </div>

                <div className={styles.contactActionRow}>
                  <SelectField
                    label="Record work status"
                    value={selected.status}
                    options={workingStatusOptions}
                    disabled={pending}
                    onValueChange={(next) =>
                      void changeStatus(next as ContactStatus)
                    }
                  />
                  <p>
                    Use “Reply sent” only after a real reply has left your email
                    account. “Complete” closes the internal follow-up.
                  </p>
                </div>
              </article>
            ) : null}
          </div>
        )}
      </AdminSection>
    </>
  );
}
