"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Shield, ChevronLeft, Scale, ArrowUpRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

export default function TermsPage() {
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
              <Scale className="w-6 h-6 text-indigo-600" /> 서비스 이용약관
            </CardTitle>
            <CardDescription className="text-slate-400 font-medium">
              최종 수정일: 2026년 5월 30일
            </CardDescription>
          </CardHeader>

          <CardContent className="p-10 space-y-8 text-slate-600 leading-relaxed text-sm max-h-[65vh] overflow-y-auto hide-scrollbar">
            
            {/* 제 1 조 */}
            <section className="space-y-2">
              <h3 className="text-base font-black text-slate-900">제 1 조 (목적)</h3>
              <p>
                본 약관은 교육 및 실습 플랫폼인 <strong>Diveon</strong>(이하 "서비스")이 제공하는 웹사이트, 문제 보드, 가상 머신(VM) 실습 인프라 및 기타 제반 서비스의 이용과 관련하여, 운영진과 이용자(이하 "회원") 간의 권리, 의무 및 책임 사항을 규정함을 목적으로 합니다.
              </p>
            </section>

            {/* 제 2 조 */}
            <section className="space-y-2">
              <h3 className="text-base font-black text-slate-900">제 2 조 (용어의 정의)</h3>
              <ul className="list-disc pl-5 space-y-1">
                <li><strong>회원:</strong> 본 약관에 동의하고 서비스에 가입하여 Diveon의 인프라를 이용하는 주체입니다.</li>
                <li><strong>챌린지/대회:</strong> 플랫폼 내에서 운영체제, 포렌식, 리버싱 등의 역량을 겨루기 위해 제공되는 정답 검증 체계입니다.</li>
                <li><strong>VM 인프라:</strong> 실습을 위해 독점적 혹은 공유 형태로 임시 할당되는 가상 컴퓨팅 리소스입니다.</li>
              </ul>
            </section>

            <Separator className="my-4 bg-slate-100" />

            {/* 제 3 조 */}
            <section className="space-y-2">
              <h3 className="text-base font-black text-slate-900">제 3 조 (계정 보안 및 관리)</h3>
              <p>
                1. 회원은 아이디 및 비밀번호를 스스로 관리할 책임이 있으며, 이를 타인에게 양도하거나 공유해서는 안 됩니다.<br />
                2. 타인과의 계정 공유로 인해 발생한 문제 기록, 스코어보드 변동, 포인트 어뷰징 등의 책임은 전적으로 가입 회원 본인에게 귀속됩니다.
              </p>
            </section>

            {/* 제 4 조 */}
            <section className="space-y-3">
              <h3 className="text-base font-black text-slate-900 text-red-600">제 4 조 (부정행위 및 금지사항)</h3>
              <p className="font-bold text-slate-800">
                서비스의 안전성과 공정성을 위해 회원은 다음 각 호의 행위를 하여서는 안 되며, 적발 시 사전 고지 없이 계정이 영구 중단됩니다.
              </p>
              <ul className="list-disc pl-5 space-y-1.5 text-slate-600">
                <li><strong>어뷰징 및 답안 공유:</strong> 진행 중인 대회나 챌린지의 플래그(Flag), 소스코드, 정답 데이터를 타인과 공유하거나 대리 제출하는 행위</li>
                <li><strong>인프라 공격:</strong> 제공된 가상 머신(VM)을 우회하여 Diveon 호스트 서버 자체를 공격하거나, 시스템 내부망 취약점을 의도적으로 타겟팅하여 서비스 마비를 야기하는 행위</li>
                <li><strong>우회 및 부정 사용:</strong> 허용된 가상 머신 명령어 커널 스펙 외에 백도어, 악성 스크립트 등을 임의로 업로드 및 실행하여 자원을 남용하는 행위</li>
              </ul>
            </section>

            <Separator className="my-4 bg-slate-100" />

            {/* 제 5 조 */}
            <section className="space-y-2">
              <h3 className="text-base font-black text-slate-900">제 5 조 (운영진의 책임 제한 및 면책)</h3>
              <p>
                1. 운영진은 기술적 결함, 디스크 장애, 디도스(DDoS) 공격, 천재지변 등으로 인해 임시적으로 발생한 실습 인프라 중단이나 데이터(소스코드, 제출 이력 등) 유실에 대해 책임을 지지 않습니다.<br />
                2. 가상 컴퓨팅 리소스 내에서 발생한 회원의 조작 실수, 명령어 오용으로 인한 인스턴스 초기화 행위는 전적으로 회원의 책임입니다.
              </p>
            </section>

            {/* 제 6 조 */}
            <section className="space-y-2">
              <h3 className="text-base font-black text-slate-900">제 6 조 (관할 법원)</h3>
              <p>
                본 서비스 이용과 관련하여 운영진과 회원 간에 발생한 분쟁에 대하여 소송이 제기될 경우, 대한민국 운영진 소재지 관할 법원을 전속 관할 법원으로 합니다.
              </p>
            </section>

          </CardContent>

          {/* 약관 하단 안내 풋터 */}
          <div className="bg-slate-50 border-t border-slate-100 py-6 px-10 flex flex-col sm:flex-row justify-between items-center gap-4">
            <p className="text-xs font-bold text-slate-400">
              이용약관을 읽으셨다면 개인정보 처리방침도 함께 검토해 주세요.
            </p>
            <Button size="sm" variant="link" className="text-indigo-600 font-bold p-0 h-auto" asChild>
              <Link href="/privacy" className="flex items-center gap-0.5">
                개인정보 처리방침 보러가기 <ArrowUpRight size={14} />
              </Link>
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}