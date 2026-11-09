import type {OboCodingSchema,ProblemOboData} from '../types';
import {registry} from '../runtime/index.mjs';
import {textHelp} from '../runtime/textFormats.mjs';
import diagramCatalog from '../runtime/diagram-contract.json';

export type CodingContract = {
  kind?: 'diagram'|'simulation'; modelVersion?:number; scenarioId?:string;
  assessmentMode?:string; inputSchema?:unknown; outputSchema?:unknown;
  ioFormat?:'json-v1'|'rr-segments-v1'|'text-v1';
  nodes?:{id:string;type:string;fields:Record<string,string>}[]; edgeIds?:string[];
  /** Baekjoon-style output (2026-11-08). Only the line shape is public: no IDs, labels, values or expected output. */
  outputFormat?:PublicOutputFormat;
};
/** Line shape only: cell / column counts are needed to write a line; capacities and values stay in the problem text. */
export type PublicOutputFormat = {kind:'lines-v1'; targetType:string; blank:string; cells?:number; columns?:number};

/** Mirror of the server's OboPublicContract for plain output. */
export function publicOutputFormat(schema:OboCodingSchema):PublicOutputFormat|null {
  const f=schema.outputFormat;if(!f)return null;
  const node=schema.nodes.find(n=>n.id===f.target);if(!node)return null;
  const d=node.data as Record<string,unknown>,out:PublicOutputFormat={kind:'lines-v1',targetType:node.type??'',blank:f.blank??'-'};
  if(node.type==='slot-grid')out.cells=Number.isInteger(d.slotCount)?d.slotCount as number:Array.isArray(d.slots)?d.slots.length:0;
  if(node.type==='table-grid')out.columns=Array.isArray(d.headers)&&d.headers.length?d.headers.length:Array.isArray(d.rows)&&Array.isArray(d.rows[0])?d.rows[0].length:0;
  return out;
}
/** One sentence a learner can follow. */
export function describeOutputFormat(f:PublicOutputFormat):string {
  const lead='장면마다 한 줄씩 출력합니다. ';
  switch(f.targetType){
    case 'slot-grid':return lead+`각 줄에는 칸 ${f.cells??0}개의 값을 왼쪽부터 공백 하나로 구분해 쓰고, 빈 칸은 ${f.blank}로 씁니다.`;
    case 'queue-strip':return lead+`각 줄에는 큐에 있는 항목을 먼저 꺼낼 항목부터 공백 하나로 구분해 씁니다. 비어 있으면 ${f.blank} 하나를 씁니다.`;
    case 'counter-badge':return lead+'각 줄에는 숫자 하나를 씁니다.';
    case 'resource-square':return lead+'각 줄에는 사용 중인 자원 개수 하나를 씁니다.';
    case 'text-label':return lead+'각 줄에는 그 장면의 문장을 씁니다.';
    case 'table-grid':return lead+`각 줄에는 표의 한 행(${f.columns??0}칸)을 공백 하나로 구분해 씁니다. 줄 순서가 행 순서입니다.`;
    case 'state-node':return lead+'각 줄에는 상태 이름을 씁니다. 이동을 나타내면 이전 상태와 다음 상태를 공백으로 구분해 씁니다.';
    case 'gantt-lane':return lead+'각 줄에는 실행 구간 하나를 “ID 시작 종료” 순서로 공백 하나로 구분해 씁니다.';
    case 'line-chart':return lead+'각 줄에는 점 하나를 “x y” 순서로 공백 하나로 구분해 씁니다.';
  }
  return lead;
}
const placeholderLine=(f:PublicOutputFormat)=>{
  switch(f.targetType){
    case 'slot-grid':return Array.from({length:Math.max(1,f.cells??1)},()=>'값').join(' ');
    case 'queue-strip':return '항목 항목';
    case 'table-grid':return Array.from({length:Math.max(1,f.columns??1)},()=>'값').join(' ');
    case 'state-node':return '상태 상태';
    case 'gantt-lane':return 'ID 시작 종료';
    case 'line-chart':return 'x y';
    case 'text-label':return '문장';
  }
  return '숫자';
};
/** Same comparison as the grader (grader.py compare_output): trailing spaces and blank edges ignored. */
export function sameJudgedOutput(a:string,b:string):boolean {
  const lines=(s:string)=>s.trim().split(/\r?\n/).map(l=>l.replace(/\s+$/,''));
  return JSON.stringify(lines(a))===JSON.stringify(lines(b));
}
export const catalog:Record<string,{name:string;fields:Record<string,string>}>=diagramCatalog;

