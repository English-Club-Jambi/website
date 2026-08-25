import { describe, expect, it } from "vitest";

import { serializeJsonLd } from "@/lib/structured-data";

describe("serializeJsonLd", () => {
  it("escapes editor-controlled less-than characters", () => {
    const serialized = serializeJsonLd({
      title: "A </script><script>alert(1)</script>\u2028next\u2029line",
    });

    expect(serialized).not.toContain("<");
    expect(serialized).toContain("\\u003c/script>");
    expect(serialized).toContain("\\u2028");
    expect(serialized).toContain("\\u2029");
    expect(JSON.parse(serialized)).toEqual({
      title: "A </script><script>alert(1)</script>\u2028next\u2029line",
    });
  });
});
