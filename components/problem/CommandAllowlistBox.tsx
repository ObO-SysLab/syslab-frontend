import { Zap } from "lucide-react";

/** Commands a restricted practice image lets the solver run. */
export function CommandAllowlistBox({ commands }: { commands: string[] }) {
  return (
    <section aria-labelledby="command-allowlist-title" className="mt-8 p-6 bg-deep rounded-2xl space-y-3 shadow-lg border border-line">
      <h3 id="command-allowlist-title" className="text-sm font-black text-ink flex items-center gap-2">
        <Zap className="w-4 h-4 text-success fill-success" aria-hidden="true" /> 허용 명령어
      </h3>
      <ul className="flex flex-wrap gap-2">
        {commands.map(command => (
          <li key={command}>
            <code className="bg-raised text-success px-2 py-1 rounded text-xs font-mono border border-line">{command}</code>
          </li>
        ))}
      </ul>
    </section>
  );
}
