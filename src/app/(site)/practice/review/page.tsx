import type { Metadata } from "next";

import { SharedReviewEntry } from "@/components/practice/result-view";

export const metadata: Metadata = {
  title: "Private practice review",
  description: "A private English Club Full Practice result and answer review.",
  robots: { index: false, follow: false, nocache: true },
  referrer: "no-referrer",
};

export default function SharedPracticeReviewPage() {
  return <SharedReviewEntry />;
}
