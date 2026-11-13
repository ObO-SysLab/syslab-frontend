import type { Node, Edge } from '@xyflow/react';
import type { OBOTemplate } from '../templates';
import type { Frame, OboBlob } from '../types';
import type { MemorySegment } from './memory';

const node = (id: string, type: string, x: number, y: number, data: Record<string, unknown>): Node => ({ id, type, position: { x, y }, data });
const box = (id: string, x: number, y: number, label: string) => node(id, 'state-node', x, y, { label, shape: 'box', fill: '#4f46e5' });
const text = (id: string, x: number, y: number, value: string) => node(id, 'text-label', x, y, { text: value, variant: 'plain' });
const count = (id: string, x: number, y: number, label: string, value: number) => node(id, 'counter-badge', x, y, { label, value });
const edge = (id: string, source: string, target: string, label = '', sourceHandle = 'r', targetHandle = 'l'): Edge => ({
  id, source, target, sourceHandle, targetHandle, type: 'obo-edge', data: { label, direction: 'forward', style: 'solid', role: 'transition' },
});
const frame = (id: string, label: string, overrides: Frame['nodeDataOverrides'] = {}, highlightNodes: string[] = [], highlightEdges: string[] = [], visibleEdges?: string[]): Frame => ({
  id, label, nodeDataOverrides: overrides, highlightNodes, highlightEdges, ...(visibleEdges === undefined ? {} : { visibleEdges }),
});
export interface TeachingExample { slug: string; title: string; subtitle: string; legend: string; note: string; template: OBOTemplate; }

const bufferStates = [[], ['A'], [], ['B'], ['B','C'], ['B','C'], ['C'], ['C','D'], ['D'], []];
const bufferLabels = [
  '빈 버퍼 · 소비자는 꺼낼 항목이 없어 기다립니다. 생산자는 진행할 수 있습니다.',
  'A 생산 · A를 넣고 소비자에게 알립니다. 소비자가 다시 진행할 수 있습니다.',
  'A 소비 · 먼저 들어온 A를 꺼냅니다. 버퍼가 다시 비었습니다.',
  'B 생산 · 다음 항목 B가 들어옵니다. 아직 한 칸이 남았습니다.',
  'C 생산 · B 다음에 C가 들어와 두 칸이 모두 찼습니다.',
  '생산 대기 · D를 넣으려 하지만 빈칸이 없습니다. 버퍼의 B, C는 그대로입니다.',
  'B 소비 · 먼저 들어온 B를 꺼내 빈칸을 만듭니다. 기다리던 생산자가 진행할 수 있습니다.',
  '생산 재개 · 남은 C 뒤에 D를 넣습니다. 다음에 꺼낼 항목은 C입니다.',
  'C 소비 · 들어온 순서대로 C를 꺼냅니다. D 하나가 남습니다.',
  'D 소비 · 마지막 항목을 꺼냈습니다. 이 예제의 생산·소비가 끝났습니다.',
];
export const PRODUCER_CONSUMER: TeachingExample = {
  slug: 'producer-consumer', title: '비었을 때, 가득 찼을 때는 누가 기다릴까?',
  subtitle: '두 칸짜리 버퍼에서 생산과 소비가 서로를 다시 진행시키는 과정을 봅니다.',
  legend: 'empty: 넣기 허용 · full: 꺼내기 허용 · 점선 항목: 아직 버퍼에 넣지 않은 값',
  note: '각 장면은 작업 완료 또는 대기 시점입니다. 버퍼 변경은 mutex로 보호합니다. 빈칸·항목 대기는 mutex를 잡기 전에 합니다. 중간 예약 상태는 생략했습니다.',
  template: { id: 'C1', name: '생산자·소비자', category: 'sync', description: '버퍼 · 대기와 재개',
    defaultNodes: [box('producer', 10, 210, '생산자'), node('buffer', 'queue-strip', 260, 160, { label: '공유 버퍼', capacity: 2, items: [], direction: 'rtl', displayStyle: 'buffer', showCount: true, showDirection: true }), box('consumer', 760, 210, '소비자'),
      node('empty','counter-badge',260,30,{label:'empty',caption:'넣기 허용',value:2,min:0,max:64,displayStyle:'semaphore',showTokens:true}),
      node('full','counter-badge',446,30,{label:'full',caption:'꺼내기 허용',value:0,min:0,max:64,displayStyle:'semaphore',showTokens:true}),
      node('p-status','text-label',10,300,{text:'준비',variant:'status'}),node('c-status','text-label',760,300,{text:'⏸ 항목 대기',variant:'status'}),
      node('pending','text-label',165,140,{text:'',variant:'item',caption:'넣을 항목',color:'#b45309'})],
    defaultEdges: [edge('put', 'producer', 'buffer', '넣기'), edge('take', 'buffer', 'consumer', '꺼내기')],
    defaultFrames: bufferStates.map((items, i) => frame(`pc-${i}`, bufferLabels[i], {
      buffer: { items }, empty: { value: 2 - items.length }, full: { value: items.length },
      'p-status': { text: i === 5 ? '⏸ 빈칸 대기' : i === 6 ? '▶ 재개 가능' : i >= 7 ? '생산 완료' : items.length === 2 ? '빈칸 없음' : '준비' },
      'c-status': { text: i === 0 ? '⏸ 항목 대기' : i === 9 ? '소비 완료' : items.length === 0 ? '항목 없음' : '준비' },
      pending: { text: i === 5 || i === 6 ? 'D' : '' },
    }, i === 0 || i === 5 ? [] : ['buffer', [1,3,4,7].includes(i) ? 'producer' : 'consumer'],
    i === 0 || i === 5 ? [] : [[1,3,4,7].includes(i) ? 'put' : 'take'], i === 0 ? ['put'] : i === 5 ? ['take'] : ['put','take'])),
  },
};

