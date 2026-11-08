export const DEFAULT_NODE_DATA: Record<string, object> = {
  'state-node': {
    label: 'State', shape: 'circle', fill: '#6366f1',
  },
  'resource-square': {
    label: 'R1', instances: 2, allocated: 1,
  },
  'queue-strip': { label: '버퍼', capacity: 3, items: ['A'], direction: 'ltr' },
  'table-grid': { label: '표', headers: ['이름', '값'], rows: [['A', 0]], width: 300, activeRow: null },
  'memory-range': { label: '메모리', start: 0, size: 16, segments: [{ id: 'region-1', start: 0, size: 8, label: 'A' }, { id: 'region-2', start: 8, size: 8, label: '빈 공간', free: true }], activeIds: [] },
  'process-box': { label: '프로세스', sections: [{ name: '데이터', value: 'x = 0', shared: true }], threads: [{ id: 'thread-1', label: 'T1', pc: '시작', register: '0', stack: '지역값 0' }], activeThreadId: null },
  'slot-grid': {
    label: '칸', pointerLabel: '다음',
    slotCount: 4, slots: [null, null, null, null],
    faultSlotIndex: null, hitSlotIndex: null,
  },
  'gantt-lane': {
    trackId: 'P1', blocks: [], activeBlockIndex: null, ganttGroup: '기본 간트',
  },
  'counter-badge': {
    label: 'Counter', min: 0, max: 10, value: 0, delta: null,
  },
  'line-chart': {
    label: 'Chart', xLabel: '프레임 수', yLabel: '페이지 폴트',
    series: [
      { name: 'FIFO', points: [{ x: 1, y: 4 }, { x: 2, y: 3 }, { x: 3, y: 4 }, { x: 4, y: 5 }, { x: 5, y: 4 }], color: '#6366f1' },
    ],
  },
  'text-label': {
    text: 'Label', variant: 'plain', color: '#334155',
  },
};
