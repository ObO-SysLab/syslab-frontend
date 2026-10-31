export function CodingRules({contract}:{contract?:{scenarioId:string;assessmentMode:string;inputSchema:unknown;outputSchema:unknown}|null}) {
  if(!contract)return null;
  return <section className="my-6 rounded-xl border border-indigo-100 bg-indigo-50 p-4 text-sm">
    <h3 className="font-semibold">시뮬레이션 코딩 규칙 · {contract.scenarioId}</h3>
    <p className="mt-2">표준 입력으로 모델 설정 JSON을 읽고, 표준 출력에 JSON 객체 하나를 출력하세요. {contract.assessmentMode==='process'?'최종 결과와 의미 있는 사건 기록을 함께 검증합니다.':'최종 결과를 검증합니다.'} 화면의 배치와 색상은 채점하지 않습니다.</p>
    <p className="mt-1">출력한 기록은 프로그램이 보고한 과정입니다. 실행 중인 변수나 명령을 자동으로 추적한 기록은 아닙니다.</p>
    <details className="mt-3"><summary className="cursor-pointer font-medium">입력·출력 형식 보기</summary>
      <p className="mt-2">입력</p><pre className="max-h-72 overflow-auto rounded bg-white p-3 text-xs">{JSON.stringify(contract.inputSchema,null,2)}</pre>
      <p className="mt-2">출력</p><pre className="max-h-72 overflow-auto rounded bg-white p-3 text-xs">{JSON.stringify(contract.outputSchema,null,2)}</pre>
    </details>
  </section>;
}
