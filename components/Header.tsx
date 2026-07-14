"use client";

import Link from "next/link";
import { Bell, LogOut, Menu, Trophy, Users, BarChart3, ShoppingBag, Flag, Search } from "lucide-react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface HeaderProps {
	isLoggedIn: boolean;
	userImgUrl: string;
	onLogout: () => void;
	activeMenu: "home" | "challenge" | "contest" | "group" | "ranking" | "store";
}

export function Header({ isLoggedIn, userImgUrl, onLogout, activeMenu }: HeaderProps) {
	return (
		<header className="sticky top-0 z-50 w-full border-b border-slate-100 bg-white/80 backdrop-blur-md px-6 h-16 flex items-center justify-between">
			<div className="flex items-center gap-8">
				<Menu className="h-6 w-6 text-slate-400 cursor-pointer lg:hidden" />
				<Link href="/" className="text-2xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-[#00A3FF] to-[#0066FF] mr-4">
					DiveOn
				</Link>

				<nav className="hidden lg:flex items-center gap-1">
					<NavMenuLink href="/challenges" icon={<Flag size={18} />} label="챌린지" active={activeMenu === "challenge"} />
					<NavMenuLink href="/contests" icon={<Trophy size={18} />} label="대회" active={activeMenu === "contest"} />
					<NavMenuLink href="/groups" icon={<Users size={18} />} label="그룹" active={activeMenu === "group"} />
					<NavMenuLink href="/ranking" icon={<BarChart3 size={18} />} label="랭킹" active={activeMenu === "ranking"} />
					<NavMenuLink href="/store" icon={<ShoppingBag size={18} />} label="스토어" active={activeMenu === "store"} />
				</nav>
			</div>

			<div className="flex-1 max-w-sm px-4">
				<div className="relative">
					<Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
					<Input
						type="search"
						placeholder="검색..."
						className="pl-9 bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400 rounded-full h-9 text-sm focus-visible:ring-[#00A3FF]"
					/>
				</div>
			</div>

			<div className="flex items-center gap-3">
				{isLoggedIn ? (
					/* --- 로그인된 상태: 알림 + 프로필(동글) + 로그아웃 --- */
					<>
						<button className="p-2 hover:bg-white/5 rounded-full transition-colors relative group">
							<Bell className="h-5 w-5 text-slate-400 group-hover:text-slate-200" />
							<span className="absolute top-2 right-2 w-2 h-2 bg-[#FF4B72] rounded-full border-2 border-[#0E141B]"></span>
						</button>

						<Link href="/settings">
							<Avatar className="h-9 w-9 border border-slate-200 hover:ring-2 hover:ring-indigo-100 transition-all cursor-pointer">
								<AvatarImage src={userImgUrl} alt="User Profile" className="object-cover" />
								<AvatarFallback className="bg-transparent text-xs font-bold text-slate-600 rounded-full">
									{/* 공백 상태 유지 */}
								</AvatarFallback>
							</Avatar>
						</Link>

						<button
							onClick={onLogout}
							className="p-2 hover:bg-red-50 rounded-full text-red-500 transition-colors group"
						>
							<LogOut className="h-5 w-5 group-hover:scale-110 transition-transform" />
						</button>
					</>
				) : (
					/* --- 로그아웃된 상태: 로그인 / 시작하기 버튼 --- */
					<div className="flex items-center gap-2">
						<Link href="/signin">
							<Button variant="ghost" className="text-sm font-bold text-slate-600">Sign In</Button>
						</Link>
						<Link href="/signup">
							<Button className="bg-slate-900 text-white text-sm font-bold rounded-full px-5 shadow-lg shadow-slate-200">
								Get Started
							</Button>
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
			className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all active:scale-95 ${active
					? "text-indigo-600 bg-indigo-50"
					: "text-slate-400 hover:text-slate-900 hover:bg-slate-50"
				}`}
		>
			<span>{icon}</span>
			{label}
		</Link>
	);
}