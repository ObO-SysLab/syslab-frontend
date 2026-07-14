export const DEFAULT_NODE_DATA: Record<string, object> = {
  'state-node': {
    label: 'State', shape: 'circle', fill: '#6366f1',
  },
  'resource-square': {
    label: 'R1', instances: 2, allocated: 1,
  },
  'slot-grid': {
    title: 'Frame', orientation: 'row', cols: 4,
    cells: [{ value: '' }, { value: '' }, { value: '' }, { value: '' }],
  },
  'gantt-lane': {
    label: '', mode: 'block', axisMax: 8,
    blocks: [
      { label: 'P1', start: 0, end: 3, color: '#1D9E75' },
      { label: 'P2', start: 3, end: 7, color: '#6366f1' },
    ],
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