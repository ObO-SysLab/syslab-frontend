import type {ProblemOboData} from '../types';
import {registry} from '../runtime/index.mjs';
import diagramCatalog from '../runtime/diagram-contract.json';

export type CodingContract = {
  kind?: 'diagram'|'simulation'; modelVersion?:number; scenarioId?:string;
  assessmentMode?:string; inputSchema?:unknown; outputSchema?:unknown;
  ioFormat?:'json-v1'|'rr-segments-v1';
  nodes?:{id:string;type:string;fields:Record<string,string>}[]; edgeIds?:string[];
};
export const catalog:Record<string,{name:string;fields:Record<string,string>}>=diagramCatalog;

// The author preview uses the same whitelist as OboPublicContract. Never copy node data.
export function describeCodingContract(document?:ProblemOboData|null):CodingContract|null {
  if(document?.mode==='coding_diff'&&document.codingDiff){
    return {kind:'diagram',modelVersion:1,nodes:document.codingDiff.nodes.map(n=>({id:n.id,type:n.type??'',fields:{...catalog[n.type??'']?.fields}})),edgeIds:document.codingDiff.edges.map(e=>e.id)};
  }
  const simulation=document?.mode==='simulation'?document.simulation:null;
  if(simulation?.question.judgeProfile!=='obo-v1')return null;
  const q=simulation.question,instance=simulation.instances.find(i=>i.id===q.gradingInstanceId);
  if(!instance||!registry[instance.scenarioId])return null;
  const spec=registry[instance.scenarioId];
  if(q.ioFormat==='rr-segments-v1')return {kind:'simulation',modelVersion:1,scenarioId:instance.scenarioId,assessmentMode:q.assessmentMode,ioFormat:q.ioFormat};
  return {kind:'simulation',modelVersion:1,scenarioId:instance.scenarioId,assessmentMode:q.assessmentMode,inputSchema:spec.inputSchema,outputSchema:q.assessmentMode==='process'?spec.processOutputSchema:spec.resultOutputSchema};
}

export function outputSkeleton(contract?:CodingContract|null):string {
  if(contract?.ioFormat==='rr-segments-v1')return 'P1 0 2\nP2 2 3\nP1 3 4';
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
  const sample=outputSkeleton(contract),semantic=!!contract?.scenarioId;
  if(language==='python')return `import sys\n${sample?'import json\n':''}\nraw = sys.stdin.read()\n${semantic?'data = json.loads(raw)\n':''}\n# TODO: 입력을 해석하고 문제의 정답을 계산하세요.\n# 아래 출력은 형식 골격이며 정답이 아닙니다.\n${sample?`output = json.loads(${JSON.stringify(sample)})\nprint(json.dumps(output, ensure_ascii=False, separators=(",", ":")))`:'answer = ""\nprint(answer)'}\n${contract?.kind==='diagram'?'# 여러 장면은 반복문에서 JSON 한 줄씩 출력하세요.\n':''}`;
  if(language==='c')return `#include <stdio.h>\n#include <stdlib.h>\n\nint main(void) {\n    size_t length = 0, capacity = 4096;\n    char *input = malloc(capacity);\n    if (!input) return 1;\n    int ch;\n    while ((ch = getchar()) != EOF) {\n        if (length + 1 >= capacity) {\n            capacity *= 2;\n            char *next = realloc(input, capacity);\n            if (!next) { free(input); return 1; }\n            input = next;\n        }\n        input[length++] = (char)ch;\n    }\n    input[length] = '\\0';\n    /* TODO: 입력 해석과 정답 계산. JSON 파서는 포함되지 않습니다. */\n    /* 아래는 정답이 아닌 출력 형식 골격입니다. */\n    puts(${JSON.stringify(sample)});\n    free(input);\n    return 0;\n}\n`;
  return `#include <iostream>\n#include <iterator>\n#include <string>\n\nint main() {\n    std::string input((std::istreambuf_iterator<char>(std::cin)), {});\n    // TODO: 입력 해석과 정답 계산. JSON 파서는 포함되지 않습니다.\n    // 아래는 정답이 아닌 출력 형식 골격입니다.\n    std::cout << ${JSON.stringify(sample)} << '\\n';\n}\n`;
}
