"use client";

import Link from "next/link";
import { Bell, LogOut, Menu, Trophy, Users, BarChart3, ShoppingBag, Flag, Search } from "lucide-react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";

interface HeaderProps {
  isLoggedIn: boolean;
  userImgUrl: string;
  onLogout: () => void;
  activeMenu?: "home" | "challenge" | "contest" | "group" | "ranking" | "store" | "none";
  showSearch?: boolean;
  searchTerm?: string;
  onSearchChange?: (value: string) => void;
}

export function Header({
  isLoggedIn,
  userImgUrl,
  onLogout,
  activeMenu = "none",
  showSearch,
  searchTerm,
  onSearchChange
}: HeaderProps) {
  // showSearch prop을 전달했으면 그 값을 따르고, 안 넘겼으면 onSearchChange 유무로 자동 판별
  const isSearchVisible = showSearch ?? Boolean(onSearchChange);

  return (
    <header className="sticky top-0 z-50 w-full border-b border-line bg-canvas/80 backdrop-blur-md px-6 h-16 flex items-center justify-between">
      {/* [A] 좌측 로고 & 네비게이션 */}
      <div className="flex items-center gap-6">
        <Menu className="h-6 w-6 text-ink-muted cursor-pointer lg:hidden" aria-label="메뉴" />
        <Link href="/" className="flex items-center gap-2 mr-2" aria-label="DiveOn 홈">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/images/divo.webp" alt="" className="h-8 w-auto" />
          <span className="text-xl font-extrabold tracking-[-0.03em] text-ink">
            Dive<span className="text-primary">On</span>
          </span>
        </Link>

        <nav className="hidden lg:flex items-center gap-1">
          <NavMenuLink href="/challenges" icon={<Flag size={16} />} label="챌린지" active={activeMenu === "challenge"} />
          <NavMenuLink href="/contests" icon={<Trophy size={16} />} label="대회" active={activeMenu === "contest"} />
          <NavMenuLink href="/groups" icon={<Users size={16} />} label="그룹" active={activeMenu === "group"} />
          <NavMenuLink href="/ranking" icon={<BarChart3 size={16} />} label="랭킹" active={activeMenu === "ranking"} />
          <NavMenuLink href="/store" icon={<ShoppingBag size={16} />} label="스토어" active={activeMenu === "store"} />
        </nav>
      </div>

      {/* [B] 중앙 검색창 영역 (isSearchVisible이 false이면 invisible 처리하여 레이아웃 여백 유지를 보장) */}
      <div className={`flex-1 max-w-sm px-4 ${isSearchVisible ? "block" : "invisible pointer-events-none"}`}>
        <div className="relative">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-ink-subtle" />
          {onSearchChange ? (
            <Input
              type="search"
              placeholder="검색..."
              value={searchTerm ?? ""}
              onChange={(e) => onSearchChange(e.target.value)}
              className="pl-9 bg-panel border-line text-ink placeholder:text-ink-subtle rounded-full h-9 text-sm focus-visible:ring-primary"
            />
          ) : (
            <Input
              type="search"
              placeholder="검색..."
              className="pl-9 bg-panel border-line text-ink placeholder:text-ink-subtle rounded-full h-9 text-sm focus-visible:ring-primary"
            />
          )}
        </div>
      </div>

      {/* [C] 우측 프로필 / 로그인 버튼 */}
      <div className="flex items-center gap-2">
        {isLoggedIn ? (
          <>
            <button className="p-2 hover:bg-raised rounded-full transition-colors relative group" aria-label="알림">
              <Bell className="h-5 w-5 text-ink-muted group-hover:text-ink" />
              <span className="absolute top-2 right-2 w-2 h-2 bg-danger rounded-full ring-2 ring-canvas"></span>
            </button>

            <Link href="/settings" aria-label="대원 프로필">
              <Avatar className="h-9 w-9 border border-line-strong hover:ring-2 hover:ring-primary/50 transition-all cursor-pointer">
                <AvatarImage src={userImgUrl} alt="User Profile" className="object-cover" />
                <AvatarFallback className="bg-raised text-xs font-bold text-ink-muted rounded-full" />
              </Avatar>
            </Link>

            <button
              onClick={onLogout}
              className="p-2 hover:bg-danger-soft rounded-full text-ink-muted hover:text-danger transition-colors"
              aria-label="로그아웃"
            >
              <LogOut className="h-5 w-5" />
            </button>
          </>
        ) : (
          <div className="flex items-center gap-2">
            <Link
              href="/signin"
              className="inline-flex h-9 items-center px-4 rounded-full text-sm font-semibold text-ink-muted hover:text-ink hover:bg-raised transition-colors"
            >
              로그인
            </Link>
            <Link
              href="/signup"
              className="inline-flex h-9 items-center px-4 rounded-full bg-primary text-primary-ink text-sm font-bold hover:bg-primary-hover transition-colors"
            >
              시작하기
            </Link>
          </div>
        )}
      </div>
    </header>
  );
}

function NavMenuLink({ href, icon, label, active = false }: { href: string; icon: React.ReactNode; label: string; active?: boolean }) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={`flex items-center gap-2 px-3.5 py-2 rounded-[10px] text-sm font-semibold transition-colors ${
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
