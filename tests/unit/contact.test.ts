import { describe, expect, it } from "vitest";

import {
  parseContactIntent,
  validateContactValues,
  type ContactValues,
} from "@/lib/contact";

const validValues: ContactValues = {
  name: "Alya",
  email: "alya@example.com",
  intent: "join",
  message: "I would like to ask about joining the next club session.",
  consent: true,
};

describe("contact validation", () => {
  it("accepts a bounded, consented payload", () => {
    expect(validateContactValues(validValues)).toEqual({});
  });

  it("returns a field error for every invalid value", () => {
    const errors = validateContactValues({
      name: "A",
      email: "not-an-email",
      intent: "join",
      message: "Too short",
      consent: false,
    });

    expect(errors).toEqual({
      name: "Enter a name between 2 and 80 characters.",
      email: "Enter a valid email address.",
      message: "Write between 20 and 2,000 characters.",
      consent: "Consent is required before this message can be stored.",
    });
  });

  it("normalises supported query intent and rejects unknown values", () => {
    expect(parseContactIntent("partner")).toBe("partner");
    expect(parseContactIntent(["ask", "join"])).toBe("ask");
    expect(parseContactIntent("membership")).toBe("join");
    expect(parseContactIntent(undefined)).toBe("join");
  });
});