const pageRows = [[0,1,'있음'], [2,5,'있음'], [3,'—','없음']];
const tlbEmpty = [[0,1], ['—','—']], tlbFilled = [[0,1], [2,5]];
export const ADDRESS_TRANSLATION: TeachingExample = {
  slug: 'address-translation', title: '가상 주소 9는 실제 어디를 가리킬까?',
  subtitle: '페이지 번호와 내부 위치를 나누고 TLB와 페이지 표에서 실제 위치를 찾습니다.',
  legend: '페이지 크기 4 · VPN = 페이지 번호 · PFN = 물리 프레임 번호',
  note: 'TLB Miss는 변환 기록이 없는 것이고 페이지 Miss는 페이지가 메모리에 없는 것입니다. 이 예제는 한 프로세스의 올바른 접근 권한을 가정합니다. 페이지 Miss를 처리하기 전에 멈춥니다.',
  template: { id: 'TLB', name: '주소 변환 · TLB', category: 'memory', description: 'TLB Hit · TLB Miss · 페이지 Miss',
    defaultNodes: [node('address','table-grid',0,0,{ label:'가상 주소 나누기', headers:['가상 주소','VPN','내부 위치'], rows:[[9,2,1]], width:300 }),
      box('physical', 390, 15, '물리 주소 · 아직 없음'),
      node('tlb','table-grid',0,170,{ label:'TLB · 변환 기록', headers:['VPN','PFN'], rows:tlbEmpty, width:280, activeRow:null }),
      node('pages','table-grid',390,170,{ label:'페이지 표', headers:['VPN','PFN','메모리 상주'], rows:pageRows, width:300, activeRow:null })],
    defaultEdges: [edge('lookup','address','tlb','조회','b','t'), edge('miss','tlb','pages','Miss'), edge('translate','pages','physical','변환','t','b'), edge('hit','tlb','physical','Hit','r','l')],
    defaultFrames: [
      frame('tlb-0','주소 분해 · 9 = 2 × 4 + 1입니다. 페이지 2의 안쪽 위치 1을 찾습니다.',{},['address'],[],[]),
      frame('tlb-1','TLB Miss · 페이지 2의 기록이 없습니다. 페이지 표를 확인해야 합니다.',{tlb:{activeRow:null}},['tlb'],['lookup'],['lookup']),
      frame('tlb-2','페이지 표 확인 · 페이지 2는 프레임 5에 이미 있습니다. 페이지 Miss가 아닙니다.',{pages:{activeRow:1}},['pages'],['miss'],['lookup','miss']),
      frame('tlb-3','주소 변환 · 프레임 5 × 페이지 크기 4 + 내부 위치 1 = 물리 주소 21입니다.',{physical:{label:'물리 주소 21'}},['physical'],['translate'],['lookup','miss','translate']),
      frame('tlb-4','기록 보관 · 다음 접근을 위해 페이지 2 → 프레임 5를 TLB에 넣습니다.',{tlb:{rows:tlbFilled,activeRow:1},pages:{activeRow:null}},['tlb'],[],['lookup','miss','translate']),
      frame('tlb-5','다음 주소 · 10 = 2 × 4 + 2입니다. 같은 페이지의 다른 위치를 찾습니다.',{address:{rows:[[10,2,2]]},physical:{label:'물리 주소 · 조회 중'},tlb:{activeRow:null}},['address'],['lookup'],['lookup']),
      frame('tlb-6','TLB Hit · 2 → 5 기록으로 바로 변환합니다. 5 × 4 + 2 = 물리 주소 22입니다.',{tlb:{activeRow:1},physical:{label:'물리 주소 22'}},['tlb','physical'],['hit'],['lookup','hit']),
      frame('tlb-7','페이지 Miss · 주소 12의 페이지 3은 TLB에도, 현재 메모리에도 없습니다. 적재 전에는 물리 주소를 만들 수 없습니다.',{address:{rows:[[12,3,0]]},tlb:{activeRow:null},pages:{activeRow:2},physical:{label:'페이지 Miss · 적재 필요'}},['pages'],['miss'],['lookup','miss']),
    ],
  },
};

