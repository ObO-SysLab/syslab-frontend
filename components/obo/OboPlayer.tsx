'use client';

import { useState, useEffect } from 'react';
import {
  ReactFlow,
  ReactFlowProvider,
  Controls,
  Background,
  BackgroundVariant,
  ConnectionMode,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { SkipBack, ChevronLeft, ChevronRight, Play, Pause, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { Node } from '@xyflow/react';
import { nodeTypes } from './nodes';
import { OboEdge } from './edges/OboEdge';
import { FrameContext } from './FrameContext';
import { applyFrame } from './lib/applyFrame';
import type { OboBlob, Frame } from './types';

const edgeTypes = { 'obo-edge': OboEdge } as const;

interface OboPlayerProps {
  blob: OboBlob;
  maxFrameIndex?: number;
  checkpointStatusByFrame?: Record<string, Record<string, 'correct' | 'incorrect'>>;
  autoPlay?: boolean;
}

function PlayerInner({ blob, maxFrameIndex, checkpointStatusByFrame, autoPlay }: OboPlayerProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [playing, setPlaying] = useState(autoPlay ?? false);

  const frames: Frame[] = blob.frames ?? [];
  const hasFrames = frames.length > 0;
  const currentFrame: Frame | null = hasFrames ? frames[currentIndex] : null;
  const effectiveLastIndex = maxFrameIndex ?? frames.length - 1;

  useEffect(() => {
    if (!playing) return;
    if (currentIndex >= effectiveLastIndex) { setPlaying(false); return; }
    const timer = setTimeout(() => setCurrentIndex(i => i + 1), 1200);
    return () => clearTimeout(timer);
  }, [playing, currentIndex, effectiveLastIndex]);

  const nodes = applyFrame(blob.nodes as Node[], frames, hasFrames ? currentIndex : -1)
    .map(n => ({ ...n, selectable: false, draggable: false }));
  const edges = blob.edges.map(e => ({ ...e, type: 'obo-edge' as const, selectable: false }));

  const prev = () => { setCurrentIndex(i => Math.max(0, i - 1)); setPlaying(false); };
  const next = () => { setCurrentIndex(i => Math.min(effectiveLastIndex, i + 1)); setPlaying(false); };
  const reset = () => { setCurrentIndex(0); setPlaying(false); };
  const checkpointStatus = currentFrame ? checkpointStatusByFrame?.[currentFrame.id] : undefined;

  return (
    <div className="flex flex-col h-full rounded-2xl overflow-hidden border border-slate-100 bg-white">
      <div className="flex-1 relative">
        <FrameContext.Provider value={{ previewFrame: currentFrame, checkpointStatus }}>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            nodeTypes={nodeTypes}
            edgeTypes={edgeTypes}
            fitView
            fitViewOptions={{ padding: 0.3, maxZoom: 0.75 }}
            connectionMode={ConnectionMode.Loose}
            nodesDraggable={false}
            nodesConnectable={false}
            elementsSelectable={false}
            panOnDrag
            zoomOnScroll
          >
            <Background variant={BackgroundVariant.Dots} gap={16} size={1} color="#e2e8f0" />
            <Controls showInteractive={false} />
          </ReactFlow>
        </FrameContext.Provider>
      </div>

      {hasFrames && (
        <div className="border-t border-slate-100 px-4 py-3 space-y-3 bg-white">
          {/* 현재 프레임 설명 */}
          <p className="text-sm font-bold text-slate-700 text-center min-h-5 truncate">
            {currentFrame?.label || ' '}
          </p>

          {/* 재생 컨트롤 + 스텝 인디케이터 */}
          <div className="flex items-center justify-center gap-3 flex-wrap">
            <Button
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
                variant="ghost"
                size="icon"
                onClick={prev}
                disabled={currentIndex === 0}
                className="rounded-xl text-slate-400 hover:text-slate-900 h-8 w-8"
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>

              <div className="flex gap-1.5 px-2">
                {frames.map((_, i) => {
                  const locked = i > effectiveLastIndex;
                  return (
                    <button
                      key={i}
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
                variant="ghost"
                size="icon"
                onClick={next}
                disabled={currentIndex >= effectiveLastIndex}
                className="rounded-xl text-slate-400 hover:text-slate-900 h-8 w-8"
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>

            <Button
              size="icon"
              onClick={() => setPlaying(p => !p)}
              disabled={currentIndex >= effectiveLastIndex && !playing}
              className={`rounded-xl h-9 w-9 shadow-lg transition-all ${playing ? "bg-rose-500 hover:bg-rose-600 shadow-rose-200" : "bg-indigo-600 hover:bg-indigo-700 shadow-indigo-200"}`}
            >
              {playing ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            </Button>

            <Button
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