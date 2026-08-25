"use client";

import { useAction } from "convex/react";
import { useCallback, useEffect, useState } from "react";

import { api } from "../../../../convex/_generated/api";

export type AssessmentMediaConfigStatus = {
  privateDraftReady: boolean;
  publicDerivativeReady: boolean;
  confidentialUploadsBlocked: boolean;
};

export function useAssessmentMediaConfig() {
  const getConfigStatus = useAction(api.assessmentMediaNode.getConfigStatus);
  const [status, setStatus] = useState<AssessmentMediaConfigStatus | undefined>();
  const [error, setError] = useState<unknown>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setStatus(await getConfigStatus({}));
    } catch (requestError) {
      setStatus(undefined);
      setError(requestError);
    } finally {
      setLoading(false);
    }
  }, [getConfigStatus]);

  useEffect(() => {
    let active = true;
    void getConfigStatus({})
      .then((nextStatus) => {
        if (active) setStatus(nextStatus);
      })
      .catch((requestError: unknown) => {
        if (active) setError(requestError);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [getConfigStatus]);

  return { status, error, loading, refresh };
}