// The author preview uses the same whitelist as OboPublicContract. Never copy node data.
export function describeCodingContract(document?:ProblemOboData|null):CodingContract|null {
  if(document?.mode==='coding_diff'&&document.codingDiff){
    const plain=publicOutputFormat(document.codingDiff);
    if(plain)return {kind:'diagram',modelVersion:1,outputFormat:plain};
    return {kind:'diagram',modelVersion:1,nodes:document.codingDiff.nodes.map(n=>({id:n.id,type:n.type??'',fields:{...catalog[n.type??'']?.fields}})),edgeIds:document.codingDiff.edges.map(e=>e.id)};
  }
  const simulation=document?.mode==='simulation'?document.simulation:null;
  if(simulation?.question.judgeProfile!=='obo-v1')return null;
  const q=simulation.question,instance=simulation.instances.find(i=>i.id===q.gradingInstanceId);
  if(!instance||!registry[instance.scenarioId])return null;
  const spec=registry[instance.scenarioId];
  if(q.ioFormat==='rr-segments-v1'||q.ioFormat==='text-v1')return {kind:'simulation',modelVersion:1,scenarioId:instance.scenarioId,assessmentMode:q.assessmentMode,ioFormat:q.ioFormat};
  return {kind:'simulation',modelVersion:1,scenarioId:instance.scenarioId,assessmentMode:q.assessmentMode,inputSchema:spec.inputSchema,outputSchema:q.assessmentMode==='process'?spec.processOutputSchema:spec.resultOutputSchema};
}

export function outputSkeleton(contract?:CodingContract|null):string {
  if(contract?.ioFormat==='rr-segments-v1')return 'P1 0 2\nP2 2 3\nP1 3 4';
  if(contract?.ioFormat==='text-v1')return '';
  if(contract?.outputFormat){const line=placeholderLine(contract.outputFormat);return `${line}
${line}
…`;}
  if(contract?.kind==='diagram')return JSON.stringify({v:1,overrides:{},highlightNodes:contract.nodes?.[0]?[contract.nodes[0].id]:[]});
  if(contract?.scenarioId)return JSON.stringify({v:1,result:{},...(contract.assessmentMode==='process'?{events:[]}: {})});
  return '';
}

