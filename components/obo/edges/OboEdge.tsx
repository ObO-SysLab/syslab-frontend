'use client';

import { getBezierPath, EdgeLabelRenderer, type EdgeProps } from '@xyflow/react';
import { useFrameCtx } from '../FrameContext';

interface OboEdgeData {
  label?: string;
  direction?: 'forward' | 'both';
  style?: 'solid' | 'dashed';
  role?: 'transition' | 'request' | 'allocation';
  emphasize?: boolean;
}

export function OboEdge({
  id, sourceX, sourceY, targetX, targetY,
  sourcePosition, targetPosition,
  data, selected,
}: EdgeProps) {
  const d = (data ?? {}) as OboEdgeData;
  const isBidi = d.direction === 'both';
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX, sourceY, sourcePosition,
    targetX, targetY, targetPosition,
  });

  const { previewFrame } = useFrameCtx();
  const frameHighlighted = previewFrame?.highlightEdges.includes(id) ?? false;
  const frameDimmed = previewFrame !== null && !frameHighlighted;

  // 데모(app/challenges/obo/page.tsx)와 동일하게: 평소엔 옅은 회색, 활성(하이라이트)일 때만 두껍고 진하게.
  const stroke = frameHighlighted ? '#f59e0b' : d.emphasize ? '#ef4444' : selected ? '#6366f1' : '#e2e8f0';
  const strokeWidth = frameHighlighted ? 3.5 : selected ? 2.5 : 2;
  const strokeDasharray = d.style === 'dashed' ? '6 3' : undefined;
  const opacity = frameDimmed ? 0.25 : 1;
  const mkId = `obo-mk-${id}`;
  const mkBiId = `obo-mk-bi-${id}`;

  const labelCls = frameHighlighted
    ? 'bg-white border border-amber-400 rounded-full text-[11px] font-black text-amber-700 px-3 py-1 shadow-sm'
    : 'bg-white border border-slate-100 rounded-full text-[11px] font-bold text-slate-400 px-3 py-1 shadow-sm';

  return (
    <>
      {/* SVG 요소는 <g>로 묶어 opacity 일괄 적용 */}
      <g style={{ opacity }}>
        <defs>
          {/* refX를 tip(9)보다 크게 잡아 화살표를 곡선 접선 방향으로 살짝 당긴다
              → tip이 노드 핸들 점 바깥 가장자리에 놓여 점에 가려지지 않는다(붕 뜨지 않음). */}
          <marker id={mkId} markerWidth="9" markerHeight="9" refX="11" refY="4.5" orient="auto" markerUnits="strokeWidth">
            <path d="M 0 0 L 9 4.5 L 0 9 z" fill={stroke} />
          </marker>
          {isBidi && (
            <marker id={mkBiId} markerWidth="9" markerHeight="9" refX="1" refY="4.5" orient="auto-start-reverse" markerUnits="strokeWidth">
              <path d="M 0 0 L 9 4.5 L 0 9 z" fill={stroke} />
            </marker>
          )}
        </defs>

        <path
          d={edgePath}
          stroke="transparent"
          strokeWidth={12}
          fill="none"
          className="react-flow__edge-interaction"
        />
        <path
          id={id}
          d={edgePath}
          stroke={stroke}
          strokeWidth={strokeWidth}
          strokeDasharray={strokeDasharray}
          fill="none"
          markerEnd={`url(#${mkId})`}
          markerStart={isBidi ? `url(#${mkBiId})` : undefined}
          className="react-flow__edge-path"
        />
      </g>

      {/* HTML 라벨은 EdgeLabelRenderer 포탈로 분리 */}
      {d.label && (
        <EdgeLabelRenderer>
          <div
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
              pointerEvents: 'all',
              opacity,
            }}
            className="nodrag nopan"
          >
            <span className={labelCls}>{d.label}</span>
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
}