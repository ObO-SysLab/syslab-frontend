"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Activity, ChevronLeft, Share2, CheckCircle2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { OboPlayer } from "@/components/obo/OboPlayer";
import { resolveOboBlob, type OboBlob, type ProblemOboData } from "@/components/obo/types";

type PageError = "no_id" | "not_found" | null;

function OboResultContent() {
  const searchParams = useSearchParams();
  const submissionId = searchParams.get("id");

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<PageError>(null);
  const [probId, setProbId] = useState<number | null>(null);
  const [isCorrect, setIsCorrect] = useState<boolean | null | undefined>(undefined);
  const [selectedChoiceIndex, setSelectedChoiceIndex] = useState<number | null>(null);
  const [blob, setBlob] = useState<OboBlob | null>(null);

  useEffect(() => {
    if (!submissionId) {
      setError("no_id");
      setIsLoading(false);
      return;
    }

    const load = async () => {
      setIsLoading(true);
      const token = localStorage.getItem("token");
      const headers: HeadersInit = { "Authorization": `Bearer ${token}` };

      try {
        // 1. 제출 결과에서 문제 ID(및 객관식이라면 선택한 보기) 확인
        const subRes = await fetch(`https://diveon.net/api/submissions/${submissionId}/result`, { headers });
        if (!subRes.ok) {
          setError("not_found");
          return;
        }
        const subJson = await subRes.json();
        const subData = subJson.data;
        setProbId(subData.probId);
        setIsCorrect(subData.isCorrect);
        let choiceIndex: number | null = null;
        if (Array.isArray(subData.selectedAnswers) && subData.selectedAnswers.length > 0) {
          choiceIndex = subData.selectedAnswers[subData.selectedAnswers.length - 1];
          setSelectedChoiceIndex(choiceIndex);
        }

        // 2. 문제에 연결된 OBO JSON 조회 (없으면 200 + null body)
        const oboRes = await fetch(`https://diveon.net/api/challenges/obo?id=${subData.probId}`, { headers });
        if (oboRes.status === 404) {
          setError("not_found");
          return;
        }
        const oboText = await oboRes.text();
        const oboJson: ProblemOboData | OboBlob | null = oboText ? JSON.parse(oboText) : null;
        setBlob(resolveOboBlob(oboJson, choiceIndex));
      } catch (e) {
        console.error("OBO 결과 로드 실패:", e);
        setError("not_found");
      } finally {
        setIsLoading(false);
      }
    };

    load();
  }, [submissionId]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (error === "no_id") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 text-slate-500 font-bold">
        유효하지 않은 접근입니다. (ID가 없습니다)
      </div>
    );
  }

  if (error === "not_found") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 text-slate-500 font-bold">
        문제를 찾을 수 없습니다.
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 py-12 px-6">
      <div className="max-w-[1000px] mx-auto space-y-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <Link href={probId ? `/challenges/detail?id=${probId}` : "/challenges"} className="group text-sm font-bold text-slate-500 hover:text-indigo-600 flex items-center gap-1 transition-colors">
              <ChevronLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
              문제 상세 페이지로 돌아가기
            </Link>
            <h1 className="text-3xl font-black tracking-tighter text-slate-900 flex items-center gap-3 mt-2">
              <Activity className="w-8 h-8 text-indigo-600" />
              OBO 시각화
            </h1>
          </div>
          <div className="flex items-center gap-2">
            {isCorrect === true && (
              <Badge className="bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1 text-sm font-bold"><CheckCircle2 className="w-4 h-4 mr-1.5" /> 정답</Badge>
            )}
            {isCorrect === false && (
              <Badge variant="destructive" className="px-3 py-1 text-sm font-bold"><XCircle className="w-4 h-4 mr-1.5" /> 오답</Badge>
            )}
            <Button variant="outline" size="sm" className="rounded-xl border-slate-200 text-slate-600 gap-2 font-bold">
              <Share2 className="w-4 h-4" /> 공유하기
            </Button>
          </div>
        </div>

        <div className="w-full max-w-4xl mx-auto">
          {blob && blob.nodes.length > 0 ? (
            <Card className="border-slate-100 shadow-xl bg-white overflow-hidden" style={{ height: 560 }}>
              <OboPlayer blob={blob} />
            </Card>
          ) : (
            <Card className="border-slate-100 shadow-sm bg-white p-12 text-center text-slate-400 font-medium">
              이 문제는 OBO 시각화 데이터가 없습니다.
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

export default function OboResultPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
      </div>
    }>
      <OboResultContent />
    </Suspense>
  );
}
