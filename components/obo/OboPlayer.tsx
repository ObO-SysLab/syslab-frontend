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
import { SkipBack, ChevronLeft, ChevronRight, Play, Pause, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
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
}

function PlayerInner({ blob, maxFrameIndex, checkpointStatusByFrame, autoPlay }: OboPlayerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const { fitView } = useReactFlow();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [playing, setPlaying] = useState(autoPlay ?? false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);

  const frames: Frame[] = blob.frames ?? [];
  const hasFrames = frames.length > 0;
  const currentFrame: Frame | null = hasFrames ? frames[currentIndex] : null;
  const effectiveLastIndex = Math.min(maxFrameIndex ?? frames.length - 1, frames.length - 1);
  // Reserve authored line breaks across accessible scenes so captions do not shrink the graph.
  const captionMinLines = frames.slice(0, effectiveLastIndex + 1)
    .reduce((lines, frame) => Math.max(lines, (frame.label || '').split('\n').length), 1);
  const atEnd = currentIndex >= effectiveLastIndex;
  const playLabel = playing ? '일시 정지' : atEnd && effectiveLastIndex > 0 ? '다시 재생' : '재생';

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

  useEffect(() => {
    if (!playing) return;
    if (currentIndex >= effectiveLastIndex) { setPlaying(false); return; }
    const timer = setTimeout(() => setCurrentIndex(i => i + 1), 1200 / playbackSpeed);
    return () => clearTimeout(timer);
  }, [playing, currentIndex, effectiveLastIndex, playbackSpeed]);

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

  const prev = () => { setCurrentIndex(i => Math.max(0, i - 1)); setPlaying(false); };
  const next = () => { setCurrentIndex(i => Math.min(effectiveLastIndex, i + 1)); setPlaying(false); };
  const reset = () => { setCurrentIndex(0); setPlaying(false); };
  const checkpointStatus = currentFrame ? checkpointStatusByFrame?.[currentFrame.id] : undefined;

  return (
    <div ref={containerRef} data-obo-player className={`${styles.player} flex flex-col h-full rounded-2xl overflow-hidden border border-slate-100 bg-white`}>
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
            <p style={{ minHeight: captionMinLines > 1 ? `${captionMinLines * 1.625}rem` : undefined }} className="min-h-6 whitespace-pre-wrap break-words text-base font-semibold leading-relaxed text-slate-700">{currentFrame?.label || '설명이 없는 장면입니다.'}</p>
          </div>

          {/* 재생 컨트롤 + 스텝 인디케이터 */}
          <div className="flex items-center justify-center gap-3 flex-wrap">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={reset}
              title="처음으로"
              className="rounded-xl text-slate-400 hover:text-slate-900 h-8 w-8"
            >
              <SkipBack className="w-4 h-4" />
            </Button>

            <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-2xl border border-slate-200 shadow-sm">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={prev}
              aria-label="이전 장면"
                disabled={currentIndex === 0}
                className="rounded-xl text-slate-400 hover:text-slate-900 h-8 w-8"
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>

              <div className="flex max-w-[45vw] flex-wrap justify-center gap-1.5 px-2">
                {frames.map((_, i) => {
                  const locked = i > effectiveLastIndex;
                  return (
                    <button
                      type="button"
                      key={i}
                      aria-label={`${i + 1}번 장면`}
                      aria-current={i === currentIndex ? 'step' : undefined}
                      onClick={() => { if (locked) return; setCurrentIndex(i); setPlaying(false); }}
                      disabled={locked}
                      className="rounded-full transition-all duration-300 disabled:cursor-not-allowed"
                      style={{
                        width: i === currentIndex ? 28 : 10,
                        height: 10,
                        opacity: locked ? 0.4 : 1,
                        background: i === currentIndex ? '#4f46e5' : i < currentIndex ? '#4f46e566' : '#e2e8f0',
                      }}
                    />
                  );
                })}
              </div>

              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={next}
                aria-label="다음 장면"
                disabled={currentIndex >= effectiveLastIndex}
                className="rounded-xl text-slate-400 hover:text-slate-900 h-8 w-8"
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>

            <Button
              type="button"
              size="sm"
              onClick={() => {
                if (playing) { setPlaying(false); return; }
                if (atEnd) setCurrentIndex(0);
                setPlaying(true);
              }}
              aria-label={playLabel}
              disabled={effectiveLastIndex <= 0}
              className={`gap-2 rounded-xl h-9 px-3 shadow-lg transition-all ${playing ? "bg-rose-500 hover:bg-rose-600 shadow-rose-200" : "bg-indigo-600 hover:bg-indigo-700 shadow-indigo-200"}`}
            >
              {playing ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
              {playLabel}
            </Button>

            <label className="flex items-center gap-2 text-xs text-slate-600">
              재생 속도
              <select aria-label="재생 속도" value={playbackSpeed}
                onChange={event => setPlaybackSpeed(Number(event.target.value))}
                className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm text-slate-700">
                <option value={0.5}>0.5배</option>
                <option value={1}>1배</option>
                <option value={2}>2배</option>
              </select>
            </label>

            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={reset}
              title="초기화"
              className="rounded-xl text-slate-400 hover:text-slate-900 h-8 w-8"
            >
              <RotateCcw className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

export function OboPlayer({ blob, maxFrameIndex, checkpointStatusByFrame, autoPlay }: OboPlayerProps) {
  return (
    <ReactFlowProvider>
      <PlayerInner
        blob={blob}
        maxFrameIndex={maxFrameIndex}
        checkpointStatusByFrame={checkpointStatusByFrame}
        autoPlay={autoPlay}
      />
    </ReactFlowProvider>
  );
}
