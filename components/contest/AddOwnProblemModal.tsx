"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { authHeaders, requestJson, RequestFailure } from "@/lib/request";
import { filterOwnProblems, type OwnProblem } from "@/lib/contestProblems";

const API = "https://diveon.net/api";
const MAX_PAGES = 10;

// 주최자가 직접 출제한 문제를 대회에 추가한다. 서버도 출제자 본인 문제만 받는다.
export function AddOwnProblemModal({
  contestId,
  existingProblemIds,
  onClose,
  onAdded,
}: {
  contestId: string;
  existingProblemIds: number[];
  onClose: () => void;
  onAdded: () => void;
}) {
  const [problems, setProblems] = useState<OwnProblem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [query, setQuery] = useState("");
  const [added, setAdded] = useState<Set<number>>(() => new Set(existingProblemIds));
  const [busyId, setBusyId] = useState<number | null>(null);
  const [rowError, setRowError] = useState<{ id: number; message: string } | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const all: OwnProblem[] = [];
        for (let page = 1; page <= MAX_PAGES; page++) {
          const json = await requestJson<any>(`${API}/profile/problems/authored?page=${page}`, { headers: authHeaders() });
          const data = json?.data;
          all.push(...(data?.problems ?? []));
          if (!data || page >= (data.totalPages ?? 1)) break;
        }
        if (alive) setProblems(all);
      } catch (error) {
        if (alive) setLoadError(error instanceof RequestFailure ? error.issue.message : "내 문제를 불러오지 못했습니다.");
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, []);

  const visible = useMemo(() => filterOwnProblems(problems, query), [problems, query]);

  const addProblem = async (problemId: number) => {
    setBusyId(problemId);
    setRowError(null);
    try {
      await requestJson(`${API}/contests/${contestId}/problems`, {
        method: "POST",
        headers: { ...authHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({ problemId, points: 100 }),
      }, { allowEmpty: true });
      setAdded((prev) => new Set(prev).add(problemId));
      onAdded();
    } catch (error) {
      if (error instanceof RequestFailure && error.issue.status === 409) {
        setAdded((prev) => new Set(prev).add(problemId));
        onAdded();
      } else {
        setRowError({ id: problemId, message: error instanceof RequestFailure ? error.issue.message : "추가하지 못했습니다." });
      }
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <Card className="w-full max-w-3xl max-h-[85vh] flex flex-col shadow-2xl animate-in zoom-in-95 duration-200">
        <CardHeader className="flex flex-row items-center justify-between border-b pb-4 shrink-0 bg-panel rounded-t-xl">
          <div className="space-y-1">
            <CardTitle className="text-lg">기존 문제 추가</CardTitle>
            <CardDescription>내가 출제한 문제를 대회에 추가합니다.</CardDescription>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} aria-label="닫기">
            <X className="w-5 h-5 text-ink-muted" />
          </Button>
        </CardHeader>

        <div className="p-4 border-b bg-canvas shrink-0">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-ink-subtle" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="문제 번호, 제목 또는 카테고리"
              className="pl-9 bg-panel"
            />
          </div>
        </div>

        <CardContent className="overflow-y-auto p-0 flex-1 hide-scrollbar">
          {loading ? (
            <p className="py-12 text-center text-sm text-ink-subtle">불러오는 중...</p>
          ) : loadError ? (
            <p className="py-12 text-center text-sm text-danger">{loadError}</p>
          ) : visible.length === 0 ? (
            <p className="py-12 text-center text-sm text-ink-subtle">
              {problems.length === 0 ? "출제한 문제가 없습니다." : "검색 결과가 없습니다."}
            </p>
          ) : (
            <Table>
              <TableHeader className="bg-canvas sticky top-0 z-10 shadow-sm">
                <TableRow>
                  <TableHead className="pl-6 w-24">번호</TableHead>
                  <TableHead>문제명</TableHead>
                  <TableHead>카테고리</TableHead>
                  <TableHead className="text-right pr-6">추가</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {visible.map((p) => {
                  const isAdded = added.has(p.probId);
                  return (
                    <TableRow key={p.probId}>
                      <TableCell className="font-mono text-xs text-ink-muted pl-6">#{p.probId}</TableCell>
                      <TableCell className="font-bold text-ink">
                        {p.title}
                        {rowError?.id === p.probId && <p className="mt-1 text-xs font-medium text-danger">{rowError.message}</p>}
                      </TableCell>
                      <TableCell><Badge variant="outline" className="text-xs">{p.category}</Badge></TableCell>
                      <TableCell className="text-right pr-6">
                        {isAdded ? (
                          <span className="inline-flex items-center gap-1 text-xs font-semibold text-success">
                            <Check className="h-3.5 w-3.5" aria-hidden /> 추가됨
                          </span>
                        ) : (
                          <Button
                            size="sm"
                            className="bg-raised border border-line-strong text-ink hover:bg-line h-8 text-xs"
                            disabled={busyId !== null}
                            onClick={() => addProblem(p.probId)}
                          >
                            {busyId === p.probId ? "추가 중..." : "추가하기"}
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
