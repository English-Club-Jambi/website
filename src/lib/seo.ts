export const siteConfig = {
  name: "English Club",
  shortDescription:
    "A student English community for conversation, cultural exchange, and shared practice.",
  localUrl: "http://localhost:3987",
};

export function getSiteUrl() {
  const candidate = process.env.NEXT_PUBLIC_SITE_URL ?? siteConfig.localUrl;

  try {
    return new URL(candidate);
  } catch {
    return new URL(siteConfig.localUrl);
  }
}

export function absoluteUrl(path = "/") {
  return new URL(path, getSiteUrl()).toString();
}
