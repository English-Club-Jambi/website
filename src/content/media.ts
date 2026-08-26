export type PublicMedia = {
  key: string;
  sourceFile: string;
  objectKey: `images/${string}.webp`;
  avifObjectKey: `images/${string}.avif`;
  src: string;
  avifSrc: string;
  width: number;
  height: number;
  focalPoint: `${number}% ${number}%`;
  alt: string;
  rights: "cleared";
  consent: "cleared";
  provenance: "generated-synthetic";
  containsRealPeople: false;
  captureDateVerified: false;
};

export function resolveMediaUrl(
  objectKey: string,
  baseUrl = process.env.NEXT_PUBLIC_MEDIA_BASE_URL,
) {
  const localPath = `/${objectKey.replace(/^\/+/, "")}`;
  if (process.env.NEXT_PUBLIC_MEDIA_LOCAL_FALLBACK === "1") {
    return localPath;
  }

  const normalizedBaseUrl = baseUrl?.trim().replace(/\/+$/, "");

  return normalizedBaseUrl ? `${normalizedBaseUrl}${localPath}` : localPath;
}

export function resolveLocalMediaUrl(objectKey: string) {
  return `/${objectKey.replace(/^\/+/, "")}`;
}

/**
 * Every entry in this manifest is release-ready. Consent-pending documentary
 * derivatives live outside `public/` and cannot be addressed by the browser.
 */
