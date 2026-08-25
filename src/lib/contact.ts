export type ContactIntent = "join" | "partner" | "ask";

export type ContactValues = {
  name: string;
  email: string;
  intent: ContactIntent;
  message: string;
  consent: boolean;
};

export type ContactField = keyof ContactValues;

export type ContactState = {
  status: "idle" | "error" | "success";
  message: string;
  fieldErrors: Partial<Record<ContactField, string>>;
  values: ContactValues;
};

export const emptyContactValues: ContactValues = {
  name: "",
  email: "",
  intent: "join",
  message: "",
  consent: false,
};

export const initialContactState: ContactState = {
  status: "idle",
  message: "",
  fieldErrors: {},
  values: emptyContactValues,
};

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const contactIntents: ContactIntent[] = ["join", "partner", "ask"];

export function isContactIntent(value: string): value is ContactIntent {
  return contactIntents.includes(value as ContactIntent);
}

export function parseContactIntent(value: string | string[] | undefined): ContactIntent {
  const intent = Array.isArray(value) ? value[0] : value;
  return intent !== undefined && isContactIntent(intent) ? intent : "join";
}

export function validateContactValues(values: ContactValues) {
  const errors: ContactState["fieldErrors"] = {};

  if (values.name.length < 2 || values.name.length > 80) {
    errors.name = "Enter a name between 2 and 80 characters.";
  }

  if (values.email.length > 254 || !emailPattern.test(values.email)) {
    errors.email = "Enter a valid email address.";
  }

  if (!contactIntents.includes(values.intent)) {
    errors.intent = "Choose what you would like to discuss.";
  }

  if (values.message.length < 20 || values.message.length > 2_000) {
    errors.message = "Write between 20 and 2,000 characters.";
  }

  if (!values.consent) {
    errors.consent = "Consent is required before this message can be stored.";
  }

  return errors;
}
