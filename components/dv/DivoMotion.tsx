"use client";

// 움직이는 디보 (스타일은 app/globals.css 의 dv-mascot 클래스)

import { useEffect, useId, useRef, useState, type CSSProperties } from "react";
import { cn } from "@/lib/utils";

// divo.webp(573×640) 기준 눈 위치. 눈꺼풀은 고글 렌즈 색으로 칠해 위에서 내린다.
const EYES = [
  { cx: 133, cy: 277, rx: 33, ry: 41 },
  { cx: 306, cy: 291, rx: 42, ry: 46 },
];

const SINK_MS = 450;
const SURFACE_MS = 650;

function Lids() {
  const id = "dvm" + useId().replace(/[^a-zA-Z0-9_-]/g, "");
  return (
    <svg className="dv-mascot__lids" viewBox="0 0 573 640" aria-hidden="true">
      <defs>
        {EYES.map((e, i) => (
          <clipPath key={i} id={`${id}e${i}`}>
            <ellipse cx={e.cx} cy={e.cy} rx={e.rx} ry={e.ry} />
          </clipPath>
        ))}
        <linearGradient id={`${id}g`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#5A97B5" />
          <stop offset="0.5" stopColor="#A6E2EC" />
          <stop offset="1" stopColor="#D8FAF9" />
        </linearGradient>
      </defs>
      {EYES.map((e, i) => (
        <g key={i}>
          <g clipPath={`url(#${id}e${i})`}>
            <rect className="dv-mascot__lid" x={e.cx - e.rx} y={e.cy - e.ry} width={e.rx * 2} height={e.ry * 2} fill={`url(#${id}g)`} />
          </g>
          <path className="dv-mascot__shut" d={`M${e.cx - e.rx * 0.78} ${e.cy + e.ry * 0.3}Q${e.cx} ${e.cy + e.ry * 0.68} ${e.cx + e.rx * 0.78} ${e.cy + e.ry * 0.3}`} />
          <path className="dv-mascot__smile" d={`M${e.cx - e.rx * 0.72} ${e.cy + e.ry * 0.28}Q${e.cx} ${e.cy - e.ry * 0.6} ${e.cx + e.rx * 0.72} ${e.cy + e.ry * 0.28}`} />
        </g>
      ))}
    </svg>
  );
}

type Bubble = { x: number; s: number; dx: number; dy: number; d: number; delay: number };

function Bubbles({ items, size }: { items: Bubble[]; size: number }) {
  return items.map((b, i) => (
    <span
      key={i}
      className="dv-mascot__bubble"
      aria-hidden="true"
      style={{
        "--x": `${b.x}%`, "--s": `${Math.max(5, Math.round(size * b.s))}px`,
        "--dx": `${Math.round(size * b.dx)}px`, "--dy": `${Math.round(size * b.dy)}px`,
        "--d": `${b.d}s`, "--delay": `${b.delay}s`,
      } as CSSProperties}
    />
  ));
}

const SINK_BUBBLES: Bubble[] = [
  { x: 42, s: 0.1, dx: -0.12, dy: -1.1, d: 1.1, delay: 0.1 },
  { x: 58, s: 0.14, dx: 0.1, dy: -1.35, d: 1.3, delay: 0.18 },
  { x: 48, s: 0.08, dx: 0.02, dy: -0.95, d: 1, delay: 0.3 },
];

const CHEER_BUBBLES: Bubble[] = Array.from({ length: 9 }, (_, i) => ({
  x: 44 + (i % 3) * 6,
  s: 0.07 + (i % 4) * 0.025,
  dx: (i / 8 - 0.5) * 1.5,
  dy: -(0.75 + ((i * 5) % 9) / 16),
  d: 0.9 + (i % 3) * 0.2,
  delay: 0.45,
}));

/**
 * 디보 그림. idle이면 둥실 떠 있고 가끔 눈을 깜빡인다.
 * diving이 켜져 있는 동안 가라앉고, 꺼지면 다시 올라온다(다시 뽑기처럼 불러오는 동안 쓴다).
 */
export function Divo({ size = 56, idle = true, diving = false, className }: {
  size?: number;
  idle?: boolean;
  diving?: boolean;
  className?: string;
}) {
  const [phase, setPhase] = useState<"rest" | "down" | "up">("rest");
  const downAt = useRef(0);

  useEffect(() => {
    if (diving) {
      downAt.current = Date.now();
      setPhase("down");
      return;
    }
    if (!downAt.current) return;
    // 가라앉는 동작을 다 보여 준 뒤에 올라온다.
    const wait = Math.max(0, SINK_MS - (Date.now() - downAt.current));
    const up = setTimeout(() => setPhase("up"), wait);
    const rest = setTimeout(() => { downAt.current = 0; setPhase("rest"); }, wait + SURFACE_MS);
    return () => { clearTimeout(up); clearTimeout(rest); };
  }, [diving]);

  return (
    <div className={cn("dv-mascot", className)} style={{ width: size }} data-idle={idle || undefined} data-phase={phase}>
      <div className="dv-mascot__body">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/images/divo.webp" alt="" />
        <Lids />
      </div>
      {phase === "down" && <Bubbles items={SINK_BUBBLES} size={size} />}
    </div>
  );
}

/**
 * 정답일 때 화면 오른쪽 아래에서 튀어 올라와 웃고 다시 내려가는 디보.
 * play 값이 바뀔 때마다 한 번 나온다. 0이면 아무것도 그리지 않는다.
 */
export function DivoCheer({ play, size = 96 }: { play: number; size?: number }) {
  if (!play) return null;
  return (
    <div key={play} className="dv-mascot dv-mascot--cheer" style={{ width: size }}>
      <div className="dv-mascot__body">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/images/divo.webp" alt="" />
        <Lids />
      </div>
      <span className="dv-mascot__say" role="status">도달!</span>
      <Bubbles items={CHEER_BUBBLES} size={size} />
    </div>
  );
}
