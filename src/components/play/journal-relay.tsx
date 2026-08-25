"use client";

import { ArrowUpRightIcon } from "@heroicons/react/24/outline";
import type { Route } from "next";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import { JournalCover } from "@/components/journal/journal-cover";
import { getMedia } from "@/content/media";
import { formatPublishedDate, type PublicPost } from "@/lib/journal";

import styles from "./play.module.css";

export function JournalRelay({
  posts,
  headingLevel = 3,
}: {
  posts: PublicPost[];
  headingLevel?: 2 | 3;
}) {
  const [activeIndex, setActiveIndex] = useState(0);
  const itemRefs = useRef<Array<HTMLElement | null>>([]);
  const active = posts[activeIndex];
  const activeHasMedia =
    active?.coverMedia !== undefined || getMedia(active?.coverKey) !== undefined;
  const Heading = headingLevel === 2 ? "h2" : "h3";

  useEffect(() => {
    const wideLayout = window.matchMedia("(min-width: 1120px)");
    let observer: IntersectionObserver | undefined;
    let animationFrame = 0;

    const updateFromReadingLine = () => {
      const readingLine = window.innerHeight * 0.34;
      const candidates = itemRefs.current
        .map((element, index) => {
          const bounds = element?.getBoundingClientRect();

          if (!bounds || bounds.bottom <= 0 || bounds.top >= window.innerHeight) {
            return null;
          }

          const distance =
            bounds.top <= readingLine && bounds.bottom >= readingLine
              ? 0
              : Math.min(
                  Math.abs(bounds.top - readingLine),
                  Math.abs(bounds.bottom - readingLine),
                );

          return { index, distance };
        })
        .filter((candidate): candidate is { index: number; distance: number } =>
          Boolean(candidate),
        )
        .sort((a, b) => a.distance - b.distance || a.index - b.index);

      if (candidates[0]) {
        setActiveIndex(candidates[0].index);
      }
    };

    const scheduleReadingLineUpdate = () => {
      if (animationFrame) {
        return;
      }

      animationFrame = window.requestAnimationFrame(() => {
        animationFrame = 0;
        updateFromReadingLine();
      });
    };

    function connectObserver() {
      observer?.disconnect();
      window.removeEventListener("scroll", scheduleReadingLineUpdate);
      window.removeEventListener("resize", scheduleReadingLineUpdate);

      if (!wideLayout.matches) {
        return;
      }

      observer = new IntersectionObserver(scheduleReadingLineUpdate, {
        threshold: [0, 0.2, 0.4, 0.6, 0.8, 1],
      });
      itemRefs.current.forEach((item) => {
        if (item) {
          observer?.observe(item);
        }
      });
      window.addEventListener("scroll", scheduleReadingLineUpdate, { passive: true });
      window.addEventListener("resize", scheduleReadingLineUpdate);
      updateFromReadingLine();
    }

    connectObserver();
    wideLayout.addEventListener("change", connectObserver);

    return () => {
      observer?.disconnect();
      window.removeEventListener("scroll", scheduleReadingLineUpdate);
      window.removeEventListener("resize", scheduleReadingLineUpdate);
      wideLayout.removeEventListener("change", connectObserver);
      if (animationFrame) {
        window.cancelAnimationFrame(animationFrame);
      }
    };
  }, [posts.length]);

  return (
    <div className={styles.journalRelay}>
      <div className={styles.journalList}>
        {posts.map((post, index) => {
          const href = `/journal/${post.slug}` as Route;

          return (
            <article
              key={post.slug}
              ref={(element) => {
                itemRefs.current[index] = element;
              }}
              className={styles.journalItem}
              data-active={activeIndex === index ? "true" : "false"}
              data-journal-index={index}
              onPointerDown={() => setActiveIndex(index)}
              onFocusCapture={() => setActiveIndex(index)}
            >
              <p className={styles.journalMeta}>
                <span>{post.category}</span>
                <time dateTime={new Date(post.publishedAt).toISOString()}>
                  {formatPublishedDate(post.publishedAt)}
                </time>
              </p>
              <Heading className={styles.journalTitle}>
                <Link href={href}>
                  <span>{post.title}</span>
                  <ArrowUpRightIcon width={28} height={28} strokeWidth={2} aria-hidden />
                </Link>
              </Heading>
              <p className={styles.journalExcerpt}>{post.excerpt}</p>
            </article>
          );
        })}
      </div>

      <figure
        className={styles.journalPreview}
        data-journal-preview
        aria-hidden="true"
      >
        <div key={active?.slug} className={styles.journalPreviewContent}>
          {activeHasMedia ? (
            <div className={styles.journalPreviewImage}>
              <JournalCover
                coverKey={active?.coverKey}
                coverMedia={active?.coverMedia}
                ratio="4 / 3"
                sizes="(max-width: 1119px) 1px, 34vw"
                decorative
              />
            </div>
          ) : null}
          <figcaption className={styles.journalPreviewCaption}>
            <span>{active?.category}</span>
            <strong>{active?.title}</strong>
          </figcaption>
        </div>
      </figure>
    </div>
  );
}
