import Image from "next/image";
import type { CSSProperties } from "react";

import { DocumentaryImage } from "@/components/documentary-image";
import { getMedia } from "@/content/media";
import type { PublicJournalMedia } from "@/lib/journal";

import { classNames } from "../ui";

type MediaStyle = CSSProperties & {
  "--media-ratio": string;
  "--media-position": string;
};

export function JournalCover({
  coverKey,
  coverMedia,
  ratio = "4 / 3",
  sizes = "(max-width: 879px) 100vw, 34vw",
  className,
  priority = false,
  decorative = false,
}: {
  coverKey?: string;
  coverMedia?: PublicJournalMedia;
  ratio?: string;
  sizes?: string;
  className?: string;
  priority?: boolean;
  decorative?: boolean;
}) {
  if (coverMedia !== undefined) {
    const style: MediaStyle = {
      "--media-ratio": ratio,
      "--media-position": "50% 50%",
    };
    return (
      <div className={classNames("documentary-image", className)} style={style}>
        <Image
          src={coverMedia.publicUrl}
          alt={decorative ? "" : coverMedia.alt}
          fill
          sizes={sizes}
          priority={priority}
        />
      </div>
    );
  }

  const localCover = getMedia(coverKey);
  return localCover === undefined ? null : (
    <DocumentaryImage
      media={localCover}
      ratio={ratio}
      sizes={sizes}
      className={className}
      priority={priority}
      decorative={decorative}
    />
  );
}
