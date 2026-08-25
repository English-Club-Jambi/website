"use server";

import { fetchMutation } from "convex/nextjs";

import { api } from "../../convex/_generated/api";
import {
  emptyContactValues,
  isContactIntent,
  validateContactValues,
  type ContactState,
  type ContactValues,
} from "@/lib/contact";
import { getConvexDeploymentUrl } from "@/lib/convex";

function stringValue(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

function parseValues(formData: FormData): ContactValues {
  const rawIntent = stringValue(formData, "intent");
  return {
    name: stringValue(formData, "name").trim(),
    email: stringValue(formData, "email").trim(),
    intent: isContactIntent(rawIntent) ? rawIntent : "ask",
    message: stringValue(formData, "message").trim(),
    consent: formData.get("consent") === "on",
  };
}

export async function submitContact(
  _previousState: ContactState,
  formData: FormData,
): Promise<ContactState> {
  const values = parseValues(formData);
  const fieldErrors = validateContactValues(values);

  if (Object.keys(fieldErrors).length > 0) {
    return {
      status: "error",
      message: "Check the marked fields and try again.",
      fieldErrors,
      values,
    };
  }

  const convexUrl = getConvexDeploymentUrl();
  if (convexUrl === undefined) {
    return {
      status: "error",
      message: "The message service is not connected. Your text is still here, so you can try again later.",
      fieldErrors: {},
      values,
    };
  }

  try {
    const result = await fetchMutation(
      api.submissions.create,
      {
        ...values,
        website: stringValue(formData, "website"),
      },
      { url: convexUrl },
    );

    if (result.ok) {
      return {
        status: "success",
        message: "Your message is in the club's private review queue.",
        fieldErrors: {},
        values: { ...emptyContactValues, intent: values.intent },
      };
    }

    const message =
      result.code === "rate_limited"
        ? "Too many messages were sent from this email in a short time. Please wait before trying again."
        : result.code === "invalid"
          ? "The message could not be accepted. Check the fields and try again."
          : "The message could not be sent.";

    return {
      status: "error",
      message,
      fieldErrors: {},
      values,
    };
  } catch (error) {
    console.error(
      "[contact] Convex submission failed.",
      error instanceof Error ? error.message : "Unknown error",
    );
    return {
      status: "error",
      message: "The message service did not respond. Your text is still here, so you can try again.",
      fieldErrors: {},
      values,
    };
  }
}
