import {
  buildQuickPracticeMetadata,
  QuickPracticeRoute,
} from "@/components/practice/quick-practice-route";

export function generateMetadata() {
  return buildQuickPracticeMetadata("reading");
}

export default function ReadingQuickPracticePage() {
  return <QuickPracticeRoute skill="reading" />;
}
