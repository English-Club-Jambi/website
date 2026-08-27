import { afterEach, describe, expect, it } from "vitest";

import {
  absoluteUrl,
  buildArticleMetadata,
  buildPageMetadata,
  getSiteUrl,
} from "@/lib/seo";

const originalSiteUrl = process.env.NEXT_PUBLIC_SITE_URL;

afterEach(() => {
  if (originalSiteUrl === undefined) {
    delete process.env.NEXT_PUBLIC_SITE_URL;
  } else {
    process.env.NEXT_PUBLIC_SITE_URL = originalSiteUrl;
  }
});

describe("public SEO metadata", () => {
  it("never emits a localhost or HTTP canonical origin", () => {
    process.env.NEXT_PUBLIC_SITE_URL = "http://localhost:3987";
    expect(getSiteUrl().toString()).toBe("https://englishclub.mukhtada.my.id/");
    expect(absoluteUrl("/journal/story")).toBe(
      "https://englishclub.mukhtada.my.id/journal/story",
    );

    process.env.NEXT_PUBLIC_SITE_URL = "not a URL";
    expect(getSiteUrl().toString()).toBe("https://englishclub.mukhtada.my.id/");
  });

  it("accepts an explicit HTTPS production origin and strips extra path state", () => {
    process.env.NEXT_PUBLIC_SITE_URL = "https://preview.example.com/path?q=1#part";
    expect(getSiteUrl().toString()).toBe("https://preview.example.com/");
  });

  it("builds canonical, social, and generous preview metadata together", () => {
    const metadata = buildPageMetadata({
      title: "About",
      description: "How English Club works.",
      path: "/about",
    });

    expect(metadata.alternates?.canonical).toBe(
      "https://englishclub.mukhtada.my.id/about",
    );
    expect(metadata.openGraph).toMatchObject({
      type: "website",
      url: "https://englishclub.mukhtada.my.id/about",
      siteName: "English Club",
      locale: "en_US",
    });
    expect(metadata.twitter).toMatchObject({ card: "summary_large_image" });
    expect(metadata.robots).toMatchObject({
      index: true,
      follow: true,
      googleBot: {
        "max-image-preview": "large",
        "max-snippet": -1,
        "max-video-preview": -1,
      },
    });
  });

  it("builds article metadata with a representative cover and publication facts", () => {
    const metadata = buildArticleMetadata({
      title: "A room made for trying again",
      description: "A note from an English Club session.",
      path: "/journal/a-room-made-for-trying-again",
      image: {
        url: "https://r2.mukhtada.my.id/images/story.webp",
        width: 1448,
        height: 1086,
        alt: "A shared conversation table.",
      },
      publishedTime: "2026-08-24T00:00:00.000Z",
      modifiedTime: "2026-08-25T00:00:00.000Z",
      authors: ["English Club"],
      section: "Club life",
    });

    expect(metadata.openGraph).toMatchObject({
      type: "article",
      section: "Club life",
      publishedTime: "2026-08-24T00:00:00.000Z",
      modifiedTime: "2026-08-25T00:00:00.000Z",
      authors: ["English Club"],
      images: [
        {
          url: "https://r2.mukhtada.my.id/images/story.webp",
          width: 1448,
          height: 1086,
          alt: "A shared conversation table.",
        },
      ],
    });
  });
});
