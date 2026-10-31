'use client';
import {useEffect,useState} from 'react';
export default function ServicePreview(){
 const [session,setSession]=useState<{authorToken:string;studentToken:string;problemId:number;expiresAt:number;codingDemos?:{caseId:string;problemId:number;submissionId:number}[]}|null>(null);
 const [error,setError]=useState('');
 useEffect(()=>{if(process.env.NODE_ENV!=='development')return;fetch('/api/obo-preview-session').then(async r=>{if(!r.ok)throw Error('로컬 체험 서버가 실행 중이 아닙니다.');setSession(await r.json());}).catch(e=>setError(e.message));},[]);
 if(process.env.NODE_ENV!=='development')return null;
 const open=(token:string,url:string)=>{sessionStorage.setItem('obo:preview:token',token);location.href=url;};
 return <main className="mx-auto max-w-3xl space-y-5 p-8">
  <h1 className="text-2xl font-bold">OBO 로컬 통합 체험</h1>
  <p>실제 작성·풀이 화면과 임시 PostgreSQL을 연결합니다. 여기에서 만든 자료는 운영 서비스에 등록되지 않습니다. 출제자·학습자 전환은 이 탭에만 적용됩니다.</p>
  {error&&<p role="alert">{error}</p>}
  {session&&<>
   <p>체험 서버 종료 예정: {new Date(session.expiresAt).toLocaleString('ko-KR')}</p>
   <div className="flex flex-wrap gap-3">
    <button className="rounded-lg bg-indigo-600 px-4 py-3 text-white" onClick={()=>open(session.authorToken,`/challenges/create?id=${session.problemId}`)}>출제자로 문제 수정</button>
    <button className="rounded-lg border px-4 py-3" onClick={()=>open(session.authorToken,'/challenges/create')}>새 문제 작성</button>
    <button className="rounded-lg border px-4 py-3" onClick={()=>open(session.studentToken,`/challenges/detail?id=${session.problemId}`)}>학습자로 풀이</button>
   </div>
   <p className="text-sm text-slate-600">객관식 제출·해설 공개는 실제 서버 처리를 사용합니다. 코딩 실행기의 클라우드 작업 처리는 이 체험 서버에 연결하지 않습니다.</p>
   {!!session.codingDemos?.length&&<section className="space-y-3">
    <h2 className="text-xl font-bold">실제 Python 실행 출력 재생</h2>
    <p className="text-sm text-slate-600">격리 Linux에서 실행한 기록을 임시 DB에 보관했습니다. 재생이 채점 결과를 바꾸지 않는지 확인하기 위해 테스트 판정은 오답으로 설정했습니다.</p>
    <div className="grid grid-cols-2 gap-2">{session.codingDemos.map(d=><button key={d.caseId} className="rounded-lg border p-3 text-left" onClick={()=>open(session.studentToken,`/challenges/obo?id=${d.submissionId}`)}>{d.caseId}</button>)}</div>
   </section>}
  </>}
 </main>;
}
