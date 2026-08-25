import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const convexMocks = vi.hoisted(() => ({
  constructClient: vi.fn(),
}));

vi.mock("convex/react", () => ({
  ConvexReactClient: class MockConvexReactClient {
    constructor(url: string) {
      convexMocks.constructClient(url);
    }
  },
}));

vi.mock("@convex-dev/auth/react", () => ({
  ConvexAuthProvider: ({ children }: { children: React.ReactNode }) => children,
}));

import { AdminProvider } from "@/components/admin/admin-provider";
import { getConvexDeploymentUrl } from "@/lib/convex";

afterEach(() => {
  cleanup();
  convexMocks.constructClient.mockClear();
  vi.unstubAllEnvs();
});

describe("AdminProvider", () => {
  it("uses the deployment URL resolved by the server layout", () => {
    render(
      <AdminProvider deploymentUrl="https://perfect-greyhound-270.convex.cloud">
        <p>Connected admin workspace</p>
      </AdminProvider>,
    );

    expect(convexMocks.constructClient).toHaveBeenCalledWith(
      "https://perfect-greyhound-270.convex.cloud",
    );
    expect(screen.getByText("Connected admin workspace")).toBeVisible();
  });

  it("names the server CONVEX_URL variable when configuration is missing", () => {
    render(
      <AdminProvider>
        <p>This must not render</p>
      </AdminProvider>,
    );

    expect(screen.getByText("CONVEX_URL")).toBeVisible();
    expect(screen.queryByText(/NEXT_PUBLIC_CONVEX_URL/)).toBeNull();
    expect(screen.queryByText("This must not render")).toBeNull();
  });

  it("resolves the server CONVEX_URL without a public deployment variable", () => {
    vi.stubEnv("CONVEX_URL", "https://perfect-greyhound-270.convex.cloud");
    vi.stubEnv("NEXT_PUBLIC_CONVEX_URL", "");

    expect(getConvexDeploymentUrl()).toBe(
      "https://perfect-greyhound-270.convex.cloud",
    );
  });
});
