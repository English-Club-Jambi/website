import { describe, expect, it } from "vitest";

import nextConfig from "../../next.config";

describe("Next.js response security", () => {
  it("applies the conservative baseline headers to every route", async () => {
    const rules = await nextConfig.headers?.();

    expect(rules).toHaveLength(1);
    expect(rules?.[0]?.source).toBe("/:path*");

    const headers = Object.fromEntries(
      (rules?.[0]?.headers ?? []).map(({ key, value }) => [key, value]),
    );

    expect(headers).toMatchObject({
      "X-Content-Type-Options": "nosniff",
      "Referrer-Policy": "strict-origin-when-cross-origin",
      "X-Frame-Options": "DENY",
      "Permissions-Policy":
        "camera=(), microphone=(), geolocation=(), payment=()",
      "X-Permitted-Cross-Domain-Policies": "none",
    });
    expect(nextConfig.poweredByHeader).toBe(false);
  });
});
