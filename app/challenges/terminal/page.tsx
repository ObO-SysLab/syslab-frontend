"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { PracticeLab } from "@/components/practice/PracticeLab";
import { rememberSubmission } from "@/lib/authSession";
import { readFlagResult } from "@/lib/practice-session";

function ChallengePractice() {
  const probId = Number(useSearchParams().get("id") || "1");

  // Practice grading finishes inside the submit request; the result says whether the flag was right.
  const submitFlag = async (answer: string, token: string | null) => {
    const response = await fetch("https://diveon.net/api/submissions/grade", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ probId, submissionType: "practice", answer, containerId: null }),
    });
    const json = await response.json().catch(() => null);
    if (!response.ok) throw new Error(`제출하지 못했습니다: ${json?.message || "잠시 후 다시 시도해 주세요."}`);
    const submissionId = json?.data?.submissionId;
    if (!submissionId) return null;
    rememberSubmission(String(probId), submissionId, token);
    return readFlagResult(Number(submissionId), token);
  };

  return (
    <PracticeLab probId={probId} activeMenu="challenge" checkBuild submitFlag={submitFlag}
      exitHref={`/challenges/detail?id=${probId}`} doneHref={`/challenges/detail?id=${probId}&tab=grading`} />
  );
}

export default function PracticePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-canvas">
        <div className="w-10 h-10 border-4 border-primary/30 border-t-primary rounded-full animate-spin"></div>
      </div>
    }>
      <ChallengePractice />
    </Suspense>
  );
}
