import { Lightbulb } from "lucide-react";
import { ProblemText } from "./ProblemText";

/** Author hint of a practice problem, closed until the learner opens it (2026-11-13). */
export function PracticeHint({ hint }: { hint?: string | null }) {
  if (!hint?.trim()) return null;
  return (
    <details className="group mt-6 rounded-2xl border border-line bg-panel p-4" data-practice-hint>
      <summary className="flex cursor-pointer list-none items-center gap-2 text-sm font-bold text-ink [&::-webkit-details-marker]:hidden">
        <Lightbulb className="h-4 w-4 text-warning" aria-hidden="true" /> 힌트 보기
      </summary>
      <ProblemText className="mt-3 space-y-2 text-sm text-ink-muted" text={hint} />
    </details>
  );
}
