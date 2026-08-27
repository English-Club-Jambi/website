import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const routeSource = readFileSync(
  join(process.cwd(), "src/app/(site)/journal/[slug]/page.tsx"),
  "utf8",
);

describe("journal story runtime contract", () => {
  it("keeps Convex-backed slug pages dynamic in production builds", () => {
    expect(routeSource).toContain('export const dynamic = "force-dynamic";');
    expect(routeSource).not.toContain("generateStaticParams");
  });
});
