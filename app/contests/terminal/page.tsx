"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { PracticeLab } from "@/components/practice/PracticeLab";

function ContestPractice() {
  const searchParams = useSearchParams();
  const probId = Number(searchParams.get("probId"));
  const contestProbId = searchParams.get("contestProblemId");
  const contestId = searchParams.get("contestId");
  const problemHref = `/contests/challenge/?probId=${probId}&contestProblemId=${contestProbId}&contestId=${contestId}`;

  // The contest submit API answers with the verdict directly.
  const submitFlag = async (answer: string, token: string | null) => {
    const response = await fetch(`https://diveon.net/api/contests/${contestId}/problems/${contestProbId}/submit`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ submissionType: "PRACTICE", answer }),
    });
    const json = await response.json().catch(() => null);
    if (!response.ok) throw new Error(`제출하지 못했습니다: ${json?.message || "잠시 후 다시 시도해 주세요."}`);
    const verdict = json?.data?.isCorrect;
    return typeof verdict === "boolean" ? verdict : null;
  };

  return (
    <PracticeLab probId={probId} activeMenu="contest" checkBuild={false} submitFlag={submitFlag}
      exitHref={problemHref} doneHref={problemHref} />
  );
}

export default function PracticePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-canvas">
        <div className="w-10 h-10 border-4 border-primary/30 border-t-primary rounded-full animate-spin"></div>
      </div>
    }>
      <ContestPractice />
    </Suspense>
  );
}
