import {
  ArrowLeftIcon,
  ArrowRightIcon,
  ArrowUpRightIcon,
  BookOpenIcon,
} from "@heroicons/react/24/outline";
import type { Route } from "next";
import Link from "next/link";
import type { PublicContentFor } from "@content/public-content";

import { PageContainer } from "@/components/ui";
import { getMedia } from "@/content/media";
import {
  formatPublishedDate,
  type JournalArchivePage,
  type PublicPostSummary,
} from "@/lib/journal";

import styles from "./journal-archive.module.css";
import { JournalCover } from "./journal-cover";

function JournalArchiveItem({ post }: { post: PublicPostSummary }) {
  const href = `/journal/${post.slug}` as Route;
  const hasCover = post.coverMedia !== undefined || getMedia(post.coverKey) !== undefined;

  return (
    <li className={styles.archiveItem}>
      <article>
        <p className={styles.archiveMeta}>
          <span>{post.category}</span>
          <time dateTime={new Date(post.publishedAt).toISOString()}>
            {formatPublishedDate(post.publishedAt)}
          </time>
        </p>

        <div className={styles.archiveCopy}>
          <h3>
            <Link href={href}>
              <span>{post.title}</span>
              <ArrowUpRightIcon
                width={22}
                height={22}
                strokeWidth={1.9}
                aria-hidden
              />
            </Link>
          </h3>
          <p>{post.excerpt}</p>
        </div>

        {!hasCover ? (
          <div className={styles.archiveImageFallback} aria-hidden>
            <BookOpenIcon width={28} height={28} strokeWidth={1.5} />
          </div>
        ) : (
          <Link
            href={href}
            className={styles.archiveImage}
            tabIndex={-1}
            aria-hidden
          >
            <JournalCover
              coverKey={post.coverKey}
              coverMedia={post.coverMedia}
              ratio="4 / 3"
              decorative
            />
          </Link>
        )}
      </article>
    </li>
  );
}

function olderStoriesHref(cursor: string) {
  return `/journal?after=${encodeURIComponent(cursor)}#journal-archive` as Route;
}

export function JournalArchive({
  page,
  isCursorPage,
  copy,
}: {
  page: JournalArchivePage;
  isCursorPage: boolean;
  copy: PublicContentFor<"journal">;
}) {
  return (
    <section
      id="journal-archive"
      className={styles.archiveSection}
      aria-labelledby="journal-archive-title"
    >
      <PageContainer>
        <header className={styles.archiveHeader}>
          <div>
            <p>{copy.archiveEyebrow}</p>
            <h2 id="journal-archive-title">{copy.archiveTitle}</h2>
          </div>
          <p>{copy.archiveSupport}</p>
        </header>

        {page.state === "unavailable" ? (
          <div className={styles.archiveUnavailable} role="status">
            <BookOpenIcon width={44} height={44} strokeWidth={1.4} aria-hidden />
            <div>
              <h3>{copy.unavailableTitle}</h3>
              <p>{copy.unavailableBody}</p>
              <Link href="/journal#journal-archive">
                <ArrowLeftIcon width={19} height={19} strokeWidth={1.9} aria-hidden />
                <span>{copy.newestStories}</span>
              </Link>
            </div>
          </div>
        ) : page.posts.length === 0 ? (
          <div className={styles.archiveUnavailable} role="status">
            <BookOpenIcon width={44} height={44} strokeWidth={1.4} aria-hidden />
            <div>
              <h3>{copy.emptyTitle}</h3>
              <p>{copy.emptyBody}</p>
            </div>
          </div>
        ) : (
          <ol className={styles.archiveList}>
            {page.posts.map((post) => (
              <JournalArchiveItem key={post.slug} post={post} />
            ))}
          </ol>
        )}

        {page.state === "unavailable" || page.posts.length === 0 ? null : (
          <nav className={styles.pagination} aria-label={copy.paginationLabel}>
            <div>
              {isCursorPage ? (
                <Link href="/journal#journal-archive">
                  <ArrowLeftIcon width={20} height={20} strokeWidth={1.9} aria-hidden />
                  <span>{copy.newestStories}</span>
                </Link>
              ) : (
                <span className={styles.paginationPosition}>{copy.newestStories}</span>
              )}
            </div>

            <p>
              {page.posts.length}{" "}
              {page.posts.length === 1 ? copy.storySingular : copy.storyPlural}
            </p>

            <div>
              {page.continueCursor === null ? (
                <span className={styles.paginationPosition}>{copy.endOfJournal}</span>
              ) : (
                <Link href={olderStoriesHref(page.continueCursor)}>
                  <span>{copy.olderStories}</span>
                  <ArrowRightIcon width={20} height={20} strokeWidth={1.9} aria-hidden />
                </Link>
              )}
            </div>
          </nav>
        )}
      </PageContainer>
    </section>
  );
}
