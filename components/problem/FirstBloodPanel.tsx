import { Flame } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

/**
 * First solver of a problem. Until someone solves it the card invites the reader to be first
 * (2026-11-14: it used to draw an empty avatar because the empty state was an object, not null).
 */
export function FirstBloodPanel({ user, date }: { user?: string | null; date?: string | null }) {
  return (
    <Card className="shadow-none border-line overflow-hidden" data-first-blood>
      <CardHeader className="pb-2 bg-raised/50">
        <CardTitle className="text-sm font-bold flex items-center gap-2 text-ink">
          <Flame className="h-4 w-4 text-danger" /> First Blood
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-4">
        {user ? (
          <div className="flex items-center justify-between gap-2">
            <div className="flex min-w-0 items-center gap-3">
              <div className="relative shrink-0">
                <div className="h-10 w-10 rounded-full bg-line flex items-center justify-center overflow-hidden border border-line">
                  <span className="text-xs font-bold text-ink-muted">{user[0]}</span>
                </div>
                <div className="absolute -bottom-1 -right-1 bg-danger rounded-full p-0.5 border-2 border-panel">
                  <Flame className="h-2 w-2 text-white" />
                </div>
              </div>
              <span className="truncate font-semibold text-sm text-ink leading-none">{user}</span>
            </div>
            {date && <span className="shrink-0 text-xs text-ink-subtle font-medium tracking-tight">{date}</span>}
          </div>
        ) : (
          <div className="space-y-1 py-2 text-center">
            <p className="text-sm font-semibold text-ink">첫 번째 해결자가 되어 보세요</p>
            <p className="text-xs text-ink-subtle">아직 푼 사람이 없습니다.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
