"use client";

import { ConvexAuthProvider } from "@convex-dev/auth/react";
import { ConvexReactClient } from "convex/react";
import { useMemo, type ReactNode } from "react";

import styles from "./admin-shell.module.css";

export function AdminProvider({
  deploymentUrl,
  children,
}: {
  deploymentUrl?: string;
  children: ReactNode;
}) {
  const convexClient = useMemo(
    () => (deploymentUrl ? new ConvexReactClient(deploymentUrl) : null),
    [deploymentUrl],
  );

  if (convexClient === null) {
    return (
      <main className={styles.configurationPage}>
        <section className={styles.configurationNotice}>
          <p className={styles.contextLabel}>English Club CMS</p>
          <h1>Connect the Convex deployment.</h1>
          <p>
            Set <code>CONVEX_URL</code> for this environment before
            opening the administration workspace.
          </p>
        </section>
      </main>
    );
  }

  return (
    <ConvexAuthProvider client={convexClient}>
      {children}
    </ConvexAuthProvider>
  );
}
