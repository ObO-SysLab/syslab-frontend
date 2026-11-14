import { Fragment, type ReactNode } from 'react';

/**
 * Problem statements as authors write them: plain text with three Markdown marks.
 * ```fenced``` blocks keep a monospace layout (ASCII diagrams, code), `inline code` and **bold**
 * are styled, and a leading "* " becomes a bullet. Everything else stays literal text, so React
 * still escapes it and old statements without marks render exactly as before.
 */
const INLINE = /(`[^`\n]+`|\*\*[^*\n]+?\*\*)/g;

function inline(text: string, key: string): ReactNode[] {
  return text.split(INLINE).map((part, i) => {
    if (part.length > 2 && part.startsWith('`') && part.endsWith('`'))
      return <code key={`${key}-${i}`} className="rounded bg-raised px-1 py-0.5 font-mono text-[0.9em]">{part.slice(1, -1)}</code>;
    if (part.length > 4 && part.startsWith('**') && part.endsWith('**'))
      return <strong key={`${key}-${i}`} className="font-bold">{part.slice(2, -2)}</strong>;
    return <Fragment key={`${key}-${i}`}>{part}</Fragment>;
  });
}

const bullets = (text: string) => text.replace(/^([ \t]*)\* (?=\S)/gm, '$1• ');

type Block = { code: boolean; text: string };

export function problemTextBlocks(text: string): Block[] {
  const blocks: Block[] = [];
  const lines = text.replace(/\r\n?/g, '\n').split('\n');
  let prose: string[] = [];
  for (let i = 0; i < lines.length; i++) {
    const close = /^\s*```/.test(lines[i]) ? lines.findIndex((line, j) => j > i && /^\s*```\s*$/.test(line)) : -1;
    if (close === -1) { prose.push(lines[i]); continue; }
    if (prose.length) blocks.push({ code: false, text: prose.join('\n') });
    blocks.push({ code: true, text: lines.slice(i + 1, close).join('\n') });
    prose = [];
    i = close;
  }
  if (prose.length) blocks.push({ code: false, text: prose.join('\n') });
  // Blank lines next to a code block would add a second gap on top of its margin.
  return blocks.map(b => (b.code ? b : { ...b, text: b.text.replace(/^\n+|\n+$/g, '') })).filter(b => b.code || b.text);
}

export function ProblemText({ text, className = '' }: { text?: string | null; className?: string }) {
  if (!text) return null;
  return (
    <div className={`break-words ${className}`} data-problem-text>
      {problemTextBlocks(text).map((block, i) => block.code
        ? <pre key={i} className="my-3 overflow-x-auto rounded-lg border border-line bg-canvas p-3 font-mono text-[13px] leading-6 whitespace-pre"><code>{block.text}</code></pre>
        : <p key={i} className="whitespace-pre-wrap">{inline(bullets(block.text), String(i))}</p>)}
    </div>
  );
}

/** For one-line places such as objective choices: inline marks only. */
export function ProblemInline({ text }: { text?: string | null }) {
  return text ? <>{inline(bullets(text), 'inline')}</> : null;
}
