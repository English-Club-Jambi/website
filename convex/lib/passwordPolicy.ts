const emailPattern =
  /^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)+$/;

export function normalizePasswordEmail(value: unknown) {
  const email = typeof value === "string" ? value.trim().toLowerCase() : "";
  if (email.length < 6 || email.length > 254 || !emailPattern.test(email)) {
    throw new Error("Enter a valid email address.");
  }
  return email;
}

export function normalizePasswordDisplayName(value: unknown) {
  const name =
    typeof value === "string" ? value.trim().replace(/\s+/g, " ") : "";
  if (name.length < 2 || name.length > 100) {
    throw new Error("Name must be between 2 and 100 characters.");
  }
  return name;
}

export function assertPasswordRequirements(password: string) {
  const utf8Bytes = new TextEncoder().encode(password).byteLength;
  if (
    password.length < 12 ||
    password.length > 128 ||
    utf8Bytes > 72 ||
    !/[a-z]/.test(password) ||
    !/[A-Z]/.test(password) ||
    !/[0-9]/.test(password)
  ) {
    throw new Error(
      "Password must be 12–128 characters, fit bcrypt's 72-byte limit, and include upper-case, lower-case, and numeric characters.",
    );
  }
}