export const FRAGMENTED: MemorySegment[] = [
  {id:'a',start:0,size:4,label:'A'}, {id:'hole1',start:4,size:3,label:'빈 공간',free:true},
  {id:'b',start:7,size:4,label:'B'}, {id:'hole2',start:11,size:3,label:'빈 공간',free:true}, {id:'c',start:14,size:2,label:'C'},
];
export const COALESCED: MemorySegment[] = [{id:'a',start:0,size:4,label:'A'}, {id:'hole',start:4,size:10,label:'빈 공간',free:true}, {id:'c',start:14,size:2,label:'C'}];
export const ALLOCATED: MemorySegment[] = [{id:'a',start:0,size:4,label:'A'}, {id:'d',start:4,size:5,label:'D'}, {id:'hole',start:9,size:5,label:'빈 공간',free:true}, {id:'c',start:14,size:2,label:'C'}];
export const MEMORY_FRAGMENTATION: TeachingExample = {
  slug:'memory-fragmentation', title:'빈칸이 6개인데, 왜 5개를 못 줄까?', subtitle:'총 여유 공간과 연속된 여유 공간의 차이를 주소 길이에 맞춰 비교합니다.',
  legend:'색 구간: 사용 중 · 점선 구간: 빈 공간 · 아래 숫자: 주소 경계',
  note:'연속 할당과 외부 단편화 예제입니다. B를 해제한 뒤 맞닿은 빈 공간만 합칩니다. 기존 A와 C를 이동하거나 메모리를 압축하지 않습니다.',
  template: { id:'MF', name:'메모리 할당 · 단편화', category:'memory', description:'총 여유와 연속 공간',
    defaultNodes:[node('memory','memory-range',0,75,{ label:'메모리 · 주소 0 이상 16 미만',start:0,size:16,segments:FRAGMENTED,activeIds:[] }), box('request',0,-30,'요청 D · 연속 5칸'),text('result',270,-5,'여유 공간을 확인합니다.')], defaultEdges:[],
    defaultFrames:[
      frame('mf-0','초기 배치 · A와 B, C 사이에 3칸짜리 빈 공간이 두 곳 있습니다.',{},['memory']),
      frame('mf-1','요청 D · 총 빈 공간은 3 + 3 = 6칸입니다. 하지만 가장 큰 한 덩어리는 3칸입니다.',{memory:{activeIds:['hole1','hole2']},result:{text:'총 여유 6칸 · 최대 연속 3칸'}},['request','memory']),
      frame('mf-2','할당 실패 · D는 연속 5칸이 필요합니다. 떨어진 3칸 두 개를 이어 줄 수 없습니다.',{result:{text:'실패 · 연속된 5칸이 없습니다.'}},['request']),
      frame('mf-3','B 해제 · B의 4칸을 반환하면 인접한 빈 공간 3 + 4 + 3을 10칸으로 합칠 수 있습니다.',{memory:{segments:COALESCED,activeIds:['hole']},result:{text:'인접 여유 병합 · 연속 10칸'}},['memory']),
      frame('mf-4','D 할당 · 주소 4부터 9 직전까지 5칸을 줍니다. 뒤에는 연속 5칸이 남습니다.',{memory:{segments:ALLOCATED,activeIds:['d']},result:{text:'성공 · D는 [4, 9) 사용'}},['memory']),
      frame('mf-5','완료 · 총 여유 5칸과 최대 연속 공간 5칸이 같습니다. A와 C의 위치는 그대로입니다.',{memory:{activeIds:[]},result:{text:'남은 연속 여유 · [9, 14)'}},[]),
    ],
  },
};

