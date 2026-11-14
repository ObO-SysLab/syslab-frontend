// 문제·그룹 기본 그림: 번호로 고르는 16×16 픽셀 바다 생물 (고래·새우·돌고래·상어 × 8색)
// 같은 번호는 언제나 같은 그림이다. 번호가 이어지는 32개 안에서는 생물·색 조합이 겹치지 않는다.

export type CritterKind = "whale" | "shrimp" | "dolphin" | "shark";
export type CritterScope = "problem" | "group";

export const CRITTER_KINDS: CritterKind[] = ["whale", "shrimp", "dolphin", "shark"];

export const CRITTER_NAMES: Record<CritterKind, string> = {
  whale: "고래",
  shrimp: "새우",
  dolphin: "돌고래",
  shark: "상어",
};

// 글자 뜻: . 빈칸, o 그림자(지느러미·윤곽), b 몸, l 배, e 눈, w 이빨. 모두 오른쪽을 보고 있다.
const SPRITES: Record<CritterKind, string[]> = {
  whale: [
    "................",
    "................",
    "................",
    "................",
    "........oooo....",
    "oo....oobbbboo..",
    "obo..obbbbbbbbo.",
    ".obooobbbbbbbbbo",
    "..obbbbbbbbbbebo",
    "..obbbbbbbbbbbbo",
    "...obllllllllbo.",
    "....ollllllllo..",
    ".....oooooooo...",
    "......oo........",
    "................",
    "................",
  ],
  shrimp: [
    "................",
    "..........oo....",
    "........oo..o...",
    ".......o.....o..",
    "....oooooo...o..",
    "..oobbbbbboo....",
    ".obllbllblbbo...",
    "obblbblbbbbebo..",
    "obblbblbbbbbbbo.",
    "oblbbobbooooooo.",
    "obbbo.o.o.o.....",
    "oblbo...........",
    ".obbbo..........",
    "..obbbo.........",
    "...oooo.........",
    "................",
  ],
  dolphin: [
    "................",
    "................",
    "........o.......",
    ".......obo......",
    "......obbo......",
    "....oobbbbooo...",
    "...obbbbbbbbbo..",
    "..obbbbbbbbbbbo.",
    ".obbbblllllbbebo",
    ".obbll....olllbo",
    "obbo.......ooooo",
    "obo.............",
    "oo..............",
    "obo.............",
    "................",
    "................",
  ],
  shark: [
    "................",
    "................",
    "......o.........",
    ".....oo.........",
    "....obo.........",
    "o..obbo.........",
    "oooobbbbooooo...",
    ".obbbbbbbbbbboo.",
    "..obbbbbobobbebo",
    ".oobbbbbobobbbbo",
    "oo.olllllllowowo",
    "o...oooooolllo..",
    ".......oo.......",
    "................",
    "................",
    "................",
  ],
};

// 물방울 자리(오른쪽을 볼 때 기준, [열, 행]). 모두 빈칸이다.
const BUBBLE_SETS: Record<CritterKind, [number, number][][]> = {
  whale: [[], [[12, 2], [13, 0]], [[11, 2], [12, 1], [11, 0]], [[2, 2], [4, 1]]],
  shrimp: [[], [[14, 6], [15, 4]], [[14, 11], [13, 13]], [[2, 2], [4, 1]]],
  dolphin: [[], [[13, 3], [14, 1]], [[14, 4], [15, 2], [14, 0]], [[7, 12], [9, 11]]],
  shark: [[], [[12, 3], [13, 1]], [[11, 4], [12, 2], [11, 0]], [[2, 2], [3, 0]]],
};

export type CritterColor = { name: string; body: string; shade: string; belly: string; water: string };

const EYE = "#04121A";
const TOOTH = "#FFFFFF";
const BUBBLE = "#E6F4FF";

