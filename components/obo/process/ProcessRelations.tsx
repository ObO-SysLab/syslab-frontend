'use client';
import { useEffect, useState, type RefObject } from 'react';

/** Structure only: lines connect every visible thread to the shared region, never imply an access event. */
export function ProcessRelations({ container, signature }: { container: RefObject<HTMLDivElement | null>; signature: string }) {
  const [paths, setPaths] = useState<string[]>([]);
  useEffect(() => {
    const root = container.current;
    const shared = root?.querySelector<HTMLElement>('[data-process-shared=true]');
    const threads = root ? [...root.querySelectorAll<HTMLElement>('[data-thread]')] : [];
    if (!root || !shared || !threads.length) return;
    const measure = () => {
      const bounds = root.getBoundingClientRect(), scale = bounds.width / root.offsetWidth;
      if (!scale) return;
      const area = shared.getBoundingClientRect();
      const sx = (area.left + area.width / 2 - bounds.left) / scale, sy = (area.bottom - bounds.top) / scale;
      const boxes = threads.map(t => t.getBoundingClientRect());
      const singleRow = boxes.every(b => Math.abs(b.top - boxes[0].top) < 1);
      const next = boxes.map(b => {
        const x = (b.left + b.width / 2 - bounds.left) / scale, y = (b.top - bounds.top) / scale;
        return singleRow ? `M${sx} ${sy}V${sy + 12}H${x}V${y}` : `M${sx} ${sy}V${sy + 12}H7V${y - 12}H${x}V${y}`;
      });
      setPaths(previous => JSON.stringify(previous) === JSON.stringify(next) ? previous : next);
    };
    measure();
    const observer = new ResizeObserver(measure);
    [root, shared, ...threads].forEach(el => observer.observe(el));
    return () => observer.disconnect();
  }, [container, signature]);
  return <svg data-process-links role="img" aria-label="공유 영역과 스레드의 공유 관계" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }}>
    {paths.map((d, i) => <path key={i} data-shared-branch d={d} fill="none" stroke="#6a9c90" strokeWidth="1.5" />)}
  </svg>;
}
