import type { Route } from "next";
import Link from "next/link";

import { getMedia } from "@/content/media";
import { formatPublishedDate, type PublicPost } from "@/lib/journal";
import { DocumentaryImage } from "./documentary-image";

export function StoryRow({ post }: { post: PublicPost }) {
  const cover = getMedia(post.coverKey);
  const href = `/journal/${post.slug}` as Route;

  return (
    <article className="story-row">
      {cover ? (
        <Link href={href} className="story-row-image" tabIndex={-1} aria-hidden>
          <DocumentaryImage media={cover} ratio="4 / 3" decorative />
        </Link>
      ) : null}
      <div className="story-row-copy">
        <p className="story-meta">
          <span className="story-tag">{post.category}</span>
          <time dateTime={new Date(post.publishedAt).toISOString()}>
            {formatPublishedDate(post.publishedAt)}
          </time>
        </p>
        <h2 className="story-row-title">
          <Link href={href}>{post.title}</Link>
        </h2>
        <p className="story-row-excerpt">{post.excerpt}</p>
        <Link href={href} className="text-link" aria-label={`Read ${post.title}`}>
          Read the story
        </Link>
      </div>
    </article>
  );
}
