"use client";

import { useState } from "react";
import Link from "next/link";
import { Dialog as DialogPrimitive } from "radix-ui";
import { LogOut, Menu, Trophy, Users, BarChart3, ShoppingBag, Flag, Search, UserRound, X } from "lucide-react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { BrandMark } from "@/components/BrandMark";

type MenuKey = "home" | "challenge" | "contest" | "group" | "ranking" | "store" | "none";

interface HeaderProps {
  isLoggedIn: boolean;
  userImgUrl: string;
  onLogout: () => void;
  activeMenu?: MenuKey;
  /** studio: 출제 화면. 메뉴 대신 "Studio" 표시 */
  variant?: "default" | "studio";
  /** 검색창은 실제로 검색하는 페이지(onSearchChange를 넘긴 곳)에만 나온다 */
  searchTerm?: string;
  onSearchChange?: (value: string) => void;
  /** 예전 호출부 호환용 — 더는 쓰지 않는다 */
  showSearch?: boolean;
}

const MENUS: { key: MenuKey; href: string; label: string; icon: React.ReactNode }[] = [
  { key: "challenge", href: "/challenges", label: "챌린지", icon: <Flag size={16} /> },
  { key: "contest", href: "/contests", label: "대회", icon: <Trophy size={16} /> },
  { key: "group", href: "/groups", label: "그룹", icon: <Users size={16} /> },
  { key: "ranking", href: "/ranking", label: "랭킹", icon: <BarChart3 size={16} /> },
  { key: "store", href: "/store", label: "스토어", icon: <ShoppingBag size={16} /> },
];

