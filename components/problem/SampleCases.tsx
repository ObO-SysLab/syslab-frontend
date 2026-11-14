/** Public input/output examples as learners see them; the author preview renders the same component. */
export function SampleCases({ cases }: { cases: { input: string; output: string }[] }) {
  if (!cases.length) return null;
  const box = 'min-h-[100px] whitespace-pre-wrap break-words rounded-lg border border-line bg-canvas p-4 font-mono text-sm leading-6 text-ink';
  return (
    <div className="mt-6 space-y-4" data-sample-cases>
      {cases.map((testcase, i) => {
        const n = cases.length > 1 ? ` ${i + 1}` : '';
        return (
          <div key={i} className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <span className="mb-1 block text-xs font-bold text-ink-muted">&lt;입력 예시{n}&gt;</span>
              <pre className={box}>{testcase.input.replace(/\\n/g, '\n')}</pre>
            </div>
            <div>
              <span className="mb-1 block text-xs font-bold text-ink-muted">&lt;출력 예시{n}&gt;</span>
              <pre className={box}>{testcase.output.replace(/\\n/g, '\n')}</pre>
            </div>
          </div>
        );
      })}
    </div>
  );
}
