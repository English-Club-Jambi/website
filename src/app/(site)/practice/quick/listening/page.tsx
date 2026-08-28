import {
  buildQuickPracticeMetadata,
  QuickPracticeRoute,
} from "@/components/practice/quick-practice-route";

export function generateMetadata() {
  return buildQuickPracticeMetadata("listening");
}

export default function ListeningQuickPracticePage() {
  return <QuickPracticeRoute skill="listening" />;
}
