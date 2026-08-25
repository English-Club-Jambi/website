"use client";

import { ConvexAuthProvider } from "@convex-dev/auth/react";
import { ConvexReactClient } from "convex/react";
import {
  createContext,
  useContext,
  useMemo,
  type ReactNode,
} from "react";

import type { PublicContentFor } from "@content/public-content";

type PracticeContextValue = {
  copy: PublicContentFor<"practice">;
  deploymentAvailable: boolean;
};

const PracticeContext = createContext<PracticeContextValue | null>(null);

export function usePracticeContext() {
  const value = useContext(PracticeContext);
  if (value === null) {
    throw new Error("PracticeProvider is missing from the Practice route.");
  }
  return value;
}

/**
 * Keeps the deployment URL server-owned while giving the practice subtree the
 * Convex Auth context it needs. Static unavailable states render without a
 * provider when no deployment is configured.
 */
export function PracticeProvider({
  deploymentUrl,
  copy,
  children,
}: {
  deploymentUrl?: string;
  copy: PublicContentFor<"practice">;
  children: ReactNode;
}) {
  const client = useMemo(
    () => (deploymentUrl ? new ConvexReactClient(deploymentUrl) : null),
    [deploymentUrl],
  );

  const content = (
    <PracticeContext value={{ copy, deploymentAvailable: client !== null }}>
      {children}
    </PracticeContext>
  );

  if (client === null) return content;

  return <ConvexAuthProvider client={client}>{content}</ConvexAuthProvider>;
}
