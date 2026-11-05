'use client';
import {useState} from 'react';
import {catalog,outputSkeleton,starterCode,type CodingContract} from '../guidance/codingContract';

type Props={contract?:CodingContract|null;inputDescription?:string;outputDescription?:string;allowedLanguages?:string[]};
export function CodingRules({contract,inputDescription,outputDescription,allowedLanguages}:Props) {
  const languages=['python','c','cpp'].filter(l=>!allowedLanguages?.length||allowedLanguages.includes(l));
  const [chosen,setChosen]=useState('python'),[copyStatus,setCopyStatus]=useState('');
  const language=languages.includes(chosen)?chosen:languages[0];
  const diagram=contract?.kind==='diagram',semantic=!!contract?.scenarioId;
  const rr=contract?.ioFormat==='rr-segments-v1';
  const skeleton=outputSkeleton(contract);
  const schema=contract?.outputSchema as {properties?:{result?:{properties?:Record<string,{type?:string;enum?:unknown[]}>;required?:string[]}}}|undefined;
  const resultSchema=schema?.properties?.result;
  return <section aria-label="코딩 제출 안내" className="my-6 space-y-4 rounded-xl border border-indigo-100 bg-indigo-50/60 p-4 text-sm text-slate-800">
    <h3 className="font-semibold text-base">입력·출력 및 제출 안내</h3>
    <p>선택한 언어의 <b>소스 코드</b>를 제출하세요. 프로그램은 표준 입력(stdin)을 읽고 표준 출력(stdout)에 답을 출력합니다. 안내 문구나 디버그 로그를 답과 함께 출력하지 마세요.</p>
    <div className="grid gap-4 md:grid-cols-2">
      <div><h4 className="font-semibold">입력 형식</h4><p className="mt-1 whitespace-pre-wrap break-words">{inputDescription?.trim()||'출제자가 입력 설명을 작성하지 않았습니다. 본문과 공개 예제를 확인하세요.'}</p></div>
      <div><h4 className="font-semibold">출력 형식</h4><p className="mt-1 whitespace-pre-wrap break-words">{outputDescription?.trim()||'출제자가 출력 설명을 작성하지 않았습니다. 본문과 공개 예제를 확인하세요.'}</p></div>
    </div>
    <div className="rounded-lg bg-white p-3 space-y-2">
      <h4 className="font-semibold">채점 방식 · {rr?'RR 실행 구간 검사':semantic?(contract?.assessmentMode==='process'?'결과와 과정 검사':'최종 결과 검사'):'기존 출력 비교'}</h4>
      {rr?<div className="space-y-2">
        <p>입력 첫 줄은 <code>N Q</code>(프로세스 수·시간 할당량), 다음 N줄은 <code>ID 도착시각 CPU실행량</code>입니다. 출력은 한 줄에 <code>ID 시작 종료</code>입니다. JSON이나 화면 설정은 출력하지 않습니다.</p>
        <p>시간은 0부터 시작하고 종료 시각은 구간에 포함하지 않습니다. 유휴 구간은 ID를 <code>IDLE</code>로 적으세요. 모든 구간을 빈틈이나 겹침 없이 순서대로 출력합니다.</p>
        <p>같은 시각 도착은 입력 순서대로 처리합니다. 할당량이 끝나는 시각에 새로 도착한 프로세스를 먼저 큐에 넣고, 실행하던 프로세스를 뒤에 넣습니다. I/O는 없습니다.</p>
        <p>인접한 같은 프로세스 구간은 합치거나 나누어 출력해도 됩니다. 여러 공백·탭·빈 줄은 허용합니다. 대기·응답·반환 시간은 답안에 요구하지 않습니다.</p>
        <p className="text-xs">N 1~32, Q 1~2000, 도착 0~2000, 실행량 1~2000. 최대 도착시각+총 실행량 ≤ 2000. ID는 영문자로 시작하는 영숫자·밑줄·하이픈 32자 이하이며 중복 또는 예약 ID는 허용하지 않습니다. 출력은 1MiB·4096구간 이하입니다.</p>
      </div>:semantic?<><p>입력은 모델 설정 JSON입니다. 출력은 <code>v: 1</code>과 <code>result</code>를 가진 JSON 객체 하나입니다.{contract?.assessmentMode==='process'?' events 배열에 필수 사건 기록도 넣어야 합니다.':' 최종 결과가 올바른지 검사합니다.'} 모델: {contract?.scenarioId}</p>
        <p>배치와 색상은 채점하지 않습니다. 기록은 프로그램이 직접 출력해야 하며 변수나 명령을 자동 추적하지 않습니다.</p>
        {!!resultSchema?.properties&&<div className="overflow-x-auto"><table className="w-full text-left text-xs"><caption className="text-left font-medium py-2">result에 출력할 필드</caption><thead><tr><th className="p-1">이름</th><th>자료형</th><th>필수</th></tr></thead><tbody>{Object.entries(resultSchema.properties).map(([key,value])=><tr key={key} className="border-t"><td className="p-1 font-mono">{key}</td><td>{value.enum?value.enum.join(' / '):value.type??'상세 형식 참고'}</td><td>{resultSchema.required?.includes(key)?'필수':'선택'}</td></tr>)}</tbody></table></div>}
        <details><summary className="cursor-pointer font-medium">상세 입력·출력 형식 보기</summary><p className="mt-2">입력 JSON Schema</p><pre className="max-h-72 overflow-auto bg-slate-50 p-3 text-xs">{JSON.stringify(contract?.inputSchema,null,2)}</pre><p>출력 JSON Schema</p><pre className="max-h-72 overflow-auto bg-slate-50 p-3 text-xs">{JSON.stringify(contract?.outputSchema,null,2)}</pre></details>
      </>:<p>기대 출력과 줄 단위로 비교합니다. 줄 안의 공백과 JSON 키 순서도 비교 대상이므로 공개 예제의 형식을 따르세요. 그림의 재생 성공이나 화면의 유사도만으로 정답 처리하지 않습니다.</p>}
    </div>
    {diagram&&<div className="space-y-3 rounded-lg bg-white p-3">
      <h4 className="font-semibold">그림 재생 출력 · 한 줄에 한 장면(JSONL)</h4>
      <p><code>v</code>는 1, <code>overrides</code>는 요소 ID별 변경 값, <code>highlightNodes</code>는 강조할 요소 ID 배열입니다. <code>visibleEdges</code>는 표시할 연결선 ID 배열이며 생략하면 모든 연결선을 표시합니다.</p>
      <p>일반 값은 다음 장면에 이어집니다. 강조는 장면마다 지정하세요. 간트의 activeBlockIndex, 슬롯의 fault/hit/active/pointer 인덱스, 카운터의 delta는 다음 장면에서 초기화됩니다. 출력은 최대 1MiB·1000장면입니다.</p>
      <p>기존 한 줄 토큰 형식도 지원합니다. 새 요소나 여러 필드·공백 있는 값은 JSONL을 사용하세요. 인덱스는 0부터 시작합니다. 필요한 초기 조건·칸 수·필드 간 관계는 문제 본문을 따르세요.</p>
      <div className="overflow-x-auto"><table className="w-full text-left text-xs"><caption className="text-left font-medium py-2">이 문제의 공개 요소·허용 필드</caption><thead><tr><th className="p-2">요소 ID / 종류</th><th className="p-2">출력 가능한 필드</th></tr></thead><tbody>{contract?.nodes?.map(n=><tr key={n.id} className="border-t align-top"><td className="p-2 break-all"><code>{n.id}</code><br/>{catalog[n.type]?.name??n.type}</td><td className="p-2"><details><summary className="cursor-pointer break-words">{Object.keys(n.fields).join(', ')||'강조만 지원'}</summary><dl className="mt-2 space-y-2">{Object.entries(n.fields).map(([field,description])=><div key={field}><dt className="font-mono font-semibold">{field}</dt><dd className="whitespace-pre-wrap break-words">{description}</dd></div>)}</dl></details></td></tr>)}</tbody></table></div>
      <p className="break-all">연결선 ID: {contract?.edgeIds?.join(', ')||'없음'}</p>
    </div>}
    {skeleton&&<div><h4 className="font-semibold">출력 구조 예시 — 정답이 아닙니다</h4><pre className="mt-2 overflow-auto rounded bg-white p-3 text-xs">{skeleton}</pre><p className="mt-1 text-xs">{rr?'ID와 시간은 문제 입력을 계산한 결과로 바꾸세요.':diagram?'첫 요소를 강조하는 문법 예시입니다. 계산한 값은 overrides에 넣으세요.':'빈 result와 events는 형식 골격입니다. 상세 형식에 맞는 결과와 필요한 기록으로 채워야 합니다.'}</p></div>}
    {language&&<details><summary className="cursor-pointer font-semibold">언어별 시작 코드</summary>
      <p className="my-2 text-xs">입출력 골격이며 문제 풀이·JSON 해석 알고리즘을 제공하지 않습니다. C/C++에는 외부 JSON 라이브러리가 포함되지 않습니다. 기존 편집기의 코드는 자동으로 바꾸지 않습니다.</p>
      <div className="flex flex-wrap gap-2 items-center"><label>언어 <select aria-label="시작 코드 언어" value={language} onChange={e=>{setChosen(e.target.value);setCopyStatus('');}} className="rounded border bg-white p-1">{languages.map(l=><option key={l} value={l}>{l==='cpp'?'C++':l==='c'?'C':'Python'}</option>)}</select></label><button type="button" className="rounded border bg-white px-3 py-1" onClick={async()=>{try{await navigator.clipboard.writeText(starterCode(language,contract));setCopyStatus('시작 코드를 복사했습니다.');}catch{setCopyStatus('복사할 수 없습니다. 아래 코드에서 직접 선택해 복사하세요.');}}}>시작 코드 복사</button><span role="status">{copyStatus}</span></div>
      <pre className="mt-2 max-h-96 overflow-auto rounded bg-white p-3 text-xs">{starterCode(language,contract)}</pre>
    </details>}
  </section>;
}
