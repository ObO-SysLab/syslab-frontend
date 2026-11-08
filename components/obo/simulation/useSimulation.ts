'use client';
import { useEffect, useRef, useState } from 'react';
import type { ModelRun } from '../runtime/index.mjs';
import type { SimulationInstance } from '../runtime/document.mjs';
import { workerUrl } from '../runtime/worker-release';

export function useSimulation(instance: SimulationInstance, record = true) {
  const [execution, setExecution] = useState<ModelRun | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const sequence = useRef(0);
  const serialized = JSON.stringify(instance.input);
  useEffect(() => {
    const jobId = ++sequence.current;
    let worker: Worker | null = null;
    let deadline: number | undefined;
    setLoading(true); setError(null); setExecution(null);
    const timer = window.setTimeout(() => {
      try {
        worker = new Worker(workerUrl, { type: 'module' });
        worker.onmessage = ({ data }: MessageEvent<{ jobId: number; result?: ModelRun; error?: string }>) => {
          if (sequence.current !== data.jobId) return;
          window.clearTimeout(deadline);
          setLoading(false); setError(data.error ?? null); setExecution(data.result ?? null);
          worker?.terminate();
        };
        worker.onerror = () => { window.clearTimeout(deadline); if (sequence.current === jobId) { setLoading(false); setError('계산 작업을 시작하지 못했습니다. 다시 시도하세요.'); } worker?.terminate(); };
        deadline=window.setTimeout(()=>{worker?.terminate();if(sequence.current===jobId){setLoading(false);setError('계산 시간 한도를 넘었습니다. 입력 크기를 줄이세요.');}},5000);
        worker.postMessage({ jobId, scenarioId: instance.scenarioId, input: JSON.parse(serialized), record });
      } catch (error) { setLoading(false); setError(error instanceof Error ? error.message : '계산 실패'); }
    }, 120);
    return () => { window.clearTimeout(timer); window.clearTimeout(deadline); worker?.terminate(); };
  }, [instance.scenarioId, serialized, record]);
  return { execution, error, loading };
}
