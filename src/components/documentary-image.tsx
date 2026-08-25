import Image from "next/image";
import type { CSSProperties } from "react";

import type { PublicMedia } from "@/content/media";
import { classNames } from "./ui";

type MediaStyle = CSSProperties & {
  "--media-ratio": string;
  "--media-position": string;
};

export function DocumentaryImage({
  media,
  ratio = "3 / 2",
  sizes = "(max-width: 879px) 100vw, 50vw",
  className,
  priority = false,
  decorative = false,
}: {
  media: PublicMedia;
  ratio?: string;
  sizes?: string;
  className?: string;
  priority?: boolean;
  decorative?: boolean;
}) {
  const style: MediaStyle = {
    "--media-ratio": ratio,
    "--media-position": media.focalPoint,
  };

  return (
    <div className={classNames("documentary-image", className)} style={style}>
      <Image
        src={media.src}
        alt={decorative ? "" : media.alt}
        fill
        sizes={sizes}
        priority={priority}
      />
    </div>
  );
}
