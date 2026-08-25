"use client";

import { ArrowLeftIcon, ShieldCheckIcon } from "@heroicons/react/24/outline";
import { useMutation } from "convex/react";
import type { Route } from "next";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { api } from "../../../../convex/_generated/api";

import { useAdminSession } from "../admin-session";
import adminStyles from "../admin-shell.module.css";
import { AdminPageHeading, AdminSection, humanizeError } from "../admin-ui";
import {
  AssessmentDefinitionForm,
  type CreateAssessmentDefinitionInput,
} from "./assessment-definition-form";
import { getAssessmentAdminCapabilities } from "./assessment-admin-permissions";
import styles from "./assessment-admin.module.css";

export function AssessmentCreateManager() {
  const admin = useAdminSession();
  const capabilities = getAssessmentAdminCapabilities(admin.role);
  const create = useMutation(api.adminAssessments.create);
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  async function handleCreate(input: CreateAssessmentDefinitionInput) {
    setPending(true);
    setError("");
    try {
      const created = await create(input);
      router.push(`/admin/assessments/${created.definitionId}` as Route);
    } catch (requestError) {
      setError(humanizeError(requestError));
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      <Link className={adminStyles.backLink} href="/admin/assessments">
        <ArrowLeftIcon aria-hidden width={18} height={18} />
        Assessment catalogue
      </Link>
      <AdminPageHeading
        title="Start a private draft"
        description="Name the internal record and write the learner-facing contract before adding sections, stimuli, or questions."
      />

      {capabilities.canEdit ? (
        <AdminSection
          title="Definition and first version"
          description="Whole-assessment timing is intentionally unavailable. Full practice forms use reviewed per-section timing."
        >
          <AssessmentDefinitionForm
            pending={pending}
            error={error || undefined}
            onCreate={handleCreate}
          />
        </AdminSection>
      ) : (
        <AdminSection
          title="Editor access required"
          description="Publisher accounts review and publish existing drafts but cannot change assessment content."
        >
          <div className={styles.accessNotice}>
            <ShieldCheckIcon aria-hidden width={32} height={32} />
            <p>Ask an owner or editor to create the private definition.</p>
          </div>
        </AdminSection>
      )}
    </>
  );
}
