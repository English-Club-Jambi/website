import type { ReactNode } from "react";

import { PracticeProvider } from "@/components/practice/practice-provider";
import { getConvexDeploymentUrl } from "@/lib/convex";
import { getPublicPageContent } from "@/lib/public-content";

export default async function PracticeLayout({ children }: { children: ReactNode }) {
  const copy = await getPublicPageContent("practice");
  return (
    <PracticeProvider deploymentUrl={getConvexDeploymentUrl()} copy={copy}>
      {children}
    </PracticeProvider>
  );
}