export const media = {
  "conversation-relay-hero-v2": {
    key: "conversation-relay-hero-v2",
    sourceFile: "generated-conversation-relay-hero-v2.png",
    objectKey: "images/conversation-relay-hero-v2.webp",
    avifObjectKey: "images/conversation-relay-hero-v2.avif",
    src: resolveMediaUrl("images/conversation-relay-hero-v2.webp"),
    avifSrc: resolveMediaUrl("images/conversation-relay-hero-v2.avif"),
    width: 1672,
    height: 941,
    focalPoint: "76% 54%",
    alt: "A paper-and-clay miniature of an empty conversation room with a shared table, notebooks, a microphone, and headphones.",
    rights: "cleared",
    consent: "cleared",
    provenance: "generated-synthetic",
    containsRealPeople: false,
    captureDateVerified: false,
  },
  "activity-speak-relay-v2": {
    key: "activity-speak-relay-v2",
    sourceFile: "generated-activity-speak-relay-v2.png",
    objectKey: "images/activity-speak-relay-v2.webp",
    avifObjectKey: "images/activity-speak-relay-v2.avif",
    src: resolveMediaUrl("images/activity-speak-relay-v2.webp"),
    avifSrc: resolveMediaUrl("images/activity-speak-relay-v2.avif"),
    width: 1448,
    height: 1086,
    focalPoint: "57% 48%",
    alt: "A paper-and-clay microphone beside a blank notebook, prompt cards, and a cobalt ribbon.",
    rights: "cleared",
    consent: "cleared",
    provenance: "generated-synthetic",
    containsRealPeople: false,
    captureDateVerified: false,
  },
  "activity-exchange-relay-v2": {
    key: "activity-exchange-relay-v2",
    sourceFile: "generated-activity-exchange-relay-v2.png",
    objectKey: "images/activity-exchange-relay-v2.webp",
    avifObjectKey: "images/activity-exchange-relay-v2.avif",
    src: resolveMediaUrl("images/activity-exchange-relay-v2.webp"),
    avifSrc: resolveMediaUrl("images/activity-exchange-relay-v2.avif"),
    width: 1536,
    height: 1024,
    focalPoint: "52% 50%",
    alt: "A paper miniature of blank message cards crossing a cobalt path between two places.",
    rights: "cleared",
    consent: "cleared",
    provenance: "generated-synthetic",
    containsRealPeople: false,
    captureDateVerified: false,
  },
  "activity-make-relay-v2": {
    key: "activity-make-relay-v2",
    sourceFile: "generated-activity-make-relay-v2.png",
    objectKey: "images/activity-make-relay-v2.webp",
    avifObjectKey: "images/activity-make-relay-v2.avif",
    src: resolveMediaUrl("images/activity-make-relay-v2.webp"),
    avifSrc: resolveMediaUrl("images/activity-make-relay-v2.avif"),
    width: 1448,
    height: 1086,
    focalPoint: "54% 48%",
    alt: "An unfinished paper construction links a notebook, folded pieces, thread, clips, and scissors on a bright table.",
    rights: "cleared",
    consent: "cleared",
    provenance: "generated-synthetic",
    containsRealPeople: false,
    captureDateVerified: false,
  },
  "activity-room-relay-v2": {
    key: "activity-room-relay-v2",
    sourceFile: "generated-activity-room-relay-v2.png",
    objectKey: "images/activity-room-relay-v2.webp",
    avifObjectKey: "images/activity-room-relay-v2.avif",
    src: resolveMediaUrl("images/activity-room-relay-v2.webp"),
    avifSrc: resolveMediaUrl("images/activity-room-relay-v2.avif"),
    width: 1448,
    height: 1086,
    focalPoint: "53% 52%",
    alt: "A paper-and-clay miniature conversation circle with empty chairs, blank notebooks, cards, and headphones.",
    rights: "cleared",
    consent: "cleared",
    provenance: "generated-synthetic",
    containsRealPeople: false,
    captureDateVerified: false,
  },
  "about-record-relay-v2": {
    key: "about-record-relay-v2",
    sourceFile: "generated-about-record-relay-v2.png",
    objectKey: "images/about-record-relay-v2.webp",
    avifObjectKey: "images/about-record-relay-v2.avif",
    src: resolveMediaUrl("images/about-record-relay-v2.webp"),
    avifSrc: resolveMediaUrl("images/about-record-relay-v2.avif"),
    width: 1402,
    height: 1122,
    focalPoint: "48% 52%",
    alt: "A paper archive miniature with a blank scrapbook, index cards, cobalt binding thread, and an orange tab.",
    rights: "cleared",
    consent: "cleared",
    provenance: "generated-synthetic",
    containsRealPeople: false,
    captureDateVerified: false,
  },
  "member-relay-placeholder": {
    key: "member-relay-placeholder",
    sourceFile: "generated-member-relay-placeholder.png",
    objectKey: "images/member-relay-placeholder.webp",
    avifObjectKey: "images/member-relay-placeholder.avif",
    src: resolveMediaUrl("images/member-relay-placeholder.webp"),
    avifSrc: resolveMediaUrl("images/member-relay-placeholder.avif"),
    width: 1774,
    height: 887,
    focalPoint: "68% 48%",
    alt: "A generated overhead scene of fictional adults sharing a language activity around an irregular table.",
    rights: "cleared",
    consent: "cleared",
    provenance: "generated-synthetic",
    containsRealPeople: false,
    captureDateVerified: false,
  },
} satisfies Record<string, PublicMedia>;

export type MediaKey = keyof typeof media;

/**
 * Old Convex Journal records can retain their immutable cover key while the
 * browser receives a cleared synthetic replacement. No legacy source path is
 * served from this table.
 */
export const legacyMediaAliases = {
  "conversation-hero-placeholder": "conversation-relay-hero-v2",
  "club-room-group": "activity-room-relay-v2",
  "club-room-wide": "activity-room-relay-v2",
  "speaking-session": "activity-speak-relay-v2",
  "leeds-panel": "activity-exchange-relay-v2",
  "leeds-auditorium": "activity-exchange-relay-v2",
  "leeds-group": "activity-exchange-relay-v2",
  "club-room-selfie": "about-record-relay-v2",
  "club-room-portrait": "about-record-relay-v2",
  "shared-work": "activity-make-relay-v2",
  "table-conversation": "activity-room-relay-v2",
} satisfies Record<string, MediaKey>;

export function getMedia(key: string | undefined) {
  if (key === undefined) {
    return undefined;
  }

  if (key in media) {
    return media[key as MediaKey];
  }

  const alias = legacyMediaAliases[key as keyof typeof legacyMediaAliases];
  return alias === undefined ? undefined : media[alias];
}
