'use client';

import { useState, useEffect, useRef } from 'react';
import {
  ReactFlow,
  ReactFlowProvider,
  Controls,
  Background,
  BackgroundVariant,
  ConnectionMode,
  useReactFlow,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { PlaybackBar } from './PlaybackBar';
import { usePlayback } from './playback';
import type { Node } from '@xyflow/react';
import { nodeTypes } from './nodes';
import { OboEdge } from './edges/OboEdge';
import { FrameContext } from './FrameContext';
import { applyFrame } from './lib/applyFrame';
import { frameEdges } from './lib/frameEdges';
import type { OboBlob, Frame } from './types';
import { GanttContext } from './gantt/GanttContext';
import { ganttLayouts, alignGanttRows } from './gantt/model';
import styles from './OboPlayer.module.css';

const edgeTypes = { 'obo-edge': OboEdge } as const;

interface OboPlayerProps {
  blob: OboBlob;
  maxFrameIndex?: number;
  checkpointStatusByFrame?: Record<string, Record<string, 'correct' | 'incorrect'>>;
  autoPlay?: boolean;
  /** Learner result (2026-11-09): the first wrong scene; playback stops there and marks it. */
  wrongFrameIndex?: number;
}

function PlayerInner({ blob, maxFrameIndex, checkpointStatusByFrame, autoPlay, wrongFrameIndex }: OboPlayerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const { fitView } = useReactFlow();
  const [currentIndex, setCurrentIndex] = useState(0);

  const frames: Frame[] = blob.frames ?? [];
  const hasFrames = frames.length > 0;
  const currentFrame: Frame | null = hasFrames ? frames[currentIndex] : null;
  const effectiveLastIndex = Math.min(maxFrameIndex ?? frames.length - 1, frames.length - 1);
  // Reserve authored line breaks across accessible scenes so captions do not shrink the graph.
  const captionMinLines = frames.slice(0, effectiveLastIndex + 1)
    .reduce((lines, frame) => Math.max(lines, (frame.label || '').split('\n').length), 1);
  const pb = usePlayback({ index: currentIndex, setIndex: setCurrentIndex, first: 0, last: Math.max(0, frames.length - 1), stopAt: effectiveLastIndex, autoPlay });

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    let previous: { width: number; height: number } | undefined;
    let request = 0;
    // Observe the whole player, not the scene caption: scene changes retain zoom/pan.
    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      if (previous && width > 0 && height > 0 && (width !== previous.width || height !== previous.height)) {
        cancelAnimationFrame(request);
        request = requestAnimationFrame(() => { void fitView({ padding: 0.12, maxZoom: 1.25 }); });
      }
      previous = { width, height };
    });
    observer.observe(container);
    return () => { observer.disconnect(); cancelAnimationFrame(request); };
  }, [fitView]);

  const layouts = ganttLayouts(blob.nodes as Node[], frames.slice(0, effectiveLastIndex + 1));
  const previousNodeData = hasFrames && currentIndex > 0 && blob.nodes.some(n => n.type === 'process-box')
    ? Object.fromEntries(applyFrame(blob.nodes as Node[], frames, currentIndex - 1).map(n => [n.id, n.data])) : undefined;
  const nodes = alignGanttRows(applyFrame(blob.nodes as Node[], frames, hasFrames ? currentIndex : -1), layouts)
    .map(n => ({ ...n, selectable: false, draggable: false,
      hidden: n.hidden || n.type === 'counter-badge' && n.data.showInPlayback === false
        || n.type === 'text-label' && n.data.variant === 'item' && !String(n.data.text ?? n.data.label ?? '').trim() }));
  const hiddenIds = new Set(nodes.filter(n => n.hidden).map(n => n.id));
  const edges = frameEdges(blob.edges, currentFrame).filter(e => !hiddenIds.has(e.source) && !hiddenIds.has(e.target))
    .map(e => ({ ...e, type: 'obo-edge' as const, selectable: false }));

  const checkpointStatus = currentFrame ? checkpointStatusByFrame?.[currentFrame.id] : undefined;

  return (
    <div ref={containerRef} data-obo-player onKeyDown={pb.onKeyDown} className={`${styles.player} flex flex-col h-full rounded-2xl overflow-hidden border border-slate-100 bg-white`}>
      <div className="min-h-0 flex-1 relative">
        <GanttContext.Provider value={{ layouts }}>
        <FrameContext.Provider value={{ previewFrame: currentFrame, checkpointStatus, previousNodeData }}>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            nodeTypes={nodeTypes}
            edgeTypes={edgeTypes}
            fitView
            fitViewOptions={{ padding: 0.12, maxZoom: 1.25 }}
            minZoom={0.05}
            connectionMode={ConnectionMode.Loose}
            nodesDraggable={false}
            nodesConnectable={false}
            elementsSelectable={false}
            panOnDrag
            zoomOnScroll
          >
            <Background variant={BackgroundVariant.Dots} gap={16} size={1} color="#e2e8f0" />
            <Controls showInteractive={false} fitViewOptions={{padding:0.12,maxZoom:1.25}} />
          </ReactFlow>
        </FrameContext.Provider>
        </GanttContext.Provider>
      </div>

      {hasFrames && (
        <div className="shrink-0 border-t border-slate-100 px-4 py-3 space-y-3 bg-white">
          {/* 현재 프레임 설명 */}
          <div className="mx-auto max-w-3xl text-center" aria-live="polite" aria-atomic="true">
            <p className="mb-1 text-xs font-semibold text-indigo-600">장면 {currentIndex + 1} / {frames.length}</p>
            {wrongFrameIndex === currentIndex && <p role="alert" data-wrong-scene className="mb-1 inline-block rounded-full bg-rose-50 px-3 py-0.5 text-xs font-semibold text-rose-700">여기서부터 정답과 다릅니다</p>}
            <p style={{ minHeight: captionMinLines > 1 ? `${captionMinLines * 1.625}rem` : undefined }} className="min-h-6 whitespace-pre-wrap break-words text-base font-semibold leading-relaxed text-slate-700">{currentFrame?.label || '설명이 없는 장면입니다.'}</p>
          </div>

          <PlaybackBar pb={pb} index={currentIndex} wrongAt={wrongFrameIndex} showPosition={false} />
        </div>
      )}
    </div>
  );
}

export function OboPlayer({ blob, maxFrameIndex, checkpointStatusByFrame, autoPlay, wrongFrameIndex }: OboPlayerProps) {
  return (
    <ReactFlowProvider>
      <PlayerInner
        blob={blob}
        maxFrameIndex={maxFrameIndex}
        checkpointStatusByFrame={checkpointStatusByFrame}
        autoPlay={autoPlay}
        wrongFrameIndex={wrongFrameIndex}
      />
    </ReactFlowProvider>
  );
}
