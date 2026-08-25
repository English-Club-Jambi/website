"use client";

import { useConvexAuth } from "@convex-dev/auth/react";
import { useQuery } from "convex/react";
import type { ReactNode } from "react";

import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { usePracticeContext } from "./practice-provider";

/**
 * This is only a cheap URL guard. Convex remains authoritative: a string that
 * passes this check must still be normalized and ownership-checked by
 * `assessmentAttempts.resolveMine` before it reaches any `v.id` function.
 */
export function isPlausibleAttemptId(value: string) {
  return value.length <= 128 && /^[a-z0-9]{20,128}$/iu.test(value);
}

function ConnectedAttemptRouteResolver({
  routeAttemptId,
  loading,
  unavailable,
  children,
}: {
  routeAttemptId: string;
  loading: ReactNode;
  unavailable: ReactNode;
  children: (attemptId: Id<"assessmentAttempts">) => ReactNode;
}) {
  const { isAuthenticated, isLoading } = useConvexAuth();
  const resolved = useQuery(
    api.assessmentAttempts.resolveMine,
    isAuthenticated ? { attemptId: routeAttemptId } : "skip",
  );

  if (isLoading) return loading;
  if (!isAuthenticated) return unavailable;
  if (resolved === undefined) return loading;
  if (resolved === null) return unavailable;
  return children(resolved.attemptId);
}

export function AttemptRouteResolver({
  routeAttemptId,
  loading,
  unavailable,
  children,
}: {
  routeAttemptId: string;
  loading: ReactNode;
  unavailable: ReactNode;
  children: (attemptId: Id<"assessmentAttempts">) => ReactNode;
}) {
  const { deploymentAvailable } = usePracticeContext();

  if (!deploymentAvailable || !isPlausibleAttemptId(routeAttemptId)) {
    return unavailable;
  }

  return (
    <ConnectedAttemptRouteResolver
      routeAttemptId={routeAttemptId}
      loading={loading}
      unavailable={unavailable}
    >
      {children}
    </ConnectedAttemptRouteResolver>
  );
}