export function Header({
  isLoggedIn,
  userImgUrl,
  onLogout,
  activeMenu = "none",
  variant = "default",
  searchTerm,
  onSearchChange,
}: HeaderProps) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const isStudio = variant === "studio";

  return (
    <header className="sticky top-0 z-50 w-full border-b border-line bg-canvas/80 backdrop-blur-md h-16">
      <div className="h-full px-4 sm:px-6 flex items-center justify-between gap-4">
        {/* [A] 좌측: (모바일 메뉴) 로고 · 메뉴 */}
        <div className="flex items-center gap-3 lg:gap-6 min-w-0">
          {!isStudio && (
            <MobileDrawer
              open={drawerOpen}
              onOpenChange={setDrawerOpen}
              activeMenu={activeMenu}
              isLoggedIn={isLoggedIn}
              onLogout={onLogout}
              searchTerm={searchTerm}
              onSearchChange={onSearchChange}
            />
          )}
          <Link href="/" className="flex items-center gap-2 shrink-0" aria-label="DiveOn 홈">
            <BrandMark />
            {isStudio && <span className="dv-hud text-primary">Studio</span>}
          </Link>

          {!isStudio && (
            <nav className="hidden lg:flex items-center gap-1" aria-label="주 메뉴">
              {MENUS.map((m) => (
                <NavMenuLink key={m.key} href={m.href} icon={m.icon} label={m.label} active={activeMenu === m.key} />
              ))}
            </nav>
          )}
        </div>

        {/* [B] 검색 — 검색 핸들러가 있는 페이지만 */}
        {onSearchChange && (
          <div className="hidden sm:block flex-1 max-w-sm">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-ink-subtle" />
              <Input
                type="search"
                placeholder="검색"
                aria-label="검색"
                value={searchTerm ?? ""}
                onChange={(e) => onSearchChange(e.target.value)}
                className="pl-9 bg-panel border-line text-ink placeholder:text-ink-subtle rounded-full h-9 text-sm focus-visible:ring-primary"
              />
            </div>
          </div>
        )}

        {/* [C] 우측: 프로필 / 로그인 */}
        <div className="flex items-center gap-1.5 shrink-0">
          {isLoggedIn ? (
            <>
              <Link href="/settings" aria-label="내 프로필" className="rounded-full">
                <Avatar className="h-9 w-9 border border-line-strong hover:ring-2 hover:ring-primary/50 transition-all">
                  {userImgUrl && <AvatarImage src={userImgUrl} alt="" className="object-cover" />}
                  <AvatarFallback className="bg-raised text-ink-muted rounded-full">
                    <UserRound className="h-4 w-4" aria-hidden />
                  </AvatarFallback>
                </Avatar>
              </Link>
              <button
                type="button"
                onClick={onLogout}
                className="p-2 hover:bg-danger-soft rounded-full text-ink-muted hover:text-danger transition-colors"
                aria-label="로그아웃"
              >
                <LogOut className="h-5 w-5" />
              </button>
            </>
          ) : (
            <>
              <Link
                href="/signin"
                className="inline-flex h-9 items-center px-3 sm:px-4 rounded-full text-sm font-semibold whitespace-nowrap text-ink-muted hover:text-ink hover:bg-raised transition-colors"
              >
                로그인
              </Link>
              <Link
                href="/signup"
                className="inline-flex h-9 items-center px-3 sm:px-4 rounded-full bg-primary text-primary-ink text-sm font-bold whitespace-nowrap hover:bg-primary-hover transition-colors"
              >
                시작하기
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

/* 1024px 미만: 햄버거 → 왼쪽 서랍 메뉴 */
function MobileDrawer({
  open,
  onOpenChange,
  activeMenu,
  isLoggedIn,
  onLogout,
  searchTerm,
  onSearchChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  activeMenu: MenuKey;
  isLoggedIn: boolean;
  onLogout: () => void;
  searchTerm?: string;
  onSearchChange?: (value: string) => void;
}) {
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Trigger asChild>
        <button
          type="button"
          className="lg:hidden -ml-2 p-2 rounded-lg text-ink-muted hover:text-ink hover:bg-raised transition-colors"
          aria-label="메뉴 열기"
        >
          <Menu className="h-5 w-5" />
        </button>
      </DialogPrimitive.Trigger>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-[60] bg-black/60 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=closed]:animate-out data-[state=closed]:fade-out-0" />
        <DialogPrimitive.Content
          className="fixed inset-y-0 left-0 z-[61] w-72 max-w-[85vw] bg-panel border-r border-line p-4 flex flex-col gap-6 outline-none data-[state=open]:animate-in data-[state=open]:slide-in-from-left data-[state=closed]:animate-out data-[state=closed]:slide-out-to-left"
          aria-describedby={undefined}
        >
          <div className="flex items-center justify-between">
            <DialogPrimitive.Title asChild>
              <Link href="/" onClick={() => onOpenChange(false)} aria-label="DiveOn 홈">
                <BrandMark size="sm" />
              </Link>
            </DialogPrimitive.Title>
            <DialogPrimitive.Close
              className="p-2 rounded-lg text-ink-muted hover:text-ink hover:bg-raised transition-colors"
              aria-label="메뉴 닫기"
            >
              <X className="h-5 w-5" />
            </DialogPrimitive.Close>
          </div>

          {/* 640px 미만에서는 헤더에 검색창 자리가 없어 서랍 안에 둔다 */}
          {onSearchChange && (
            <div className="relative sm:hidden">
              <Search className="absolute left-3 top-3 h-4 w-4 text-ink-subtle" />
              <Input
                type="search"
                placeholder="검색"
                aria-label="검색"
                value={searchTerm ?? ""}
                onChange={(e) => onSearchChange(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") onOpenChange(false); }}
                className="pl-9 h-10 bg-canvas border-line text-ink placeholder:text-ink-subtle rounded-full text-sm focus-visible:ring-primary"
              />
            </div>
          )}

          <nav className="flex flex-col gap-1" aria-label="주 메뉴">
            {MENUS.map((m) => (
              <Link
                key={m.key}
                href={m.href}
                onClick={() => onOpenChange(false)}
                aria-current={activeMenu === m.key ? "page" : undefined}
                className={`flex items-center gap-3 h-11 px-3 rounded-[10px] text-[15px] font-semibold transition-colors ${
                  activeMenu === m.key ? "text-primary bg-primary-soft" : "text-ink-muted hover:text-ink hover:bg-raised"
                }`}
              >
                {m.icon}
                {m.label}
              </Link>
            ))}
          </nav>

          <div className="mt-auto pt-4 border-t border-line flex flex-col gap-2">
            {isLoggedIn ? (
              <>
                <Link
                  href="/settings"
                  onClick={() => onOpenChange(false)}
                  className="flex items-center h-11 px-3 rounded-[10px] text-sm font-semibold text-ink-muted hover:text-ink hover:bg-raised transition-colors"
                >
                  내 프로필
                </Link>
                <button
                  type="button"
                  onClick={() => { onOpenChange(false); onLogout(); }}
                  className="flex items-center gap-2 h-11 px-3 rounded-[10px] text-sm font-semibold text-ink-muted hover:text-danger hover:bg-danger-soft transition-colors"
                >
                  <LogOut className="h-4 w-4" /> 로그아웃
                </button>
              </>
            ) : (
              <>
                <Link
                  href="/signup"
                  onClick={() => onOpenChange(false)}
                  className="inline-flex h-11 items-center justify-center rounded-full bg-primary text-primary-ink text-sm font-bold hover:bg-primary-hover transition-colors"
                >
                  시작하기
                </Link>
                <Link
                  href="/signin"
                  onClick={() => onOpenChange(false)}
                  className="inline-flex h-11 items-center justify-center rounded-full border border-line-strong text-sm font-semibold text-ink hover:bg-raised transition-colors"
                >
                  로그인
                </Link>
              </>
            )}
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

function NavMenuLink({ href, icon, label, active = false }: { href: string; icon: React.ReactNode; label: string; active?: boolean }) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={`flex items-center gap-2 px-3.5 py-2 rounded-[10px] text-sm font-semibold whitespace-nowrap transition-colors ${
        active
          ? "text-primary bg-primary-soft"
          : "text-ink-muted hover:text-ink hover:bg-raised"
      }`}
    >
      <span>{icon}</span>
      {label}
    </Link>
  );
}
