import { StateNode }        from './StateNode';
import { ResourceSquare }   from './ResourceSquare';
import { SlotGrid }         from './SlotGrid';
import { GanttChart }       from './GanttChart';
import { LineChart }        from './LineChart';
import { TextLabel }        from './TextLabel';
import { CounterBadgeNode } from './CounterBadgeNode';

// 컴포넌트 외부(모듈 레벨)에서 정의해야 React Flow가 노드를 리마운트하지 않음
export const nodeTypes = {
  'state-node':      StateNode,
  'resource-square': ResourceSquare,
  'slot-grid':       SlotGrid,
  'gantt-chart':     GanttChart,
  'line-chart':      LineChart,
  'text-label':      TextLabel,
  'counter-badge':   CounterBadgeNode,
} as const;