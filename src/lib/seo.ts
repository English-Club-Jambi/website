import type { Metadata } from "next";

export const siteConfig = {
  name: "English Club",
  shortDescription:
    "A Universitas Jambi student English community formed through Perpustakaan Universitas Jambi for conversation, cultural exchange, and shared practice.",
  url: "https://englishclubjambi.my.id",
  locale: "en_US",
  language: "en",
};

export function getSiteUrl() {
  const fallback = new URL(siteConfig.url);
  const candidate = process.env.NEXT_PUBLIC_SITE_URL?.trim();

  if (candidate === undefined || candidate.length === 0) {
    return fallback;
  }

  try {
    const parsed = new URL(candidate);
    const isLocal =
      parsed.hostname === "localhost" ||
      parsed.hostname === "127.0.0.1" ||
      parsed.hostname === "::1" ||
      parsed.hostname.endsWith(".local");

    if (parsed.protocol !== "https:" || isLocal) {
      return fallback;
    }

    return new URL(parsed.origin);
  } catch {
    return fallback;
  }
}

export function absoluteUrl(path = "/") {
  return new URL(path, getSiteUrl()).toString();
}

export const defaultSocialImage = {
  url: absoluteUrl("/opengraph-image"),
  width: 1200,
  height: 630,
  alt: "English Club: English grows in company",
};

type SocialImage = {
  url: string;
  width?: number;
  height?: number;
  alt?: string;
};

type PageMetadataInput = {
  title: string;
  description: string;
  path: string;
  absoluteTitle?: boolean;
  image?: SocialImage;
};

type ArticleMetadataInput = PageMetadataInput & {
  publishedTime: string;
  modifiedTime: string;
  authors: string[];
  section?: string;
};

export function buildPageMetadata({
  title,
  description,
  path,
  absoluteTitle = false,
  image = defaultSocialImage,
}: PageMetadataInput): Metadata {
  const canonical = absoluteUrl(path);
  const metadataTitle = absoluteTitle ? { absolute: title } : title;

  return {
    title: metadataTitle,
    description,
    alternates: { canonical },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        noimageindex: false,
        "max-video-preview": -1,
        "max-image-preview": "large",
        "max-snippet": -1,
      },
    },
    openGraph: {
      type: "website",
      title,
      description,
      url: canonical,
      siteName: siteConfig.name,
      locale: siteConfig.locale,
      images: [image],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [image.url],
    },
  };
}

export function buildArticleMetadata({
  title,
  description,
  path,
  image = defaultSocialImage,
  publishedTime,
  modifiedTime,
  authors,
  section,
}: ArticleMetadataInput): Metadata {
  const base = buildPageMetadata({ title, description, path, image });
  const canonical = absoluteUrl(path);

  return {
    ...base,
    openGraph: {
      type: "article",
      title,
      description,
      url: canonical,
      siteName: siteConfig.name,
      locale: siteConfig.locale,
      images: [image],
      publishedTime,
      modifiedTime,
      authors,
      ...(section ? { section } : {}),
    },
  };
}
