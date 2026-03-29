import Link from "next/link";
import { Search, Settings, LogOut, User, Menu, Gamepad2, Code2, FolderLock, Monitor } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export default function ProblemListPage() {
  const groups = [
    { id: 1, title: "DK-알고리즘 덕후 모임", leader: "박단용", tier: "1" },
    { id: 2, title: "그룹 이름 1", leader: "조트리버", tier: "1" },
    { id: 3, title: "그룹 이름 2", leader: "어굿이야", tier: "2" },
    { id: 4, title: "그룹 이름 3", leader: "백준 씹 고인물", tier: "2" },
    { id: 5, title: "그룹 이름 4", leader: "오마에와모신데이루", tier: "2" },
    { id: 6, title: "그룹 이름 5", leader: "아단최", tier: "3" },
    { id: 7, title: "그룹 이름 6", leader: "아단최", tier: "3" },
    { id: 8, title: "그룹 이름 7", leader: "아단최", tier: "3" },
  ];  

  return (
    <div className="min-h-screen bg-white text-slate-900">
      
      {/* =========================================
          1. 상단 헤더 (로고, 검색, 프로필)
      ========================================= */}
      <header className="sticky top-0 z-50 w-full border-b bg-white/95 backdrop-blur px-6 h-16 flex items-center justify-between">
        
        {/* 좌측: 로고 및 메뉴 */}
        <div className="flex items-center gap-4">
          <Menu className="h-6 w-6 text-slate-500 cursor-pointer lg:hidden" /> {/* 모바일용 메뉴 아이콘 */}
          <Link href="/" className="text-xl font-bold tracking-tight text-slate-900">
            DK-World
          </Link>
        </div>

        {/* 중앙: 검색창 (최대 너비 제한) */}
        <div className="flex-1 max-w-xl px-4">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-500" />
            <Input
              type="search"
              placeholder="호빗 뜻밖의..."
              className="pl-9 bg-slate-50 border-slate-200 rounded-full focus-visible:ring-slate-400"
            />
          </div>
        </div>

        {/* 우측: 아이콘 메뉴 (프로필, 설정, 로그아웃) */}
        <div className="flex items-center gap-4">
          <button className="p-2 hover:bg-slate-100 rounded-full">
            <User className="h-5 w-5 text-slate-600" />
          </button>
          <button className="p-2 hover:bg-slate-100 rounded-full">
            <Settings className="h-5 w-5 text-slate-600" />
          </button>
          <button className="p-2 hover:bg-slate-100 rounded-full text-red-500">
            <LogOut className="h-5 w-5" />
          </button>
        </div>
      </header>

      {/* =========================================
          2. 메인 컨텐츠 영역 (Grid 레이아웃)
      ========================================= */}
      <main className="container mx-auto max-w-7xl pt-6 grid grid-cols-1 md:grid-cols-12 gap-8 px-4">
        
        {/* [좌측 메뉴바] 2칸 차지 */}
        <aside className="hidden md:block col-span-2 space-y-6">
          <div className="space-y-1">
            <h3 className="text-sm font-semibold text-slate-500 px-2 mb-2">카테고리</h3>
            <NavItem icon={<Code2 size={18} />} label="알고리즘" active />
            <NavItem icon={<FolderLock size={18} />} label="자료구조" />
            <NavItem icon={<Monitor size={18} />} label="운영체제" />
            <NavItem icon={<Gamepad2 size={18} />} label="랜섬웨어" />
          </div>
          <div className="space-y-1">
            <h3 className="text-sm font-semibold text-slate-500 px-2 mb-2">대회</h3>
            <NavItem icon={<Badge variant="outline" className="w-4 h-4 p-0" />} label="진행중인 대회" />
            <NavItem icon={<Badge variant="outline" className="w-4 h-4 p-0" />} label="지난 대회" />
          </div>
        </aside>

        {/* [중앙 그룹 리스트] 7칸 차지 */}
        <section className="col-span-12 md:col-span-7 space-y-4">
          <h2 className="text-lg font-bold mb-4">그룹 리스트</h2>
          
          <div className="grid gap-3">
            {groups.map((prob) => (
              <Card key={prob.id} className="p-4 flex justify-between hover:shadow-md transition-shadow cursor-pointer group">
                <div className="flex justify-between gap-4">
                  <div className="flex">
                    {/* 그룹 아이콘 (랜덤 색상 느낌) */}
                    <div className="h-10 w-10 rounded-lg bg-slate-100 flex items-center justify-center text-slate-500 group-hover:bg-blue-50 group-hover:text-blue-500 transition-colors">
                      <Code2 size={20} />
                    </div>
                    <div className="px-4">
                      <h3 className="font-semibold text-slate-900 group-hover:text-blue-600 transition-colors">
                        {prob.title}
                      </h3>
                      <p className="text-sm text-slate-500">그룹장: {prob.leader}</p>
                    </div>
                  </div>
                  {/* 그룹 티어 */}
                  <div>
                    <Badge variant={prob.tier === "3" ? "destructive" : prob.tier === "2" ? "default" : "secondary"}>
                      티어: {prob.tier}
                    </Badge>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </section>

        {/* [우측 광고/패널] 3칸 차지 */}
        <aside className="hidden md:block col-span-3">
          <div className="sticky top-24 space-y-4">
            {/* 광고 프레임 예시 */}
            <div className="border border-slate-200 rounded-xl h-64 flex items-center justify-center bg-slate-50">
              <span className="text-slate-400 text-sm">Advertisement Area</span>
            </div>
          </div>
        </aside>

      </main>
    </div>
  );
}

// [보조 컴포넌트] 사이드바 메뉴 아이템을 편하게 찍어내기 위함
function NavItem({ icon, label, active = false }: { icon: React.ReactNode; label: string; active?: boolean }) {
  return (
    <div
      className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium cursor-pointer transition-colors ${
        active ? "bg-slate-100 text-slate-900" : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
      }`}
    >
      {icon}
      <span>{label}</span>
    </div>
  );
}