"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Shield, ChevronLeft, ShieldAlert, ArrowUpRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export default function PrivacyPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4 sm:px-6 lg:px-8 font-sans">
      
      {/* 상단 네비게이션 헤더 */}
      <div className="max-w-3xl mx-auto mb-8 flex items-center justify-between">
        <Button 
          variant="ghost" 
          onClick={() => router.back()} 
          className="text-slate-500 hover:text-slate-900 font-bold gap-1 rounded-xl"
        >
          <ChevronLeft size={16} /> 이전 페이지로
        </Button>
        
        <Link href="/" className="flex items-center gap-2">
          <div className="bg-slate-900 p-1.5 rounded-lg shadow-md">
            <Shield className="w-5 h-5 text-white" />
          </div>
          <span className="text-xl font-black tracking-tighter text-slate-900">Diveon</span>
        </Link>
      </div>

      {/* 메인 약관 카드 */}
      <div className="max-w-3xl mx-auto">
        <Card className="border-none shadow-2xl shadow-slate-200/60 rounded-[2.5rem] overflow-hidden bg-white">
          <CardHeader className="pt-10 pb-6 px-10 border-b border-slate-50 bg-white">
            <CardTitle className="text-2xl font-black flex items-center gap-2 text-slate-900">
              <ShieldAlert className="w-6 h-6 text-indigo-600" /> 개인정보 처리방침
            </CardTitle>
            <CardDescription className="text-slate-400 font-medium">
              최종 시행일: 2026년 5월 30일
            </CardDescription>
          </CardHeader>

          <CardContent className="p-10 space-y-8 text-slate-600 leading-relaxed text-sm max-h-[65vh] overflow-y-auto hide-scrollbar">
            
            <p>
              <strong>Diveon</strong>(이하 "플랫폼")은 관련 법령에 따라 이용자의 개인정보를 보호하고, 이와 관련한 고충을 신속하고 원활하게 처리할 수 있도록 하기 위하여 다음과 같이 개인정보 처리방침을 수립·공개합니다.
            </p>

            {/* 제 1 조 */}
            <section className="space-y-3">
              <h3 className="text-base font-black text-slate-900">1. 수집하는 개인정보 항목 및 목적</h3>
              <p>플랫폼은 회원가입, 원활한 서비스 제공 및 대회 관리를 위해 아래와 같은 최소한의 개인정보를 수집하고 있습니다.</p>
              
              <div className="border rounded-xl overflow-hidden bg-white shadow-sm">
                <Table>
                  <TableHeader className="bg-slate-50">
                    <TableRow>
                      <TableHead className="w-[120px] font-bold">구분</TableHead>
                      <TableHead className="font-bold">수집 항목</TableHead>
                      <TableHead className="font-bold">이용 목적</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody className="text-xs">
                    <TableRow>
                      <TableCell className="font-bold text-slate-800">필수 수집</TableCell>
                      <TableCell className="font-mono text-slate-600">이메일 주소, 아이디, 비밀번호, 닉네임</TableCell>
                      <TableCell className="text-slate-600">회원 식별 및 로그인, 비밀번호 분실 시 인증, 시스템 공지사항 전달</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-bold text-slate-800">선택/연동 수집</TableCell>
                      <TableCell className="font-mono text-slate-600">소속(학교/직장), 관심 분야 태그</TableCell>
                      <TableCell className="text-slate-600">대회 랭킹 가공 시 소속별 스코어보드 산정, 맞춤형 문제 추천</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-bold text-slate-800">자동 생성</TableCell>
                      <TableCell className="font-mono text-slate-600">IP 주소, 서비스 이용 기록, 접속 로그</TableCell>
                      <TableCell className="text-slate-600">플랫폼 대상 디도스(DDoS) 및 웹 취약점 해킹 공격 차단, 부정 제출(어뷰징) 모니터링</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            </section>

            {/* 제 2 조 */}
            <section className="space-y-2">
              <h3 className="text-base font-black text-slate-900">2. 개인정보의 보유 및 이용기간</h3>
              <p>
                1. 플랫폼은 회원이 <strong>탈퇴를 요청하거나 회원 자격을 상실할 때까지</strong> 개인정보를 보유 및 이용합니다.<br />
                2. 단, 다른 사용자의 랭킹 공정성을 훼손하는 부정행위(답안 공유 등)로 강제 탈퇴 처리된 회원의 식별 정보는 재가입 방지 및 보안 추적을 위해 탈퇴 후 1년간 암호화된 해시값 형태로 별도 보관됩니다.
              </p>
            </section>

            <Separator className="my-4 bg-slate-100" />

            {/* 제 3 조 */}
            <section className="space-y-2">
              <h3 className="text-base font-black text-slate-900">3. 개인정보의 파기절차 및 방법</h3>
              <p>
                플랫폼은 개인정보 보유기간의 경과, 처리목적 달성 등 개인정보가 불필요하게 되었을 때에는 지체 없이 해당 개인정보를 파기합니다.<br />
                - <strong>전자적 파일 형태:</strong> 기록을 재생할 수 없는 기술적 방법(Low Level Format 등)을 사용하여 영구 삭제합니다.<br />
                - <strong>종이 문서 형태:</strong> 분쇄기로 분쇄하거나 소각하여 파기합니다.
              </p>
            </section>

            {/* 제 4 조 */}
            <section className="space-y-2">
              <h3 className="text-base font-black text-slate-900">4. 이용자의 권리 및 행사방법</h3>
              <p>
                1. 회원은 언제든지 플랫폼 설정을 통해 자신의 개인정보를 열람, 수정하거나 회원 탈퇴를 통해 개인정보 수집 동의를 철회할 수 있습니다.<br />
                2. 만 14세 미만 아동의 회원 가입은 본 플랫폼의 서비스 특성 및 보안 정책상 원칙적으로 제한하고 있습니다.
              </p>
            </section>

            <Separator className="my-4 bg-slate-100" />

            {/* 제 5 조 */}
            <section className="space-y-2">
              <h3 className="text-base font-black text-slate-900">5. 개인정보 보호책임자 안내</h3>
              <p>
                플랫폼은 개인정보 처리에 관한 업무를 총괄해서 책임지고, 이용자의 불만처리 및 피해구제 등을 위하여 아래와 같이 개인정보 보호책임자를 지정하고 있습니다.<br />
                - <strong>담당 부서 / 성명:</strong> Diveon 운영본부 개인정보 보호관<br />
                - <strong>문의 채널:</strong> 플랫폼 내 질의응답 보드 및 고객 지원 이메일
              </p>
            </section>

          </CardContent>

          {/* 약관 하단 안내 풋터 */}
          <div className="bg-slate-50 border-t border-slate-100 py-6 px-10 flex flex-col sm:flex-row justify-between items-center gap-4">
            <p className="text-xs font-bold text-slate-400">
              이용약관 내용을 다시 검토하시려면 아래 링크를 이용하세요.
            </p>
            <Button size="sm" variant="link" className="text-indigo-600 font-bold p-0 h-auto" asChild>
              <Link href="/terms" className="flex items-center gap-0.5">
                서비스 이용약관 보러가기 <ArrowUpRight size={14} />
              </Link>
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}