const sections = (x: number) => [{name:'코드',value:'공통 함수',shared:true},{name:'데이터',value:`x = ${x}`,shared:true},{name:'힙',value:'공유 객체',shared:true}];
const threads = (step: number) => [
  {id:'t1',label:'T1',pc:step >= 1 ? '다음 명령' : 'x 쓰기',register:step >= 1 ? '1' : '0',stack:step >= 1 ? '지역값 7' : '지역값 0'},
  {id:'t2',label:'T2',pc:step >= 2 ? '읽기 완료' : 'x 읽기',register:step >= 2 ? '1' : '0',stack:'지역값 9'},
];
const processPresentation = { hiddenSectionNames: ['코드', '힙'], threadFields: ['register', 'stack'], threadLayout: 'row', sectionLayout: 'row', showSharedLinks: true };
export const PROCESS_THREADS: TeachingExample = {
  slug:'process-threads',title:'같이 쓰는 값과, 각자 갖는 값은 무엇일까?',subtitle:'프로세스 경계 안의 공유 공간과 스레드별 실행 문맥을 나란히 봅니다.',
  legend:'연결선: 같은 공유 영역 사용 · 점선: 현재 스레드 · 초록색 칸: 이전 장면에서 바뀐 값',
  note:'순차 실행 예제이며 경쟁 상태를 자동 계산하지 않습니다. 스레드의 스택은 따로 마련되지만 같은 주소 공간 안에 있으므로 서로 접근할 수 없는 보호 영역이라는 뜻은 아닙니다.',
  template:{id:'PT',name:'프로세스 · 스레드 구조',category:'process',description:'공유 데이터와 개별 문맥',
    defaultNodes:[node('p1','process-box',0,0,{label:'프로세스 P1',sections:sections(0),threads:threads(0),activeThreadId:null,...processPresentation}),node('p2','process-box',410,0,{label:'프로세스 P2',sections:sections(0),threads:[{id:'t3',label:'T3',pc:'대기',register:'0',stack:'지역값 4'}],activeThreadId:null,...processPresentation})],defaultEdges:[],
    defaultFrames:[
      frame('pt-0','처음 · P1의 T1과 T2는 같은 주소 공간을 사용합니다. P2는 별도의 주소 공간입니다.'),
      frame('pt-1','T1 실행 · 공유 데이터 x를 1로 바꾸고 자기 스택의 지역값을 7로 바꿉니다.',{p1:{sections:sections(1),threads:threads(1),activeThreadId:'t1'}},['p1']),
      frame('pt-2','T2 실행 · 같은 x를 읽으므로 1을 얻습니다. T2의 스택 지역값 9는 그대로입니다.',{p1:{threads:threads(2),activeThreadId:'t2'}},['p1']),
      frame('pt-3','P2 확인 · 이름이 같은 x라도 다른 프로세스의 데이터입니다. P2의 x는 여전히 0입니다.',{p1:{activeThreadId:null},p2:{activeThreadId:'t3'}},['p2']),
      frame('pt-4','비교 완료 · P1 내부의 데이터는 공유되고 각 스레드의 실행 위치와 레지스터·스택은 따로 유지됩니다.',{p1:{activeThreadId:null},p2:{activeThreadId:null}},['p1','p2']),
    ],
  },
};

export const INODE_ACCESS: TeachingExample = {
  slug:'inode-access',title:'파일 이름이 두 개면, 내용도 두 벌일까?',subtitle:'두 하드 링크가 같은 inode와 데이터 블록에 도달하는 경로를 따라갑니다.',
  legend:'이름 → inode 번호 → 직접 데이터 블록 · 강조된 선: 지금 따라가는 경로',
  note:'같은 파일 시스템 안의 하드 링크 예제입니다. 심볼릭 링크·간접 포인터·캐시·마지막 링크 삭제 시점은 생략했습니다.',
  template:{id:'IN',name:'inode 파일 접근',category:'fs',description:'이름 · inode · 데이터',
    defaultNodes:[box('name-a',0,20,'a.txt'),box('name-b',0,190,'b.txt'),box('inode',300,100,'inode 42'),box('block',590,100,'블록 7 · Hello'),count('links',300,225,'하드 링크 수',2),text('directory',0,-35,'디렉터리의 파일 이름'),text('content',590,225,'파일 내용은 한 벌입니다.')],
    defaultEdges:[edge('a-inode','name-a','inode','42'),edge('b-inode','name-b','inode','42'),edge('inode-block','inode','block','직접 포인터')],
    defaultFrames:[
      frame('in-0','두 이름 · a.txt와 b.txt가 같은 inode 번호 42를 가리킵니다.',{},['name-a','name-b']),
      frame('in-1','이름 조회 · a.txt의 디렉터리 항목에서 inode 번호 42를 찾습니다.',{},['name-a','inode'],['a-inode']),
      frame('in-2','내용 읽기 · inode 42의 직접 포인터를 따라 데이터 블록 7의 Hello를 읽습니다.',{},['inode','block'],['inode-block']),
      frame('in-3','다른 이름 · b.txt를 찾아도 같은 inode 42로 갑니다.',{},['name-b','inode'],['b-inode']),
      frame('in-4','같은 내용 · 같은 데이터 블록 7을 읽습니다. 파일 내용을 복사한 것이 아닙니다.',{},['block'],['b-inode','inode-block']),
      frame('in-5','이름 하나 삭제 · a.txt 항목을 제거하면 하드 링크 수가 2에서 1로 줄어듭니다.',{'name-a':{removed:true},links:{value:1}},['name-a'],[],['b-inode','inode-block']),
      frame('in-6','남은 이름 · b.txt가 inode를 계속 가리키므로 내용은 남아 있고 다시 읽을 수 있습니다.',{},['name-b','block'],['b-inode','inode-block'],['b-inode','inode-block']),
    ],
  },
};

