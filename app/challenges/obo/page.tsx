"use client";
import {DiagramOutputPlayer,type DiagramOutputRecord} from '@/components/obo/DiagramOutputPlayer';
import type {OboCodingSchema} from '@/components/obo/types';
import {problemApi,problemToken} from '@/lib/problemApi';

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Activity, ChevronLeft, Share2, CheckCircle2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { OboPlayer } from "@/components/obo/OboPlayer";
import { SimulationPlayer } from '@/components/obo/simulation/SimulationPlayer';
import type { SimulationDocument } from '@/components/obo/runtime/document.mjs';
import { PublicCasePlayer, type PublicCase } from '@/components/obo/simulation/PublicCasePlayer';
import type {ExplanationChoice} from '@/components/obo/simulation/explanationGroups';
import { listOboExplanations, type OboBlob, type ProblemOboData } from "@/components/obo/types";

type PageError = "no_id" | "not_found" | "locked" | "pending" | null;

function OboResultContent() {
  const searchParams = useSearchParams();
  const submissionId = searchParams.get("id");
  const contestSubmissionId = searchParams.get('contestSubmissionId');

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<PageError>(null);
  const [probId, setProbId] = useState<number | null>(null);
  const [isCorrect, setIsCorrect] = useState<boolean | null | undefined>(undefined);
  const [explanations, setExplanations] = useState<ReturnType<typeof listOboExplanations>>([]);
  const [activeExplanation, setActiveExplanation] = useState('');
  const [legacyRevision, setLegacyRevision] = useState(false);
  const [simulation,setSimulation] = useState<SimulationDocument|null>(null);
  const [publicCases,setPublicCases] = useState<PublicCase[]>([]);
  const [diagramRecords,setDiagramRecords]=useState<DiagramOutputRecord[]>([]);
  const [codingSchema,setCodingSchema]=useState<OboCodingSchema|null>(null);
  const [availableAt,setAvailableAt] = useState<string|null>(null);
  const [choices,setChoices]=useState<ExplanationChoice[]>([]);
  const [selectedAnswers,setSelectedAnswers]=useState<number[]>([]);
  const blob = explanations.find(item => item.id === activeExplanation)?.blob ?? explanations[0]?.blob ?? null;

  useEffect(() => {
    if (!submissionId && !contestSubmissionId) {
      setError("no_id");
      setIsLoading(false);
      return;
    }

    const load = async () => {
      setIsLoading(true);
      setError(null);setAvailableAt(null);
      const token = problemToken();
      const headers: HeadersInit = { "Authorization": `Bearer ${token}` };

      try {
        const subRes = await fetch(contestSubmissionId
          ? problemApi(`/api/challenges/obo/contest-submission?id=${contestSubmissionId}`)
          : problemApi(`/api/submissions/${submissionId}/result`), { headers,cache:'no-store' });
        if (!subRes.ok) {
          setError(subRes.status===409?'pending':'not_found');
          return;
        }
        const subJson = await subRes.json();
        const subData = contestSubmissionId ? subJson : subJson.data;
        setProbId(subData.probId);
        setIsCorrect(subData.isCorrect);

        // 2. 문제에 연결된 OBO JSON 조회 (없으면 200 + null body)
        let released = subData.explanation;
        if(!contestSubmissionId){
        const oboRes = await fetch(problemApi(`/api/challenges/obo/submission?id=${submissionId}`), { headers, cache: 'no-store' });
        if (!oboRes.ok) {
          setError("not_found");
          return;
        }
        const oboText = await oboRes.text();
        released = oboText ? JSON.parse(oboText) : null;
        }
        if(released?.lockedReason){setError('locked');setAvailableAt(released.availableAt??null);return;}
        setLegacyRevision(released?.legacyRevision ?? false);
        setPublicCases((released?.publicCases ?? []).filter((r:{kind?:string})=>r.kind!=='diagram'));
        setDiagramRecords((released?.publicCases ?? []).filter((r:{kind?:string})=>r.kind==='diagram'));
        setCodingSchema(released?.obo?.mode==='coding_diff'?released.obo.codingDiff:null);
        setChoices(released?.choices??[]);setSelectedAnswers(Array.isArray(subData.selectedAnswers)?subData.selectedAnswers:[]);
        const oboJson: ProblemOboData | OboBlob | null = released?.obo ?? null;
        setSimulation(oboJson && 'mode' in oboJson && oboJson.mode === 'simulation' ? oboJson.simulation ?? null : null);
        const items = listOboExplanations(oboJson, Array.isArray(subData.selectedAnswers) ? subData.selectedAnswers : []);
        setExplanations(items);
        setActiveExplanation(items[0]?.id ?? '');
      } catch (e) {
        console.error("OBO 결과 로드 실패:", e);
        setError("not_found");
      } finally {
        setIsLoading(false);
      }
    };

    load();
  }, [submissionId,contestSubmissionId]);

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
  if(error==='locked'||error==='pending')return <div className="min-h-screen bg-slate-50 p-8"><Card className="mx-auto max-w-xl space-y-3 p-8">
    <h1 className="text-xl font-bold">해설이 아직 공개되지 않았습니다.</h1>
    <p className="text-sm text-slate-600">{error==='pending'?'본인 제출의 채점이 완료되면 해설을 확인할 수 있습니다.':'참가 중인 대회가 끝나면 이 문제의 일반 학습 해설도 열립니다.'}</p>
    {availableAt&&<p className="text-sm">공개 예정: {availableAt.replace('T',' ')}</p>}
    <Link href={probId?`/challenges/detail?id=${probId}`:'/challenges'} className="text-sm text-indigo-600">문제로 돌아가기</Link>
  </Card></div>;

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
          {publicCases.length>0&&<div className="mb-8"><PublicCasePlayer records={publicCases}/></div>}
          {codingSchema&&diagramRecords.length>0&&<div className="mb-8"><DiagramOutputPlayer schema={codingSchema} records={diagramRecords}/></div>}
          {codingSchema&&blob&&<h2 className="mb-3 font-bold">출제자의 참고 출력 기록</h2>}
          {legacyRevision && <p className="mb-3 text-sm text-slate-500">이전 제출은 당시 문제 설정이 보관되지 않아 현재 등록된 해설을 보여줍니다.</p>}
          {explanations.length > 1 && <div className="mb-3 flex flex-wrap gap-2" aria-label="보기별 해설">
            {explanations.map(item => <Button key={item.id} variant={item.id === activeExplanation ? 'default' : 'outline'} onClick={() => setActiveExplanation(item.id)}>
              {item.label}{item.selected ? ' · 선택한 보기' : ''}
            </Button>)}
          </div>}
          {simulation ? <SimulationPlayer document={simulation} choices={choices} selectedAnswers={selectedAnswers}/> : blob && blob.nodes.length > 0 ? (
            <Card className="border-slate-100 shadow-xl bg-white overflow-hidden" style={{ height: 560 }}>
              <OboPlayer key={activeExplanation} blob={blob} />
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
