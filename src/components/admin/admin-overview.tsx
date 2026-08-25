"use client";

import {
  ArrowTopRightOnSquareIcon,
  BookOpenIcon,
  DocumentTextIcon,
  PaintBrushIcon,
  PhotoIcon,
  RectangleStackIcon,
  UsersIcon,
} from "@heroicons/react/24/outline";
import type { Route } from "next";
import Link from "next/link";

import { AdminPageHeading, AdminSection, AdminStatus } from "./admin-ui";
import { canPublish, useAdminSession } from "./admin-session";
import styles from "./admin-shell.module.css";

const workAreas = [
  {
    href: "/admin/pages",
    label: "Page copy",
    description: "Update public wording with revision checks before publication.",
    action: "Open pages",
    icon: DocumentTextIcon,
  },
  {
    href: "/admin/journal",
    label: "Journal",
    description: "Write structured stories, place reviewed images, and prepare a revision.",
    action: "Open journal",
    icon: BookOpenIcon,
  },
  {
    href: "/admin/programs",
    label: "Programs",
    description: "Keep delivered work, programme lines, sources, and open community directions distinct.",
    action: "Open programs",
    icon: RectangleStackIcon,
  },
  {
    href: "/admin/members",
    label: "Member directory",
    description: "Keep responsibilities, profile consent, and portrait consent explicit.",
    action: "Open members",
    icon: UsersIcon,
  },
  {
    href: "/admin/media",
    label: "Media library",
    description: "Upload to R2, verify object metadata, then make the image selectable.",
    action: "Open media",
    icon: PhotoIcon,
  },
  {
    href: "/admin/appearance",
    label: "Public appearance",
    description: "Edit the shared light and dark colour recipe with contrast checks.",
    action: "Open appearance",
    icon: PaintBrushIcon,
  },
] as const satisfies ReadonlyArray<{
  href: Route;
  label: string;
  description: string;
  action: string;
  icon: typeof DocumentTextIcon;
}>;

export function AdminOverview() {
  const admin = useAdminSession();

  return (
    <>
      <AdminPageHeading
        title={`Welcome back, ${admin.displayName.split(/\s+/)[0]}.`}
        description="Choose the piece of the public site that needs attention. Changes remain drafts until an authorised publisher releases them."
        actions={
          <Link className={styles.secondaryButton} href="/" target="_blank">
            View public site
            <ArrowTopRightOnSquareIcon aria-hidden width={18} height={18} />
          </Link>
        }
      />

      <div className={styles.overviewBand}>
        <div>
          <span>Your access</span>
          <strong>{admin.role[0].toUpperCase() + admin.role.slice(1)}</strong>
        </div>
        <p>
          {canPublish(admin)
            ? "You can review drafts and publish approved public changes."
            : "You can prepare and revise content. A publisher releases public changes."}
        </p>
        <AdminStatus tone={admin.role === "owner" ? "success" : "neutral"}>
          Active account
        </AdminStatus>
      </div>

      <AdminSection
        title="Work areas"
        description="Each area has its own revision, consent, or verification boundary."
      >
        <div className={styles.workflowList}>
          {workAreas.map((area) => {
            const Icon = area.icon;
            return (
              <Link key={area.href} href={area.href} className={styles.workflowRow}>
                <Icon aria-hidden width={24} height={24} strokeWidth={1.7} />
                <span>
                  <strong>{area.label}</strong>
                  <small>{area.description}</small>
                </span>
                <b>{area.action}</b>
              </Link>
            );
          })}
        </div>
      </AdminSection>
    </>
  );
}