export function starterCode(language:string,contract?:CodingContract|null):string {
  if(contract?.ioFormat==='rr-segments-v1'){
    if(language==='python')return 'n, quantum = map(int, input().split())\njobs = []\nfor _ in range(n):\n    pid, arrival, burst = input().split()\n    jobs.append((pid, int(arrival), int(burst)))\n\n# TODO: RR 순서를 계산해 (ID, 시작, 종료) 구간을 만드세요.\nsegments = []\nfor pid, start, end in segments:\n    print(pid, start, end)\n# CPU 유휴 구간의 ID는 IDLE입니다.\n';
    if(language==='c')return '#include <stdio.h>\nstruct Job { char id[33]; int arrival, burst; };\nint main(void) {\n    int n, quantum;\n    struct Job jobs[32];\n    if (scanf("%d %d", &n, &quantum) != 2 || n < 1 || n > 32) return 1;\n    for (int i = 0; i < n; ++i)\n        if (scanf("%32s %d %d", jobs[i].id, &jobs[i].arrival, &jobs[i].burst) != 3) return 1;\n    /* TODO: RR 순서를 계산하세요. 출력 예: printf("%s %d %d\\n", id, start, end); */\n    return 0;\n}\n';
    return '#include <iostream>\n#include <string>\n#include <vector>\nstruct Job { std::string id; int arrival, burst; };\nint main() {\n    int n, quantum;\n    if (!(std::cin >> n >> quantum) || n < 1 || n > 32) return 1;\n    std::vector<Job> jobs(n);\n    for (auto &job : jobs) std::cin >> job.id >> job.arrival >> job.burst;\n    // TODO: RR 순서를 계산하세요.\n    // 출력 예: std::cout << id << " " << start << " " << end << "\\n";\n}\n';
  }
  if(contract?.ioFormat==='text-v1'&&contract.scenarioId){
    // Baekjoon-style text (2026-11-08): read tokens, print one line per step; no JSON parser needed.
    const help=textHelp(contract.scenarioId),inNote=help.input,outNote=help.output;
    if(language==='python')return `import sys\n\ndata = sys.stdin.read().split()\npos = 0\ndef read():\n    global pos\n    pos += 1\n    return data[pos - 1]\n\n# 입력: ${inNote}\n# 출력: ${outNote}\n# TODO: read()로 값을 차례로 읽고, 규칙대로 계산해 한 줄씩 print 하세요.\n`;
    if(language==='c')return `#include <stdio.h>\n\nint main(void) {\n    /* 입력: ${inNote} */\n    /* 출력: ${outNote} */\n    /* TODO: scanf로 값을 읽고 규칙대로 계산해 printf로 한 줄씩 출력하세요. */\n    return 0;\n}\n`;
    return `#include <iostream>\n#include <string>\n\nint main() {\n    // 입력: ${inNote}\n    // 출력: ${outNote}\n    // TODO: std::cin >> 로 값을 읽고 규칙대로 계산해 한 줄씩 출력하세요.\n}\n`;
  }
  if(contract?.outputFormat){
    const note=describeOutputFormat(contract.outputFormat);
    if(language==='python')return `import sys

data = sys.stdin.read().split()

# TODO: 문제의 규칙대로 계산하세요.
# ${note}
scenes = []  # 장면마다 출력할 값들의 목록
for values in scenes:
    print(' '.join(str(v) for v in values))
`;
    if(language==='c')return `#include <stdio.h>

int main(void) {
    /* TODO: 입력을 읽고 문제의 규칙대로 계산하세요. */
    /* ${note} */
    /* 출력 예: printf("%d %d %d\\n", a, b, c); */
    return 0;
}
`;
    return `#include <iostream>

int main() {
    // TODO: 입력을 읽고 문제의 규칙대로 계산하세요.
    // ${note}
    // 출력 예: std::cout << a << ' ' << b << ' ' << c << '\\n';
}
`;
  }
  const sample=outputSkeleton(contract),semantic=!!contract?.scenarioId;
  if(language==='python')return `import sys\n${sample?'import json\n':''}\nraw = sys.stdin.read()\n${semantic?'data = json.loads(raw)\n':''}\n# TODO: 입력을 해석하고 문제의 정답을 계산하세요.\n# 아래 출력은 형식 골격이며 정답이 아닙니다.\n${sample?`output = json.loads(${JSON.stringify(sample)})\nprint(json.dumps(output, ensure_ascii=False, separators=(",", ":")))`:'answer = ""\nprint(answer)'}\n${contract?.kind==='diagram'?'# 여러 장면은 반복문에서 JSON 한 줄씩 출력하세요.\n':''}`;
  if(language==='c')return `#include <stdio.h>\n#include <stdlib.h>\n\nint main(void) {\n    size_t length = 0, capacity = 4096;\n    char *input = malloc(capacity);\n    if (!input) return 1;\n    int ch;\n    while ((ch = getchar()) != EOF) {\n        if (length + 1 >= capacity) {\n            capacity *= 2;\n            char *next = realloc(input, capacity);\n            if (!next) { free(input); return 1; }\n            input = next;\n        }\n        input[length++] = (char)ch;\n    }\n    input[length] = '\\0';\n    /* TODO: 입력 해석과 정답 계산. JSON 파서는 포함되지 않습니다. */\n    /* 아래는 정답이 아닌 출력 형식 골격입니다. */\n    puts(${JSON.stringify(sample)});\n    free(input);\n    return 0;\n}\n`;
  return `#include <iostream>\n#include <iterator>\n#include <string>\n\nint main() {\n    std::string input((std::istreambuf_iterator<char>(std::cin)), {});\n    // TODO: 입력 해석과 정답 계산. JSON 파서는 포함되지 않습니다.\n    // 아래는 정답이 아닌 출력 형식 골격입니다.\n    std::cout << ${JSON.stringify(sample)} << '\\n';\n}\n`;
}
