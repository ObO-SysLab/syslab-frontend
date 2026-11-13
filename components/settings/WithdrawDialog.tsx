"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { AUTH_CHANGED, clearAuthentication } from "@/lib/authSession";

// 계정 탈퇴: 현재 닉네임을 입력해 확인한다. 막히는 경우(그룹장·대회 주최)는 서버가 이유를 돌려준다.
export function WithdrawDialog({ open, onOpenChange, nickname }: { open: boolean; onOpenChange: (open: boolean) => void; nickname: string }) {
  const [typed, setTyped] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const submit = async () => {
    setBusy(true);
    setError("");
    try {
      const res = await fetch("https://diveon.net/api/users/me/withdraw", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${localStorage.getItem("token")}` },
        body: JSON.stringify({ nickname: typed.trim() }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        setError(body?.detail || body?.message || "탈퇴하지 못했습니다. 잠시 후 다시 시도해 주세요.");
        return;
      }
      // 서버 세션은 이미 끊겼으므로(리프레시 토큰 삭제) 이 브라우저의 인증 정보만 지운다.
      clearAuthentication(localStorage, sessionStorage);
      window.dispatchEvent(new Event(AUTH_CHANGED));
      window.location.replace("/");
    } catch {
      setError("서버에 연결하지 못했습니다.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!busy) { onOpenChange(v); setTyped(""); setError(""); } }}>
      <DialogContent className="rounded-[1.5rem] sm:max-w-[440px]">
        <DialogHeader>
          <DialogTitle className="text-xl font-black">계정 탈퇴</DialogTitle>
          <DialogDescription asChild>
            <div className="space-y-2 text-sm text-ink-muted">
              <p>이메일·이름·프로필 사진 등 개인정보와 알림, 포인트를 쓸 수 없게 되고 되돌릴 수 없습니다.</p>
              <p>낸 문제·제출·댓글은 &lsquo;탈퇴한 사용자&rsquo; 이름으로 남습니다.</p>
            </div>
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <label htmlFor="withdraw-nickname" className="text-sm font-bold">
            확인을 위해 닉네임 <b className="text-danger">{nickname}</b>을(를) 입력하세요
          </label>
          <Input id="withdraw-nickname" value={typed} onChange={(e) => setTyped(e.target.value)} autoComplete="off" className="rounded-xl h-11" />
          {error && <p className="text-sm text-danger">{error}</p>}
        </div>
        <DialogFooter className="flex-row gap-2 sm:justify-end">
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={busy} className="rounded-xl font-bold">취소</Button>
          <Button
            onClick={submit}
            disabled={busy || !nickname || typed.trim() !== nickname}
            className="rounded-xl font-bold bg-danger text-white hover:bg-danger/90"
          >
            {busy ? "탈퇴 중..." : "탈퇴"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
