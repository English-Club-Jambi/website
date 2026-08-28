import {
  buildQuickPracticeMetadata,
  QuickPracticeRoute,
} from "@/components/practice/quick-practice-route";

export function generateMetadata() {
  return buildQuickPracticeMetadata("structure");
}

export default function StructureQuickPracticePage() {
  return <QuickPracticeRoute skill="structure" />;
}