export const DISK_POSITIONS = [50,20,80,30];
export const DISK_SEEK: TeachingExample = {
  slug:'disk-seek',title:'헤드는 요청을 처리하며 얼마나 움직일까?',subtitle:'도착 순서대로 처리하는 FCFS에서 각 이동과 누적 이동 거리를 확인합니다.',
  legend:'가로축: 처리 순서 · 세로축: 실린더 위치 · 주황색: 이번 이동',
  note:'헤드 50에서 요청 20 → 80 → 30을 처리합니다. 합계는 실린더 이동 거리이며 실제 탐색 시간·회전 지연·전송 시간은 아닙니다.',
  template:{id:'DS',name:'디스크 탐색 경로',category:'fs',description:'FCFS · 헤드 이동 거리',
    defaultNodes:[node('path','line-chart',0,0,{label:'FCFS 헤드 이동',width:580,height:270,xLabel:'처리 순서',yLabel:'실린더',xMin:0,xMax:3,yMin:0,yMax:100,xTicks:[0,1,2,3],yTicks:[0,20,40,60,80,100],series:[{name:'FCFS',color:'#0f766e',points:DISK_POSITIONS.map((y,x)=>({x,y}))}],progressIndex:0,activePointIndex:0}),
      node('moves','table-grid',660,0,{label:'처리 기록',headers:['이동','거리'],rows:[['50 → 20','대기'],['20 → 80','대기'],['80 → 30','대기']],width:220,activeRow:null}),count('distance',660,235,'누적 이동',0)],defaultEdges:[],
    defaultFrames:[
      frame('ds-0','시작 · 헤드는 실린더 50에 있습니다. 아직 처리한 요청과 이동 거리는 없습니다.'),
      frame('ds-1','첫 요청 20 · |20 − 50| = 30만큼 이동했습니다. 누적 거리는 30입니다.',{path:{progressIndex:1,activePointIndex:1},moves:{rows:[['50 → 20',30],['20 → 80','대기'],['80 → 30','대기']],activeRow:0},distance:{value:30}}),
      frame('ds-2','다음 요청 80 · 방향을 바꾸어 60만큼 이동합니다. 누적 거리는 30 + 60 = 90입니다.',{path:{progressIndex:2,activePointIndex:2},moves:{rows:[['50 → 20',30],['20 → 80',60],['80 → 30','대기']],activeRow:1},distance:{value:90}}),
      frame('ds-3','마지막 요청 30 · 다시 50만큼 이동합니다. 총 이동 거리는 30 + 60 + 50 = 140입니다.',{path:{progressIndex:3,activePointIndex:3},moves:{rows:[['50 → 20',30],['20 → 80',60],['80 → 30',50]],activeRow:2},distance:{value:140}}),
      frame('ds-4','처리 완료 · 요청 순서가 바뀌면 이동 거리도 달라질 수 있습니다. 이 FCFS 예제는 140입니다.',{path:{activePointIndex:-1},moves:{activeRow:null}},[]),
    ],
  },
};
export const REMAINING_EXAMPLES = [PRODUCER_CONSUMER, ADDRESS_TRANSLATION, MEMORY_FRAGMENTATION, PROCESS_THREADS, INODE_ACCESS, DISK_SEEK];
export const REMAINING_TEMPLATES = REMAINING_EXAMPLES.map(e => e.template);
export function exampleBlob(example: TeachingExample): OboBlob {
  return JSON.parse(JSON.stringify({ nodes:example.template.defaultNodes, edges:example.template.defaultEdges, frames:example.template.defaultFrames ?? [] }));
}
