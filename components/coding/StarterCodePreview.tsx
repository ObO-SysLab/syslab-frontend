'use client';
import Editor from '@monaco-editor/react';
import { useState } from 'react';
import type { CodingContract } from '@/components/obo/guidance/codingContract';
import { editorLanguages, editorStarterCode, LANGUAGE_LABEL } from './starterCode';

/**
 * Read-only copy of the submission editor's first screen for the author's learner preview.
 * Same code (editorStarterCode), language order, theme and font as app/challenges/editor.
 */
export function StarterCodePreview({ contract, allowedLanguages }: { contract: CodingContract | null; allowedLanguages?: string[] }) {
  const languages = editorLanguages(allowedLanguages);
  const [chosen, setChosen] = useState(languages[0]);
  const language = languages.includes(chosen) ? chosen : languages[0];
  const code = editorStarterCode(language, contract);
  const height = Math.min(480, Math.max(192, code.split('\n').length * 24 + 48));
  return (
    <div className="overflow-hidden rounded-2xl border border-line bg-deep shadow-sm" data-starter-preview={language}>
      <div className="flex flex-wrap items-center gap-1 border-b border-line bg-panel px-3 py-2">
        <span className="mr-1 text-xs font-bold text-ink">언어:</span>
        {languages.map(value => (
          <button key={value} type="button" aria-pressed={value === language} onClick={() => setChosen(value)}
            className={`rounded-lg px-3 py-1 font-mono text-xs font-bold transition-colors ${value === language ? 'bg-primary/15 text-primary' : 'text-ink-muted hover:bg-raised hover:text-ink'}`}>
            {LANGUAGE_LABEL[value]}
          </button>
        ))}
      </div>
      <Editor
        key={language}
        height={height}
        language={language}
        theme="vs-dark"
        value={code}
        loading={<pre className="h-full w-full overflow-auto bg-[#1e1e1e] p-6 font-mono text-sm text-white">{code}</pre>}
        options={{
          readOnly: true,
          domReadOnly: true,
          minimap: { enabled: false },
          fontSize: 15,
          lineHeight: 24,
          fontFamily: "Fira Code, Menlo, Monaco, 'Courier New', monospace",
          lineNumbers: 'on',
          scrollBeyondLastLine: false,
          automaticLayout: true,
          padding: { top: 24, bottom: 24 },
        }}
      />
    </div>
  );
}
