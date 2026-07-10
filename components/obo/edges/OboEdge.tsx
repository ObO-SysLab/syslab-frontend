'use client';

import { getBezierPath, EdgeLabelRenderer, type EdgeProps } from '@xyflow/react';
import { useFrameCtx } from '../FrameContext';

interface OboEdgeData {
  label?: string;
  direction?: 'forward' | 'both';
  style?: 'solid' | 'dashed';
  role?: 'transition' | 'request' | 'allocation';
  highlight?: boolean;
}

export function OboEdge({
  id, sourceX, sourceY, targetX, targetY,
  sourcePosition, targetPosition,
  data, selected,
}: EdgeProps) {
  const d = (data ?? {}) as OboEdgeData;
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX, sourceY, sourcePosition,
    targetX, targetY, targetPosition,
  });

  const { previewFrame } = useFrameCtx();
  const frameHighlighted = previewFrame?.highlightEdges.includes(id) ?? false;
  const frameDimmed = previewFrame !== null && !frameHighlighted;

  const stroke = frameHighlighted ? '#f59e0b' : d.highlight ? '#ef4444' : selected ? '#6366f1' : '#94a3b8';
  const strokeWidth = frameHighlighted ? 3 : selected ? 2.5 : 1.5;
  const strokeDasharray = d.style === 'dashed' ? '6 3' : undefined;
  const opacity = frameDimmed ? 0.25 : 1;
  const mkId = `obo-mk-${id}`;
  const mkBiId = `obo-mk-bi-${id}`;
  const isBidi = d.direction === 'both';

  const labelCls = frameHighlighted
    ? 'bg-white border border-amber-400 rounded text-[10px] font-bold text-amber-700 px-1.5 py-0.5 shadow-sm'
    : 'bg-white border border-slate-200 rounded text-[10px] font-semibold text-slate-600 px-1.5 py-0.5 shadow-sm';

  return (
    <>
      {/* SVG 요소는 <g>로 묶어 opacity 일괄 적용 */}
      <g style={{ opacity }}>
        <defs>
          <marker id={mkId} markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto" markerUnits="strokeWidth">
            <path d="M 0 0 L 8 4 L 0 8 z" fill={stroke} />
          </marker>
          {isBidi && (
            <marker id={mkBiId} markerWidth="8" markerHeight="8" refX="1" refY="4" orient="auto-start-reverse" markerUnits="strokeWidth">
              <path d="M 0 0 L 8 4 L 0 8 z" fill={stroke} />
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