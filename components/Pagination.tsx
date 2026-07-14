"use client";

import { Button } from "@/components/ui/button";
import { 
  ChevronsLeft, 
  ChevronLeft, 
  ChevronRight, 
  ChevronsRight 
} from "lucide-react";

interface PaginationProps {
  currentPage: number;         // 현재 페이지 (1부터 시작)
  totalPages: number;          // 전체 페이지 개수
  onPageChange: (page: number) => void; // 페이지 변경 시 실행할 함수
  maxPageButtons?: number;     // 한 번에 보여줄 숫자 버튼 개수 (기본값: 5개)
}

export default function PaginationUI({
  currentPage,
  totalPages,
  onPageChange,
  maxPageButtons = 5,
}: PaginationProps) {
  // 전체 페이지가 0이거나 1개뿐이라면 페이지네이션을 굳이 렌더링하지 않음
  if (totalPages <= 1) return null;

  // 화면에 보여줄 숫자 버튼들의 시작과 끝 계산하는 알고리즘
  let startPage = Math.max(1, currentPage - Math.floor(maxPageButtons / 2));
  let endPage = startPage + maxPageButtons - 1;

  if (endPage > totalPages) {
    endPage = totalPages;
    startPage = Math.max(1, endPage - maxPageButtons + 1);
  }

  const pageNumbers = [];
  for (let i = startPage; i <= endPage; i++) {
    pageNumbers.push(i);
  }

  return (
    <div className="flex items-center justify-center gap-1.5 pt-8 pb-4 select-none">
      
      {/* 1. 맨 앞으로 버튼 */}
      <Button
        variant="outline"
        size="icon"
        className="h-9 w-9 rounded-xl border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-slate-900 disabled:opacity-40 transition-all shrink-0"
        disabled={currentPage === 1}
        onClick={() => onPageChange(1)}
        title="첫 페이지로"
      >
        <ChevronsLeft className="h-4 w-4" />
      </Button>

      {/* ◀2. 이전 페이지 버튼 */}
      <Button
        variant="outline"
        size="icon"
        className="h-9 w-9 rounded-xl border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-slate-900 disabled:opacity-40 transition-all shrink-0"
        disabled={currentPage === 1}
        onClick={() => onPageChange(Math.max(1, currentPage - 1))}
        title="이전 페이지"
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>

      {/* 3. 숫자 페이지 버튼 번들 */}
      {pageNumbers.map((page) => {
        const isActive = currentPage === page;
        return (
          <Button
            key={page}
            variant={isActive ? "default" : "outline"}
            size="icon"
            className={`h-9 w-9 rounded-xl text-sm font-bold transition-all ${
              isActive
                ? "bg-slate-950 text-white border-slate-950 shadow-md shadow-slate-950/10 hover:bg-slate-900"
                : "border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900"
            }`}
            onClick={() => onPageChange(page)}
          >
            {page}
          </Button>
        );
      })}

      {/* ▶4. 다음 페이지 버튼 */}
      <Button
        variant="outline"
        size="icon"
        className="h-9 w-9 rounded-xl border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-slate-900 disabled:opacity-40 transition-all shrink-0"
        disabled={currentPage === totalPages}
        onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
        title="다음 페이지"
      >
        <ChevronRight className="h-4 w-4" />
      </Button>

      {/* 5. 맨 뒤로 버튼 */}
      <Button
        variant="outline"
        size="icon"
        className="h-9 w-9 rounded-xl border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-slate-900 disabled:opacity-40 transition-all shrink-0"
        disabled={currentPage === totalPages}
        onClick={() => onPageChange(totalPages)}
        title="마지막 페이지로"
      >
        <ChevronsRight className="h-4 w-4" />
      </Button>

    </div>
  );
}