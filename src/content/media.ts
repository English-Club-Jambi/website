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
  rights: "supplied-unverified" | "cleared";
  consent: "pending" | "cleared";
  captureDateVerified: boolean;
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

export const media = {
  "conversation-hero-placeholder": {
    key: "conversation-hero-placeholder",
    sourceFile: "generated-conversation-hero-placeholder.png",
    objectKey: "images/conversation-hero-placeholder.webp",
    avifObjectKey: "images/conversation-hero-placeholder.avif",
    src: resolveMediaUrl("images/conversation-hero-placeholder.webp"),
    avifSrc: resolveMediaUrl("images/conversation-hero-placeholder.avif"),
    width: 1692,
    height: 930,
    focalPoint: "76% 52%",
    alt: "Young adults talking around a table in a bright library-like room.",
    rights: "cleared",
    consent: "cleared",
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
    alt: "Adults sharing a language activity around an irregular table.",
    rights: "cleared",
    consent: "cleared",
    captureDateVerified: false,
  },
  "club-room-group": {
    key: "club-room-group",
    sourceFile: "_MG_7706.JPG",
    objectKey: "images/club-room-group.webp",
    avifObjectKey: "images/club-room-group.avif",
    src: resolveLocalMediaUrl("images/club-room-group.webp"),
    avifSrc: resolveLocalMediaUrl("images/club-room-group.avif"),
    width: 2000,
    height: 1333,
    focalPoint: "52% 56%",
    alt: "A large group gathers closely around a low table in a room lined with books.",
    rights: "supplied-unverified",
    consent: "pending",
    captureDateVerified: false,
  },
  "club-room-wide": {
    key: "club-room-wide",
    sourceFile: "_MG_8143.JPG",
    objectKey: "images/club-room-wide.webp",
    avifObjectKey: "images/club-room-wide.avif",
    src: resolveLocalMediaUrl("images/club-room-wide.webp"),
    avifSrc: resolveLocalMediaUrl("images/club-room-wide.avif"),
    width: 2000,
    height: 1333,
    focalPoint: "55% 60%",
    alt: "People sit around low tables in a library-like room with bookshelves along one wall.",
    rights: "supplied-unverified",
    consent: "pending",
    captureDateVerified: false,
  },
  "speaking-session": {
    key: "speaking-session",
    sourceFile: "_MG_8198.JPG",
    objectKey: "images/speaking-session.webp",
    avifObjectKey: "images/speaking-session.avif",
    src: resolveLocalMediaUrl("images/speaking-session.webp"),
    avifSrc: resolveLocalMediaUrl("images/speaking-session.avif"),
    width: 2000,
    height: 1333,
    focalPoint: "54% 58%",
    alt: "Three participants sit at the front of a room; one speaks into a microphone beside a laptop.",
    rights: "supplied-unverified",
    consent: "pending",
    captureDateVerified: false,
  },
  "leeds-panel": {
    key: "leeds-panel",
    sourceFile: "IMG_1903.JPG",
    objectKey: "images/leeds-panel.webp",
    avifObjectKey: "images/leeds-panel.avif",
    src: resolveLocalMediaUrl("images/leeds-panel.webp"),
    avifSrc: resolveLocalMediaUrl("images/leeds-panel.avif"),
    width: 2000,
    height: 1333,
    focalPoint: "54% 58%",
    alt: "Speakers sit in a panel while one person talks into a handheld microphone.",
    rights: "supplied-unverified",
    consent: "pending",
    captureDateVerified: false,
  },
  "leeds-auditorium": {
    key: "leeds-auditorium",
    sourceFile: "IMG_2017.JPG",
    objectKey: "images/leeds-auditorium.webp",
    avifObjectKey: "images/leeds-auditorium.avif",
    src: resolveLocalMediaUrl("images/leeds-auditorium.webp"),
    avifSrc: resolveLocalMediaUrl("images/leeds-auditorium.avif"),
    width: 2000,
    height: 1333,
    focalPoint: "50% 48%",
    alt: "A large group stands together across the front of an auditorium.",
    rights: "supplied-unverified",
    consent: "pending",
    captureDateVerified: false,
  },
  "leeds-group": {
    key: "leeds-group",
    sourceFile: "IMG_2028.JPG",
    objectKey: "images/leeds-group.webp",
    avifObjectKey: "images/leeds-group.avif",
    src: resolveLocalMediaUrl("images/leeds-group.webp"),
    avifSrc: resolveLocalMediaUrl("images/leeds-group.avif"),
    width: 2000,
    height: 1333,
    focalPoint: "50% 50%",
    alt: "A group poses in two rows at the front of an auditorium.",
    rights: "supplied-unverified",
    consent: "pending",
    captureDateVerified: false,
  },
  "club-room-selfie": {
    key: "club-room-selfie",
    sourceFile: "_MG_7702.JPG",
    objectKey: "images/club-room-selfie.webp",
    avifObjectKey: "images/club-room-selfie.avif",
    src: resolveLocalMediaUrl("images/club-room-selfie.webp"),
    avifSrc: resolveLocalMediaUrl("images/club-room-selfie.avif"),
    width: 2000,
    height: 1333,
    focalPoint: "52% 48%",
    alt: "Seven people gather around open laptops for a group selfie in a club room.",
    rights: "supplied-unverified",
    consent: "pending",
    captureDateVerified: false,
  },
  "club-room-portrait": {
    key: "club-room-portrait",
    sourceFile: "_MG_7713.JPG",
    objectKey: "images/club-room-portrait.webp",
    avifObjectKey: "images/club-room-portrait.avif",
    src: resolveLocalMediaUrl("images/club-room-portrait.webp"),
    avifSrc: resolveLocalMediaUrl("images/club-room-portrait.avif"),
    width: 2000,
    height: 1333,
    focalPoint: "57% 52%",
    alt: "Three people sit together in front of shelves and a blue activity poster.",
    rights: "supplied-unverified",
    consent: "pending",
    captureDateVerified: false,
  },
  "shared-work": {
    key: "shared-work",
    sourceFile: "_MG_8145.JPG",
    objectKey: "images/shared-work.webp",
    avifObjectKey: "images/shared-work.avif",
    src: resolveLocalMediaUrl("images/shared-work.webp"),
    avifSrc: resolveLocalMediaUrl("images/shared-work.avif"),
    width: 2000,
    height: 1333,
    focalPoint: "56% 54%",
    alt: "Small groups talk and work around tables in a room with bookshelves.",
    rights: "supplied-unverified",
    consent: "pending",
    captureDateVerified: false,
  },
  "table-conversation": {
    key: "table-conversation",
    sourceFile: "_MG_8170.JPG",
    objectKey: "images/table-conversation.webp",
    avifObjectKey: "images/table-conversation.avif",
    src: resolveLocalMediaUrl("images/table-conversation.webp"),
    avifSrc: resolveLocalMediaUrl("images/table-conversation.avif"),
    width: 2000,
    height: 1333,
    focalPoint: "56% 54%",
    alt: "Five people sit around a low table in front of library shelves.",
    rights: "supplied-unverified",
    consent: "pending",
    captureDateVerified: false,
  },
} satisfies Record<string, PublicMedia>;

export type MediaKey = keyof typeof media;

export function getMedia(key: string | undefined) {
  if (key === undefined || !(key in media)) {
    return undefined;
  }

  return media[key as MediaKey];
}
