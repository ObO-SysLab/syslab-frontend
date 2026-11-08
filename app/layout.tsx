import type { Metadata } from "next";
import { JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";
import MockApi from "@/components/MockApi";
import ThemeScope from "@/components/ThemeScope";

// HUD·코드·터미널용 mono. 한글 UI는 Pretendard(아래 <link>)
const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "DiveOn — 운영체제의 깊은 바다로",
  description: "OS 학습·문제풀이 플랫폼 DiveOn",
};

// OBO 전용 화면(다른 팀원 담당)은 Abyss 테마를 적용하지 않는다.
// 첫 페인트 전에 실행되도록 인라인 스크립트로 처리 (클라이언트 이동은 ThemeScope가 처리)
const themeBootScript = `(function(){try{var p=location.pathname;if(p.indexOf('/test')===0||p.indexOf('/challenges/obo')===0){document.documentElement.removeAttribute('data-theme');}}catch(e){}})();`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ko"
      data-theme="abyss"
      suppressHydrationWarning
      className={cn("h-full", "antialiased", jetbrainsMono.variable, "font-sans")}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeBootScript }} />
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css"
        />
      </head>
      <body className="min-h-full flex flex-col">
        <MockApi />
        <ThemeScope />
        {children}
      </body>
    </html>
  );
}