// 8색. water는 칸 배경(라이트·다크 테마 모두 같은 짙은 바다색)이다.
export const CRITTER_COLORS: CritterColor[] = [
  { name: "청록", body: "#3DD6F5", shade: "#1C7F96", belly: "#B9F1FC", water: "#0B2230" },
  { name: "민트", body: "#3BE0A0", shade: "#1D8560", belly: "#BDF5DF", water: "#0B2421" },
  { name: "산호", body: "#FF8A5B", shade: "#A84B2A", belly: "#FFD3C0", water: "#26161A" },
  { name: "분홍", body: "#FF7BAC", shade: "#A6416A", belly: "#FFD0E2", water: "#26141F" },
  { name: "노랑", body: "#FFD15C", shade: "#A3802A", belly: "#FFF0C4", water: "#221E14" },
  { name: "보라", body: "#B89CFF", shade: "#6A52B3", belly: "#E6DCFF", water: "#18162C" },
  { name: "파랑", body: "#6E98FF", shade: "#3653A8", belly: "#D2DFFF", water: "#111A30" },
  { name: "은빛", body: "#CFDBE6", shade: "#71859A", belly: "#F4F8FB", water: "#141C26" },
];

// 0~31 순서표. 값 v → 생물 v % 4, 색 v >> 2. 이웃한 둘은 생물·색이 다르고, 세 칸 안에서는 색이 다르다.
const ORDER = [16, 23, 30, 4, 3, 22, 9, 12, 7, 25, 2, 11, 5, 26, 0, 17, 10, 20, 1, 14, 27, 8, 29, 18, 15, 21, 28, 19, 13, 24, 31, 6];

// 그룹은 순서표를 다른 자리에서 시작해 같은 번호의 문제와 다른 그림이 나오게 한다.
const SCOPE_OFFSET: Record<CritterScope, number> = { problem: 0, group: 13 };

function mix32(n: number): number {
  let h = n >>> 0;
  h ^= h >>> 16;
  h = Math.imul(h, 0x85ebca6b);
  h ^= h >>> 13;
  h = Math.imul(h, 0xc2b2ae35);
  h ^= h >>> 16;
  return h >>> 0;
}

function seedNumber(id: number | string | null | undefined): number {
  if (typeof id === "number" && Number.isFinite(id)) return Math.abs(Math.trunc(id));
  const text = String(id ?? "");
  if (/^\d+$/.test(text)) return Number(text);
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 0x01000193);
  return h >>> 0;
}

export type Critter = {
  kind: CritterKind;
  color: CritterColor;
  flipped: boolean;
  bubbles: [number, number][];
  label: string;
};

export function pickCritter(id: number | string | null | undefined, scope: CritterScope = "problem"): Critter {
  const n = seedNumber(id);
  const v = ORDER[(n + SCOPE_OFFSET[scope]) % 32];
  const kind = CRITTER_KINDS[v % 4];
  const color = CRITTER_COLORS[v >> 2];
  const h = mix32(n + (scope === "group" ? 0x9e3779b9 : 0));
  const flipped = (h & 1) === 1;
  const bubbles = BUBBLE_SETS[kind][(h >>> 1) % 4].map(([x, y]) => [flipped ? 15 - x : x, y] as [number, number]);
  return { kind, color, flipped, bubbles, label: `${color.name} ${CRITTER_NAMES[kind]}` };
}

export type CritterLayer = { fill: string; d: string; opacity?: number };

// 같은 색 칸을 한 path로 묶는다(가로로 이어진 칸은 한 덩어리).
export function critterLayers(c: Critter): CritterLayer[] {
  const rows = SPRITES[c.kind];
  const runs: Record<string, string[]> = { o: [], b: [], l: [], e: [], w: [] };
  rows.forEach((row, y) => {
    const line = c.flipped ? [...row].reverse().join("") : row;
    let x = 0;
    while (x < 16) {
      const ch = line[x];
      if (!(ch in runs)) { x++; continue; }
      let end = x + 1;
      while (end < 16 && line[end] === ch) end++;
      runs[ch].push(`M${x} ${y}h${end - x}v1h${x - end}z`);
      x = end;
    }
  });
  const layers: CritterLayer[] = [
    { fill: c.color.shade, d: runs.o.join("") },
    { fill: c.color.body, d: runs.b.join("") },
    { fill: c.color.belly, d: runs.l.join("") },
    { fill: EYE, d: runs.e.join("") },
    { fill: TOOTH, d: runs.w.join("") },
  ];
  if (c.bubbles.length) layers.push({ fill: BUBBLE, opacity: 0.55, d: c.bubbles.map(([x, y]) => `M${x} ${y}h1v1h-1z`).join("") });
  return layers.filter((l) => l.d);
}

export const __test = { SPRITES, BUBBLE_SETS, ORDER, seedNumber };
