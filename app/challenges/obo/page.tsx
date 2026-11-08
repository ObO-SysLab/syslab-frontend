"use client";
import { requestJson, requestIssue, httpIssue, isRequestCancelled, authHeaders, type RequestIssue } from "@/lib/request";
import { RequestError } from "@/components/feedback/RequestError";
import { useRemoteData } from "@/components/feedback/useRemoteData";
import {DiagramOutputPlayer,type DiagramOutputRecord} from '@/components/obo/DiagramOutputPlayer';
import type {OboCodingSchema} from '@/components/obo/types';
import {problemApi,problemToken} from '@/lib/problemApi';
import { submissionVerdict, type SubmissionResult } from '@/lib/submission-status';

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Activity, ChevronLeft, Share2, CheckCircle2, XCircle, Clock } from "lucide-react";
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

  const [activeExplanation,setActiveExplanation]=useState('');
  const query=useRemoteData(submissionId||contestSubmissionId?`${submissionId}:${contestSubmissionId}`:null,async signal=>{
    const subJson=await requestJson(contestSubmissionId
      ?problemApi(`/api/challenges/obo/contest-submission?id=${contestSubmissionId}`)
      :problemApi(`/api/submissions/${submissionId}/result`),{signal,headers:authHeaders(),cache:'no-store'});
    const subData=contestSubmissionId?subJson:subJson.data;
    if(!subData)throw new Error('Missing result');
    const released=contestSubmissionId?subData.explanation:await requestJson(problemApi(`/api/challenges/obo/submission?id=${submissionId}`),{signal,headers:authHeaders(),cache:'no-store'},{allowEmpty:true});
    return {subData,released};
  });
  const isLoading=query.loading;
  const error:PageError=!submissionId&&!contestSubmissionId?'no_id':query.error?.status===409?'pending':query.data?.released?.lockedReason?'locked':null;
  const released=query.data?.released;
  const probId=query.data?.subData?.probId??null;
  const result:SubmissionResult|null=query.data?.subData??null;
  const availableAt=released?.availableAt??null;
  const legacyRevision=released?.legacyRevision??false;
  const publicCases:PublicCase[]=(released?.publicCases??[]).filter((r:{kind?:string})=>r.kind!=='diagram');
  const diagramRecords:DiagramOutputRecord[]=(released?.publicCases??[]).filter((r:{kind?:string})=>r.kind==='diagram');
  const codingSchema:OboCodingSchema|null=released?.obo?.mode==='coding_diff'?released.obo.codingDiff:null;
  const oboJson:ProblemOboData|OboBlob|null=released?.obo??null;
  const simulation=oboJson&&'mode' in oboJson&&oboJson.mode==='simulation'?oboJson.simulation??null:null;
  const selectedAnswers:number[]=Array.isArray(query.data?.subData?.selectedAnswers)?query.data!.subData.selectedAnswers:[];
  const choices:ExplanationChoice[]=released?.choices??[];
  const explanations=listOboExplanations(oboJson,selectedAnswers);
  const blob=explanations.find(item=>item.id===activeExplanation)?.blob??explanations[0]?.blob??null;
  useEffect(()=>setActiveExplanation(''),[query.data]);
  const verdict=submissionVerdict(result),isSuccess=verdict.kind==='correct';

  if(query.error&&error!=='pending')return <main className="mx-auto max-w-3xl p-8"><h1 className="text-xl font-bold">OBO 결과 조회</h1><RequestError issue={query.error} retry={query.retry} busy={query.loading}/></main>;

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

  if(error==='locked'||error==='pending')return <div className="min-h-screen bg-slate-50 p-8"><Card className="mx-auto max-w-xl space-y-3 p-8">
    <h1 className="text-xl font-bold">해설이 아직 공개되지 않았습니다.</h1>
    <p className="text-sm text-slate-600">{error==='pending'?'본인 제출의 채점이 완료되면 해설을 확인할 수 있습니다.':'참가 중인 대회가 끝나면 이 문제의 일반 학습 해설도 열립니다.'}</p>
    <Button variant="outline" onClick={query.retry}>다시 불러오기</Button>
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
            <div className="space-y-1">
              <Badge
                variant={isSuccess ? "default" : verdict.kind === "wrong" || verdict.kind === "failed" ? "destructive" : "outline"}
                className={`px-3 py-1 text-sm font-bold ${isSuccess ? "bg-indigo-600 hover:bg-indigo-700 text-white" : verdict.kind === "error" ? "border-amber-200 bg-amber-50 text-amber-800" : ""}`}
              >
                {isSuccess ? <CheckCircle2 className="w-4 h-4 mr-1.5" /> : verdict.kind === "pending" || verdict.kind === "unknown" ? <Clock className="w-4 h-4 mr-1.5" /> : <XCircle className="w-4 h-4 mr-1.5" />}
                {verdict.label}
              </Badge>
              {verdict.hint && <p className="text-xs text-slate-500">{verdict.hint}</p>}
            </div>
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
          {simulation?.question.ioFormat === 'rr-segments-v1' ? (
            publicCases.length === 0 && <p className="text-sm text-slate-500">공개된 실행 구간이 없습니다.</p>
          ) : simulation ? <SimulationPlayer document={simulation} choices={choices} selectedAnswers={selectedAnswers}/> : blob && blob.nodes.length > 0 ? (
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
