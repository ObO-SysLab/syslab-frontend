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
  // Keep the entire graph readable; emphasis adds contrast instead of dimming context.
  const stroke = frameHighlighted ? '#b45309' : d.emphasize ? '#dc2626' : selected ? '#6366f1' : '#94a3b8';
  const strokeWidth = frameHighlighted ? 3.5 : selected ? 3 : 1.8;
  const strokeDasharray = d.style === 'dashed' ? '6 3' : undefined;
  const mkId = `obo-mk-${id}`;
  const mkBiId = `obo-mk-bi-${id}`;

  const labelCls = frameHighlighted
    ? 'bg-amber-50 border border-amber-500 rounded-full text-[13px] font-bold text-amber-800 px-3 py-1 shadow-sm'
    : 'bg-white border border-slate-200 rounded-full text-[13px] font-semibold text-slate-600 px-3 py-1 shadow-sm';

  return (
    <>
      <g>
        <defs>
          <marker id={mkId} markerWidth="12" markerHeight="12" refX="13" refY="6" orient="auto" markerUnits="userSpaceOnUse">
            <path d="M 0 0 L 12 6 L 0 12 z" style={{fill:stroke,transition:'fill 250ms ease'}} />
          </marker>
          {isBidi && (
            <marker id={mkBiId} markerWidth="12" markerHeight="12" refX="-1" refY="6" orient="auto-start-reverse" markerUnits="userSpaceOnUse">
              <path d="M 0 0 L 12 6 L 0 12 z" style={{fill:stroke,transition:'fill 250ms ease'}} />
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
          style={{stroke,strokeWidth,strokeDasharray,transition:'stroke 250ms ease, stroke-width 250ms ease'}}
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
            }}
            className="nodrag nopan"
          >
            <span className={labelCls} style={{transition:'color 250ms ease, background-color 250ms ease, border-color 250ms ease'}}>{d.label}</span>
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
}
