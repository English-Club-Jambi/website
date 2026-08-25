import type { Metadata } from "next";
import type { ReactNode } from "react";

import { AdminProvider } from "@/components/admin/admin-provider";
import { AdminAccessGate } from "@/components/admin/admin-session";
import { getConvexDeploymentUrl } from "@/lib/convex";

export const metadata: Metadata = {
  title: "Administration",
  description: "English Club content administration workspace.",
  robots: {
    index: false,
    follow: false,
    nocache: true,
    googleBot: {
      index: false,
      follow: false,
      noimageindex: true,
    },
  },
};

export default function AdminLayout({ children }: { children: ReactNode }) {
  const deploymentUrl = getConvexDeploymentUrl();

  return (
    <AdminProvider deploymentUrl={deploymentUrl}>
      <AdminAccessGate>{children}</AdminAccessGate>
    </AdminProvider>
  );
}
