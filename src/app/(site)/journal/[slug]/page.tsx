import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { JournalCover } from "@/components/journal/journal-cover";
import { RichJournalBody } from "@/components/journal/rich-journal-body";
import { PageContainer, TextLink } from "@/components/ui";
import { getMedia } from "@/content/media";
import {
  formatPublishedDate,
  getPublishedPost,
  type PublicPost,
} from "@/lib/journal";
import { absoluteUrl, buildArticleMetadata, siteConfig } from "@/lib/seo";
import { serializeJsonLd } from "@/lib/structured-data";

type StoryProps = {
  params: Promise<{ slug: string }>;
};

// Convex server queries use no-store. Keep the route dynamic so metadata and
// page rendering share the same runtime contract in Next production builds.
export const dynamic = "force-dynamic";

function getPostSocialImage(post: PublicPost) {
  if (post.coverMedia !== undefined) {
    return {
      url: absoluteUrl(post.coverMedia.publicUrl),
      width: post.coverMedia.width,
      height: post.coverMedia.height,
      alt: post.coverMedia.alt,
    };
  }

  const cover = getMedia(post.coverKey);
  return cover === undefined
    ? undefined
    : {
        url: absoluteUrl(cover.src),
        width: cover.width,
        height: cover.height,
        alt: cover.alt,
      };
}

export async function generateMetadata({ params }: StoryProps): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPublishedPost(slug);

  if (!post) {
    return {
      title: "Story not found",
      robots: { index: false, follow: false },
    };
  }

  return buildArticleMetadata({
    title: post.title,
    description: post.excerpt,
    path: `/journal/${post.slug}`,
    image: getPostSocialImage(post),
    publishedTime: new Date(post.publishedAt).toISOString(),
    modifiedTime: new Date(post.updatedAt).toISOString(),
    authors: [post.authorName],
    section: post.category,
  });
}

export default async function JournalStoryPage({ params }: StoryProps) {
  const { slug } = await params;
  const post = await getPublishedPost(slug);

  if (!post) {
    notFound();
  }

  const hasCover =
    post.coverMedia !== undefined || getMedia(post.coverKey) !== undefined;
  const canonicalUrl = absoluteUrl(`/journal/${post.slug}`);
  const socialImage = getPostSocialImage(post);
  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "BlogPosting",
      headline: post.title,
      description: post.excerpt,
      author: { "@type": "Organization", name: post.authorName },
      publisher: {
        "@type": "Organization",
        "@id": absoluteUrl("/#organization"),
        name: siteConfig.name,
        url: absoluteUrl("/"),
      },
      datePublished: new Date(post.publishedAt).toISOString(),
      dateModified: new Date(post.updatedAt).toISOString(),
      mainEntityOfPage: {
        "@type": "WebPage",
        "@id": canonicalUrl,
      },
      url: canonicalUrl,
      inLanguage: siteConfig.language,
      articleSection: post.category,
      isAccessibleForFree: true,
      isPartOf: {
        "@type": "Blog",
        "@id": absoluteUrl("/journal#journal"),
        url: absoluteUrl("/journal"),
        name: `${siteConfig.name} Journal`,
      },
      ...(socialImage ? { image: [socialImage.url] } : {}),
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: absoluteUrl("/") },
        { "@type": "ListItem", position: 2, name: "Journal", item: absoluteUrl("/journal") },
        { "@type": "ListItem", position: 3, name: post.title, item: canonicalUrl },
      ],
    },
  ];

  return (
    <article className="journal-article">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(jsonLd) }}
      />
      <header className="article-header">
        <PageContainer className="article-header-grid">
          <div>
            <TextLink href="/journal">Back to the journal</TextLink>
            <p className="story-meta article-meta">
              <span className="story-tag">{post.category}</span>
              <time dateTime={new Date(post.publishedAt).toISOString()}>
                {formatPublishedDate(post.publishedAt)}
              </time>
            </p>
            <h1>{post.title}</h1>
            <p className="article-standfirst">{post.excerpt}</p>
            <p className="article-byline">By {post.authorName}</p>
          </div>
        </PageContainer>
      </header>

      {hasCover ? (
        <PageContainer className="article-cover-wrap">
          <JournalCover
            coverKey={post.coverKey}
            coverMedia={post.coverMedia}
            ratio="3 / 2"
            sizes="(max-width: 879px) 100vw, 80vw"
            className="article-cover"
            priority
          />
        </PageContainer>
      ) : null}

      <PageContainer className="article-layout">
        <div className="article-rail" aria-hidden>
          <span>English / Club</span>
          <span>Journal</span>
        </div>
        <RichJournalBody
          editorJson={post.editorJson}
          inlineMedia={post.inlineMedia}
          fallbackBody={post.body}
        />
      </PageContainer>

      <PageContainer className="article-return">
        <p>That is the note. The next conversation is still open.</p>
        <TextLink href="/journal">Browse all stories</TextLink>
      </PageContainer>
    </article>
  );
}
