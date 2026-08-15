"use client";

import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import {
  Menu, LogOut, CheckCircle2, Target, Zap, Code2, PlusCircle, Eye,
  StickyNote, Bell, Trash2, Network
} from "lucide-react";
import type { ProblemOboData } from "@/components/obo/types";
import { OboEditorSection } from "@/components/obo/OboEditorSection";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useSearchParams } from "next/navigation";
import { Badge } from "@/components/ui/badge";

function ProblemCreateContent() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const searchParams = useSearchParams();
  const editId = searchParams.get("id"); // URL의 ?id=... 값을 가져옴
  const isEditMode = !!editId; // id가 있으면 수정 모드(true)
  const [userImgUrl, setUserImgUrl] = useState("/avatar.png");

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      setIsLoggedIn(true);
    } else {
      alert("로그인이 필요한 서비스입니다.");
      window.location.href = "/signin"; // 로그인 페이지로 리다이렉트
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("token");
    setIsLoggedIn(false);
    window.location.href = "/";
  };

  // [STATE] 문제 유형 (coding / ctf / objective) - API 명세에 맞춰 내부 값 변경
  const [problemType, setProblemType] = useState("coding");

  // [STATE] 공통 정보
  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState(""); // 스토리를 summary로 매핑
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("kernel");
  const [difficulty, setDifficulty] = useState("1");
  const [visibility, setVisibility] = useState("public");

  // [STATE] 코딩 문제 전용
  const [timeLimit, setTimeLimit] = useState(1);
  const [memoryLimit, setMemoryLimit] = useState(256);
  const [inputDesc, setInputDesc] = useState("");
  const [testcases, setTestcases] = useState([{ index: 1, input: "", output: "", is_sample: true }]);
  const [outputDesc, setOutputDesc] = useState("");
  const [allowedLanguages, setAllowedLanguages] = useState<string[]>(["c", "cpp", "python"]);

  // [STATE] 실습(CTF) 문제 전용
  const [flag, setFlag] = useState("");
  const [dockerfile, setDockerfile] = useState<File | null>(null);
  const [osImage, setOsImage] = useState("ubuntu:22.04");
  const [cpuLimit, setCpuLimit] = useState(0.5);
  const [vmMemoryLimit, setVmMemoryLimit] = useState("512m");
  const [allowedCommandsInput, setAllowedCommandsInput] = useState("ls, cat, grep, find");

  // [STATE] 객관식 문제 전용
  const [choices, setChoices] = useState([
    { index: 1, content: "" }, { index: 2, content: "" }, { index: 3, content: "" }, { index: 4, content: "" }
  ]);
  const [selectedAnswers, setSelectedAnswers] = useState<number[]>([1]);
  const [isOrderedAnswer, setIsOrderedAnswer] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 객관식 정답 토글 핸들러
  // [상태 관리] OBO 시각화
  const [oboEnabled, setOboEnabled] = useState(false);
  const [oboData, setOboData] = useState<ProblemOboData>({ mode: 'single', single: { nodes: [], edges: [], frames: [] } });
  const [oboModalOpen, setOboModalOpen] = useState(false);
  const [oboDataSnapshot, setOboDataSnapshot] = useState<ProblemOboData | null>(null);

  const openOboModal = () => {
    setOboDataSnapshot(oboData);
    setOboModalOpen(true);
  };
  const confirmOboModal = () => setOboModalOpen(false);
  const cancelOboModal = () => {
    if (oboDataSnapshot) setOboData(oboDataSnapshot);
    setOboModalOpen(false);
  };

  // 2. 객관식 정답 토글 핸들러
  const toggleAnswer = (idx: number) => {
    const val = idx + 1;

    if (selectedAnswers.includes(val)) {
      // 해제한 후 정답이 0개가 되는 '결과론적 상황'만 차단
      if (selectedAnswers.length === 1) {
        alert("최소 하나의 정답은 선택해야 합니다.");
        return;
      }
      setSelectedAnswers(selectedAnswers.filter((a) => a !== val));
    } else {
      // 순서 일치 옵션이 켜져 있다면 .sort()를 생략하고 누른 순서 그대로 push
      const next = isOrderedAnswer
        ? [...selectedAnswers, val]                     // 1. 순서 지정 모드: 누른 데이터 뒤에 차례로 누적 [4, 2, 1]
        : [...selectedAnswers, val].sort((a, b) => a - b); // 2. 일반 다중 모드: 기존처럼 번호 순 정렬 [1, 2, 4]

      setSelectedAnswers(next);

      // 다중 정답으로 전환되면 OBO는 사용할 수 없으므로 자동으로 끈다.
      if (next.length > 1 && oboEnabled) {
        setOboData({ mode: 'single', single: { nodes: [], edges: [], frames: [] } });
        setOboEnabled(false);
      }
    }
  };

  // 코딩 문제 테스트케이스 삭제 핸들러
  const removeTestcase = (indexToRemove: number) => {
    if (testcases.length <= 1) {
      alert("최소 하나의 테스트케이스가 필요합니다.");
      return;
    }
    const newTc = testcases
      .filter((_, idx) => idx !== indexToRemove)
      .map((tc, idx) => ({ ...tc, index: idx + 1 })); // 인덱스 재정렬
    setTestcases(newTc);
  };

  const removeChoice = (indexToRemove: number) => {
    if (choices.length <= 2) {
      alert("객관식 보기는 최소 2개 이상이어야 합니다.");
      return;
    }

    const choiceNum = indexToRemove + 1; // 삭제되는 보지의 번호 (1부터 시작)

    // 보기 목록 필터링 및 인덱스 재정렬
    const newChoices = choices
      .filter((_, idx) => idx !== indexToRemove)
      .map((choice, idx) => ({
        ...choice,
        index: idx + 1,
      }));
    setChoices(newChoices);

    // 정답 배열(selectedAnswers) 보정
    const newAnswers = selectedAnswers
      .filter((a) => a !== choiceNum) // 삭제된 번호 제거
      .map((a) => (a > choiceNum ? a - 1 : a)); // 삭제된 번호보다 큰 번호는 1씩 당김

    // 정답이 하나도 남지 않게 되는 경우 방지 (최소 1번은 선택되게)
    setSelectedAnswers(newAnswers.length > 0 ? newAnswers : [1]);

    // 3. OBO per_choice 키 동기화 (삭제된 번호 제거 + 이후 번호 한 칸씩 당김)
    if (oboData.mode === 'per_choice' && oboData.perChoice) {
      const newPerChoice: Record<string, import('@/components/obo/types').OboBlob> = {};
      Object.entries(oboData.perChoice).forEach(([key, blob]) => {
        const num = parseInt(key.replace('choice_', ''));
        if (num < choiceNum) newPerChoice[key] = blob;
        else if (num > choiceNum) newPerChoice[`choice_${num - 1}`] = blob;
      });
      setOboData({ ...oboData, perChoice: newPerChoice });
    }
  };

  // [API] 제출 핸들러
  const handleSubmit = async () => {
    if (!title || !category || !description) {
      alert("제목, 카테고리, 문제 설명은 필수입니다.");
      return;
    }

    if (visibility === "group" && !selectedGroupId) {
      alert("공개할 그룹을 선택해주세요.");
      return;
    }

    setIsSubmitting(true);
    const token = localStorage.getItem("token");

    // 상태 변수 정의
    const method = isEditMode ? "PATCH" : "POST";
    let endpoint = "";
    let bodyData: BodyInit | null = null;
    let fetchHeaders: Record<string, string> = {
      "Authorization": `Bearer ${token}`
    };

    try {
      // ----------------------------------------------------
      // [CASE 1] 문제 수정 모드 (PATCH) - 모든 유형 공통 규격
      // ----------------------------------------------------
      if (isEditMode) {
        fetchHeaders["Content-Type"] = "application/json";
        endpoint = `https://diveon.net/api/problems/${problemType.toLocaleLowerCase()}/${editId}`;

        const patchPayload = {
          title,
          summary: summary || title,
          description,
          difficulty: difficulty,
          oboJson: oboEnabled ? oboData : null
        };

        bodyData = JSON.stringify(patchPayload);
      }
      // ----------------------------------------------------
      // [CASE 2] 신규 문제 등록 모드 (POST) - 기존 로직 유지
      // ----------------------------------------------------
      else {
        // 실습형(practice)은 multipart/form-data 처리
        if (problemType === "practice") {
          endpoint = `https://diveon.net/api/problems/practice`;

          if (!dockerfile) {
            alert("Dockerfile zip 파일을 업로드해주세요.");
            setIsSubmitting(false);
            return;
          }

          const formData = new FormData();
          formData.append("title", title);
          formData.append("summary", summary || title);
          formData.append("description", description);
          formData.append("category", category);
          formData.append("difficulty", difficulty);
          formData.append("visibility", visibility.toLowerCase());

          if (visibility === "group" && selectedGroupId) {
            formData.append("groupId", String(selectedGroupId));
          }

          if (visibility === "contest" && selectedContestId) {
            formData.append("contestId", String(selectedContestId));
          }

          formData.append("osImage", osImage);
          formData.append("cpuLimit", String(cpuLimit));
          formData.append("memoryLimit", vmMemoryLimit);
          formData.append("flag", flag);

          const cmdArray = allowedCommandsInput.split(",").map(c => c.trim()).filter(c => c !== "");
          cmdArray.forEach(cmd => formData.append("allowedCommands", cmd));

          if (dockerfile) {
            formData.append("dockerfile", dockerfile);
          }

          bodyData = formData;
        }
        // 코딩형 및 객관식은 application/json 처리
        else {
          fetchHeaders["Content-Type"] = "application/json";

          let payload: any = {
            title,
            summary: summary || title,
            description,
            category,
            difficulty, // 생성 시에도 문자열 규격으로 매핑
            visibility,
          };

          if (visibility === "group" && selectedGroupId) {
            payload.groupId = selectedGroupId;
          }

          if (visibility === "contest" && selectedContestId) {
            payload.contestId = selectedContestId; // 백엔드 DTO 스펙에 맞춰 contestId 추가
          }

          if (problemType === "coding") {
            endpoint = `https://diveon.net/api/problems/coding`;
            payload = {
              ...payload,
              constraints: {
                timeLimitMs: timeLimit * 1000,
                memoryLimitMb: memoryLimit,
                allowedLanguages: allowedLanguages
              },
              inputDescription: inputDesc || "입력 설명",
              outputDescription: outputDesc || "출력 설명",
              testcases: testcases.map(tc => ({ ...tc, index: Number(tc.index) })),
              obo: { enabled: false, initialImageUrl: null },
              oboJson: oboEnabled ? oboData : null,
              isDraft: false
            };
          } else if (problemType === "objective") {
            endpoint = `https://diveon.net/api/problems/objective`;
            const validChoices = choices.filter(c => c.content.trim() !== "").map((c, i) => ({ index: i + 1, content: c.content, image_url: null }));
            if (validChoices.length < 2) {
              setIsSubmitting(false);
              return alert("보기를 2개 이상 입력하세요.");
            }

            payload = {
              ...payload,
              choices: validChoices,
              answer: selectedAnswers,
              obo: { enabled: false, steps: [] },
              oboJson: oboEnabled ? oboData : null,
            };
          }
          bodyData = JSON.stringify(payload);
        }
      }

      // API 전송 요청 실행
      const response = await fetch(endpoint, {
        method: method,
        headers: fetchHeaders,
        body: bodyData
      });

      if (response.ok) {
        alert(isEditMode ? "수정되었습니다!" : "등록되었습니다!");
        window.location.href = isEditMode ? `/challenges/detail?id=${editId}` : "/challenges";
      } else {
        const errorText = await response.text();
        let errorMessage = "입력값이 잘못되었거나 권한이 없습니다.";
        try {
          const errorData = JSON.parse(errorText);
          errorMessage = errorData.detail || errorData.message || errorMessage;
        } catch (e) { errorMessage = errorText; }
        alert(`실패: ${errorMessage}`);
      }
    } catch (error) {
      console.error(error);
      alert("서버 통신 중 오류가 발생했습니다.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // [API] 수정 모드용 데이터 로드
  useEffect(() => {
    if (isEditMode) {
      const token = localStorage.getItem("token");

      fetch(`https://diveon.net/api/problems/${editId}`, {
        headers: { "Authorization": `Bearer ${token}` }
      })
        .then(res => res.json())
        .then(json => {
          const data = json.data;
          // 공통 필드 채우기
          setTitle(data.title);
          setSummary(data.summary || "");
          setDescription(data.description);
          setCategory(data.category?.toLowerCase() || "");
          setDifficulty(String(data.difficulty));
          setProblemType(data.type); // 'coding', 'objective', 'practice' 중 하나

          // 유형별 상세 필드 채우기
          if (data.type === "coding") {
            setTimeLimit((data.constraints?.time_limit_ms || 1000) / 1000);
            setMemoryLimit(data.constraints?.memory_limit_mb || 256);
            setTestcases(data.testcases || []);
          } else if (data.type === "objective") {
            setChoices(data.choices || []);
            setSelectedAnswers(data.answer?.length ? data.answer : [1]);
          } else if (data.type === "practice") {
            setFlag(data.flag || "");

            if (data.vm_config) {
              setOsImage(data.vm_config.os_image || "ubuntu:22.04");
              setCpuLimit(data.vm_config.cpu_limit || 0.5);
              setVmMemoryLimit(data.vm_config.memory_limit || "512m"); // 여기도 수정
              if (data.vm_config.allowed_commands) {
                setAllowedCommandsInput(data.vm_config.allowed_commands.join(", "));
              }
            }
          }

          const isMultiAnswerObjective = data.type === "objective" && (data.answer?.length ?? 0) > 1;
          if (data.oboJson && !isMultiAnswerObjective) {
            // 이전 형식(OboBlob 직접 저장) 호환성 처리
            const raw = data.oboJson;
            if (raw.mode === 'single' || raw.mode === 'per_choice') {
              setOboData(raw);
            } else {
              // legacy: OboBlob 그대로 저장된 경우
              setOboData({ mode: 'single', single: raw });
            }
            setOboEnabled(true);
          }

        })
        .catch(err => {
          console.error(err);
        });
    }
  }, [editId]);

  useEffect(() => {
    const fetchProfileImage = async () => {
      const token = localStorage.getItem("token");
      if (!token) return;

      setIsLoggedIn(true);

      try {
        const response = await fetch("https://diveon.net/api/profile/show", {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`
          }
        });

        if (response.ok) {
          const result = await response.json();
          const userInfo = result?.data?.userInfo;

          // 서버에 저장된 실서버 S3 프로필 주소가 있다면 상태 동기화
          if (userInfo?.profileImgUrl) {
            setUserImgUrl(userInfo.profileImgUrl);
          }
        }
      } catch (error) {
        console.error("홈페이지 초기 데이터 로드 실패:", error);
      }
    };

    fetchProfileImage();
  }, []);

  // [STATE] 그룹 공개용
  const [myGroups, setMyGroups] = useState<any[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<number | null>(null);
  const [isFetchingGroups, setIsFetchingGroups] = useState(false);

  // [API] 공개 범위가 'group'일 때 내 그룹 목록 불러오기
  useEffect(() => {
    if (visibility === "group" && myGroups.length === 0) {
      setIsFetchingGroups(true);
      const token = localStorage.getItem("token");
      fetch("https://diveon.net/api/groups/me", {
        headers: { "Authorization": `Bearer ${token}` }
      })
        .then(res => res.json())
        .then(json => {
          if (json.data) setMyGroups(json.data);
        })
        .catch(err => console.error("그룹 목록 로드 실패:", err))
        .finally(() => setIsFetchingGroups(false));
    }
  }, [visibility]);

  // [STATE] 대회 공개용
  const [myContests, setMyContests] = useState<any[]>([]);
  const [selectedContestId, setSelectedContestId] = useState<number | null>(null);
  const [isFetchingContests, setIsFetchingContests] = useState(false);

  // [API] 공개 범위가 'contest'일 때 내 대회 목록 불러오기
  useEffect(() => {
    if (visibility === "contest" && myContests.length === 0) {
      setIsFetchingContests(true);
      const token = localStorage.getItem("token");
      fetch("https://diveon.net/api/contests/me/owned", {
        method: "GET",
        headers: { "Authorization": `Bearer ${token}` }
      })
        .then(res => res.json())
        .then(json => {
          if (json.data) setMyContests(json.data);
        })
        .catch(err => console.error("대회 목록 로드 실패:", err))
        .finally(() => setIsFetchingContests(false));
    }
  }, [visibility])

  // 다중 정답(객관식) 문제는 선택지 하나에 종속되는 OBO를 만들 수 없다.
  const oboBlockedByMultiAnswer = problemType === "objective" && selectedAnswers.length > 1;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">
      {/* 1. 고정 헤더 */}
      <header className="sticky top-0 z-50 w-full border-b bg-white/95 backdrop-blur px-6 h-16 flex items-center justify-between">
        {/* [A] Diveon 로고 영역 */}
        <div className="flex items-center gap-4">
          <Menu className="h-6 w-6 text-slate-500 cursor-pointer lg:hidden" />
          <Link href="/" className="text-xl font-bold tracking-tight text-slate-900">
            Diveon<span className="text-[10px] font-black text-indigo-500 ml-1">ADMIN</span>
          </Link>
        </div>

        {/* [B] 우측 사용자 영역 */}
        <div className="flex items-center gap-3">
          {isLoggedIn ? (
            /* --- 로그인된 상태: 알림 + 프로필 + 로그아웃 --- */
            <>
              <button className="p-2 hover:bg-slate-100 rounded-full transition-colors relative group">
                <Bell className="h-5 w-5 text-slate-500 group-hover:text-slate-900" />
                <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
              </button>
              <Link href="/settings">
                <Avatar className="h-9 w-9 border border-slate-200 hover:ring-2 hover:ring-indigo-100 transition-all cursor-pointer">
                  <AvatarImage src={userImgUrl} alt="User Profile" className="object-cover" />
                  <AvatarFallback className="bg-transparent text-xs font-bold text-slate-600 rounded-full">
                    {/* 공백 상태 유지 */}
                  </AvatarFallback>
                </Avatar>
              </Link>
              <button onClick={handleLogout} className="p-2 hover:bg-red-50 rounded-full text-red-500 transition-colors">
                <LogOut className="h-5 w-5" />
              </button>
            </>
          ) : (
            /* --- 로그아웃된 상태 (보통 리다이렉트 되지만 렌더링 방어용) --- */
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

      {/* 2. 메인 레이아웃 */}
      <main className="container mx-auto max-w-[1400px] pt-8 grid grid-cols-1 md:grid-cols-12 gap-10 px-6 pb-20">

        {/* [A] 좌측 출제 가이드 */}
        <aside className="col-span-12 md:col-span-3 space-y-4 md:sticky md:top-24 h-fit">
          <Card className="border-indigo-100 bg-white shadow-sm overflow-hidden rounded-2xl">
            <div className="bg-indigo-600 p-6">
              <StickyNote className="w-10 h-10 text-white fill-current" />
              <p className="text-xl font-black text-white mt-2">출제 양식</p>
              <p className="text-xs text-indigo-200 mt-1">문제 양식에 맞춰 정보를 입력하세요.</p>
            </div>
            <CardContent className="p-5 text-sm text-slate-600 space-y-3 font-medium">
              <div className="flex gap-2.5 items-center"><Target className="w-4 h-4 text-indigo-500" /> 제목은 명확하게</div>
              <div className="flex gap-2.5 items-center"><Code2 className="w-4 h-4 text-indigo-500" /> 설명은 Markdown 지원</div>
              <div className="flex gap-2.5 items-center"><CheckCircle2 className="w-4 h-4 text-indigo-500" /> 정확한 테스트케이스 필수</div>
            </CardContent>
          </Card>
          <Button variant="outline" className="w-full text-slate-500" asChild>
            <Link href="/challenges">출제 취소</Link>
          </Button>
        </aside>

        {/* [B] 중앙 출제 양식 */}
        <section className="col-span-12 md:col-span-9 space-y-8 animate-in fade-in-50 duration-500">
          {/* 타이틀 및 저장 버튼 */}
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div className="space-y-1">
              <h1 className="text-3xl font-black tracking-tighter text-slate-950">
                {isEditMode ? "문제 수정" : "문제 등록"}
              </h1>
              <p className="text-slate-500">문제를 만들고 다른 유저들과 공유합니다.</p>
            </div>
            <div className="flex gap-2">
              <Button variant="secondary" className="px-6">임시 저장</Button>
              <Button variant="outline" className="px-6 border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-all group">
                <Eye size={16} className="mr-2 text-slate-400 group-hover:text-indigo-500 transition-colors" />문제 미리보기
              </Button>
              {/* 제출 버튼에 onClick 연결 */}
              <Button onClick={handleSubmit} disabled={isSubmitting}>
                <Zap size={16} className="mr-2" />
                {isSubmitting ? "처리 중..." : (isEditMode ? "수정 완료" : "문제 등록")}
              </Button>
            </div>
          </div>
          <Separator />

          {/* 1. 기본 정보 설정 카드 */}
          <Card className="border-slate-100 shadow-sm rounded-2xl">
            <CardHeader>
              <CardTitle className="text-lg">기본 정보 설정</CardTitle>
              <CardDescription>문제의 제목, 스토리, 분류, 난이도, 공개 범위를 정의합니다.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="title">문제 제목 <span className="text-red-500">*</span></Label>
                <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="문제 제목을 입력하세요." className="focus-visible:ring-indigo-400" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="summary">스토리 (요약)</Label>
                <Textarea value={summary} onChange={(e) => setSummary(e.target.value)} placeholder="스토리를 작성해주세요." className="min-h-[100px] resize-none focus-visible:ring-indigo-400 font-mono text-sm leading-relaxed" />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-5 pt-1">
                <div className="space-y-2">
                  <Label>카테고리 <span className="text-red-500">*</span></Label>
                  <Select value={category} onValueChange={setCategory}>
                    <SelectTrigger><SelectValue placeholder="카테고리 선택" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="kernel">Kernel</SelectItem>
                      <SelectItem value="process">Process</SelectItem>
                      <SelectItem value="thread">Thread</SelectItem>
                      <SelectItem value="memory">Memory</SelectItem>
                      <SelectItem value="file system">File System</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>난이도</Label>
                  <Select value={difficulty} onValueChange={setDifficulty}>
                    <SelectTrigger className="w-full font-mono">
                      <SelectValue placeholder="탐사 수심 선택" />
                    </SelectTrigger>
                    <SelectContent>
                      {/* 1단계: 100m */}
                      <SelectItem value="1" className="text-emerald-600 font-bold">
                        <div className="flex items-center gap-2 font-mono">
                          <span className="w-2 h-2 rounded-full bg-emerald-500" /> 100m
                        </div>
                      </SelectItem>

                      {/* 2단계: 300m */}
                      <SelectItem value="2" className="text-teal-600 font-bold">
                        <div className="flex items-center gap-2 font-mono">
                          <span className="w-2 h-2 rounded-full bg-teal-500" /> 300m
                        </div>
                      </SelectItem>

                      {/* 3단계: 500m */}
                      <SelectItem value="3" className="text-sky-600 font-bold">
                        <div className="flex items-center gap-2 font-mono">
                          <span className="w-2 h-2 rounded-full bg-sky-500" /> 500m
                        </div>
                      </SelectItem>

                      {/* 4단계: 1,000m */}
                      <SelectItem value="4" className="text-blue-600 font-bold">
                        <div className="flex items-center gap-2 font-mono">
                          <span className="w-2 h-2 rounded-full bg-blue-500" /> 1,000m
                        </div>
                      </SelectItem>

                      {/* 5단계: 3,000m */}
                      <SelectItem value="5" className="text-indigo-600 font-bold">
                        <div className="flex items-center gap-2 font-mono">
                          <span className="w-2 h-2 rounded-full bg-indigo-500" /> 3,000m
                        </div>
                      </SelectItem>

                      {/* 6단계: 6,000m */}
                      <SelectItem value="6" className="text-purple-600 font-bold">
                        <div className="flex items-center gap-2 font-mono">
                          <span className="w-2 h-2 rounded-full bg-purple-500" /> 6,000m
                        </div>
                      </SelectItem>

                      {/* 7단계: 10,000m+ */}
                      <SelectItem value="7" className="text-slate-900 font-black">
                        <div className="flex items-center gap-2 font-mono">
                          <span className="w-2 h-2 rounded-full bg-slate-950" /> 10,000m+
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>공개범위</Label>
                  <Select value={visibility} onValueChange={setVisibility}>
                    <SelectTrigger><SelectValue placeholder="공개범위 선택" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="public" className="text-emerald-600 font-bold">전체 공개</SelectItem>
                      <SelectItem value="group" className="text-blue-600 font-bold">그룹 공개</SelectItem>
                      <SelectItem value="contest" className="text-purple-600 font-bold">대회 공개</SelectItem>
                      <SelectItem value="private" className="text-amber-600 font-bold">비공개</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {visibility === "group" && (
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3 animate-in fade-in duration-300 mt-4">

                  { /* [임시] */}
                  {/* <Label className="font-bold flex items-center gap-2">
                    공개할 그룹 선택 <span className="text-red-500">*</span>
                    <span className="text-[10px] text-slate-400 font-normal">여러 그룹을 선택할 수 있습니다.</span>
                  </Label>

                  {isFetchingGroups ? (
                    <div className="text-sm text-slate-400 animate-pulse">그룹 목록을 불러오는 중...</div>
                  ) : myGroups.length === 0 ? (
                    <div className="text-sm text-slate-400">가입되거나 관리 중인 그룹이 없습니다.</div>
                  ) : (
                    <div className="flex flex-wrap gap-2 pt-1">
                      {myGroups.map((group) => {
                        const groupId = group.groupId || group.id; // API 명세에 따라 맞춤
                        const isSelected = selectedGroups.includes(groupId);

                        return (
                          <Badge
                            key={groupId}
                            variant={isSelected ? "default" : "outline"}
                            className={`cursor-pointer px-3 py-1.5 text-xs transition-all ${isSelected
                              ? "bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm"
                              : "bg-white hover:bg-slate-100 text-slate-600"
                              }`}
                            onClick={() => {
                              if (isSelected) {
                                setSelectedGroups(selectedGroups.filter(id => id !== groupId));
                              } else {
                                setSelectedGroups([...selectedGroups, groupId]);
                              }
                            }}
                          >
                            {isSelected && <CheckCircle2 className="w-3 h-3 mr-1.5 inline-block" />}
                            {group.title || group.name}
                          </Badge>
                        );
                      })}
                    </div>
                  )} */}

                  <Label className="font-bold flex items-center gap-2">
                    공개할 그룹 선택 <span className="text-red-500">*</span>
                    <span className="text-[10px] text-slate-400 font-normal">문제를 공개할 1개의 그룹을 선택해주세요.</span>
                  </Label>

                  {isFetchingGroups ? (
                    <div className="text-sm text-slate-400 animate-pulse">그룹 목록을 불러오는 중...</div>
                  ) : myGroups.length === 0 ? (
                    <div className="text-sm text-slate-400">가입되거나 관리 중인 그룹이 없습니다.</div>
                  ) : (
                    <div className="flex flex-wrap gap-2 pt-1">
                      {myGroups.map((group) => {
                        const groupId = group.groupId || group.id;
                        const isSelected = selectedGroupId === groupId;

                        return (
                          <Badge
                            key={groupId}
                            variant={isSelected ? "default" : "outline"}
                            className={`cursor-pointer px-3 py-1.5 text-xs transition-all ${isSelected
                              ? "bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm"
                              : "bg-white hover:bg-slate-100 text-slate-600"
                              }`}
                            onClick={() => {
                              setSelectedGroupId(isSelected ? null : groupId);
                            }}
                          >
                            {isSelected && <CheckCircle2 className="w-3 h-3 mr-1.5 inline-block" />}
                            {group.title || group.name}
                          </Badge>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {visibility === "contest" && (
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3 animate-in fade-in duration-300 mt-4">
                  <Label className="font-bold flex items-center gap-2">
                    공개할 대회 선택 <span className="text-red-500">*</span>
                    <span className="text-[10px] text-slate-400 font-normal">문제를 공개할 1개의 대회를 선택해주세요.</span>
                  </Label>

                  {isFetchingContests ? (
                    <div className="text-sm text-slate-400 animate-pulse">대회 목록을 불러오는 중...</div>
                  ) : myContests.length === 0 ? (
                    <div className="text-sm text-slate-400">관리 중인 대회 없습니다.</div>
                  ) : (
                    <div className="flex flex-wrap gap-2 pt-1">
                      {myContests.map((contest) => {
                        const contestId = contest.contestId || contest.id;
                        const isSelected = selectedContestId === contestId;

                        return (
                          <Badge
                            key={contestId}
                            variant={isSelected ? "default" : "outline"}
                            className={`cursor-pointer px-3 py-1.5 text-xs transition-all ${isSelected
                              ? "bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm"
                              : "bg-white hover:bg-slate-100 text-slate-600"
                              }`}
                            onClick={() => {
                              setSelectedContestId(isSelected ? null : contestId);
                            }}
                          >
                            {isSelected && <CheckCircle2 className="w-3 h-3 mr-1.5 inline-block" />}
                            {contest.title}
                          </Badge>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* 2. 문제 본문 카드 */}
          <Card className="border-slate-100 shadow-sm rounded-2xl overflow-hidden">
            <Tabs defaultValue="desc">
              <CardHeader className="bg-slate-50/50 pb-0 border-b">
                <TabsList className="bg-slate-100 p-0.5 h-auto">
                  <TabsTrigger value="desc" className="px-5 py-2.5 text-xs">문제 설명 (Markdown) <span className="text-red-500">*</span></TabsTrigger>
                  <TabsTrigger value="prev" className="px-5 py-2.5 text-xs">미리보기 (Preview)</TabsTrigger>
                </TabsList>
              </CardHeader>
              <CardContent className="p-6">
                <TabsContent value="desc" className="space-y-2 mt-0">
                  <Textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="문제를 해결하기 위한 설명, 목표를 Markdown 형식으로 상세히 기술하세요."
                    className="min-h-[300px] resize-none focus-visible:ring-indigo-400 font-mono text-sm leading-relaxed"
                  />
                </TabsContent>
                <TabsContent value="prev" className="space-y-2 mt-0">
                  <div className="min-h-[300px] p-4 bg-slate-50 border rounded-lg prose prose-sm max-w-none whitespace-pre-wrap">
                    {description || "작성된 설명이 없습니다."}
                  </div>
                </TabsContent>
              </CardContent>
            </Tabs>
          </Card>

          {/* 3. 데이터셋 및 정답 설정 카드 */}
          <Card className="border-slate-100 shadow-sm rounded-2xl">
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle className="text-lg">데이터셋 및 정답 설정</CardTitle>
                  <CardDescription>문제 유형에 따라 정답 판별 방식을 정의합니다.</CardDescription>
                </div>
                {/* 문제 유형 API에 맞게 value 세팅 */}
                <Select value={problemType} onValueChange={(v) => {
                  setProblemType(v);
                  if (v === "practice") { setOboEnabled(false); setOboData({ mode: 'single', single: { nodes: [], edges: [], frames: [] } }); }
                }}>
                  <SelectTrigger className="w-[140px] bg-slate-100"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="coding">코딩 문제</SelectItem>
                    <SelectItem value="practice">실습 문제</SelectItem>
                    <SelectItem value="objective">객관식 문제</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>

            <CardContent className="pt-2">
              {/* [A] 코딩 문제일 때 */}
              {problemType === "coding" && (
                <div className="space-y-5 animate-in fade-in-30 duration-300">
                  <div className="grid md:grid-cols-2 gap-5 text-sm">
                    <div className="space-y-1.5">
                      <Label>시간 제한 (sec)</Label>
                      <Input type="number" value={timeLimit} onChange={(e) => setTimeLimit(Number(e.target.value))} className="font-mono" />
                    </div>
                    <div className="space-y-1.5">
                      <Label>메모리 제한 (MB)</Label>
                      <Input type="number" value={memoryLimit} onChange={(e) => setMemoryLimit(Number(e.target.value))} className="font-mono" />
                    </div>
                  </div>

                  {/* 허용 언어 선택 영역 */}
                  <div className="space-y-3 p-4 bg-slate-50 rounded-xl border border-slate-100">
                    <Label className="text-xs font-bold text-slate-500 uppercase">Allowed Languages</Label>
                    <div className="flex flex-wrap gap-4">
                      {["c", "cpp", "python"].map((lang) => (
                        <div key={lang} className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            id={`lang-${lang}`}
                            checked={allowedLanguages.includes(lang)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setAllowedLanguages([...allowedLanguages, lang]);
                              } else {
                                if (allowedLanguages.length <= 1) return alert("최소 하나의 언어는 선택해야 합니다.");
                                setAllowedLanguages(allowedLanguages.filter((l) => l !== lang));
                              }
                            }}
                            className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                          />
                          <Label htmlFor={`lang-${lang}`} className="text-sm font-bold uppercase cursor-pointer">
                            {lang === "cpp" ? "C++" : lang}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="grid md:grid-cols-2 gap-5">
                    <div className="space-y-2">
                      <Label>입력 형식 설명</Label>
                      <Textarea
                        value={inputDesc}
                        onChange={(e) => setInputDesc(e.target.value)}
                        placeholder="예) 첫째 줄에 N(1 ≤ N ≤ 100)이 주어진다."
                        className="min-h-[100px] resize-none font-mono text-sm"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>출력 형식 설명</Label>
                      <Textarea
                        value={outputDesc}
                        onChange={(e) => setOutputDesc(e.target.value)}
                        placeholder="예) 우선순위가 높은 순으로 한 줄에 하나씩 출력한다."
                        className="min-h-[100px] resize-none font-mono text-sm"
                      />
                    </div>
                  </div>
                  <div className="space-y-4 pt-2">
                    <div className="flex justify-between items-center">
                      <Label className="font-bold flex items-center gap-2">
                        테스트케이스 설정 <span className="text-[10px] text-slate-400 font-normal">(최소 1개 필수)</span>
                      </Label>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setTestcases([...testcases, { index: testcases.length + 1, input: "", output: "", is_sample: false }])}
                        className="h-8 rounded-lg border-dashed border-slate-300 text-slate-500 hover:text-indigo-600 hover:border-indigo-200 transition-all"
                      >
                        <PlusCircle className="w-3 h-3 mr-2" />케이스 추가
                      </Button>
                    </div>

                    <div className="space-y-5">
                      {testcases.map((tc, idx) => (
                        <div key={idx} className="p-5 bg-white border border-slate-200 rounded-2xl shadow-sm space-y-4 relative group transition-all hover:border-indigo-200">
                          {/* 상단 헤더: 번호 및 삭제 버튼 */}
                          <div className="flex justify-between items-center border-b border-slate-50 pb-3">
                            <div className="flex items-center gap-2">
                              <span className="flex items-center justify-center w-6 h-6 bg-slate-900 text-white text-[10px] font-black rounded-md shadow-sm">
                                #{idx + 1}
                              </span>
                              <span className="text-sm font-bold text-slate-700">Testcase</span>

                              {/* 예제 여부 토글 (선택 사항) */}
                              <label className="ml-3 flex items-center gap-1.5 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={tc.is_sample}
                                  onChange={(e) => {
                                    const newTc = [...testcases];
                                    newTc[idx].is_sample = e.target.checked;
                                    setTestcases(newTc);
                                  }}
                                  className="w-3.5 h-3.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                                />
                                <span className="text-[11px] font-medium text-slate-500">예제로 공개</span>
                              </label>
                            </div>

                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => removeTestcase(idx)}
                              className="h-8 w-8 text-slate-300 hover:text-red-500 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-all"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>

                          {/* 입력/출력 텍스트 영역 */}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <div className="flex items-center gap-1.5 ml-1">
                                <div className="w-1 h-3 bg-indigo-400 rounded-full" />
                                <Label className="text-[11px] font-black uppercase tracking-tight text-slate-400">Standard Input</Label>
                              </div>
                              <Textarea
                                value={tc.input}
                                onChange={(e) => { const n = [...testcases]; n[idx].input = e.target.value; setTestcases(n); }}
                                placeholder="프로그램에 입력될 데이터"
                                className="min-h-[100px] text-xs font-mono bg-slate-50 border-0 focus-visible:ring-1 focus-visible:ring-indigo-400 rounded-xl p-4 resize-none leading-relaxed"
                              />
                            </div>

                            <div className="space-y-2">
                              <div className="flex items-center gap-1.5 ml-1">
                                <div className="w-1 h-3 bg-emerald-400 rounded-full" />
                                <Label className="text-[11px] font-black uppercase tracking-tight text-slate-400">Expected Output</Label>
                              </div>
                              <Textarea
                                value={tc.output}
                                onChange={(e) => { const n = [...testcases]; n[idx].output = e.target.value; setTestcases(n); }}
                                placeholder="예상되는 정답 출력값"
                                className="min-h-[100px] text-xs font-mono bg-slate-50 border-0 focus-visible:ring-1 focus-visible:ring-indigo-400 rounded-xl p-4 resize-none leading-relaxed"
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2.5 pt-2">
                    <Label>첨부 파일 업로드</Label>
                    <div className="p-5 border-2 border-dashed border-slate-200 rounded-2xl text-center bg-slate-50 hover:bg-slate-100/50 cursor-pointer transition-colors">
                      <Zap className="h-6 w-6 text-slate-300 mx-auto fill-current" />
                      <span className="text-xs font-medium text-slate-500 mt-1 block">Click or Drag & Drop to upload binary/pcap/image</span>
                    </div>
                  </div>
                </div>
              )}

              {/* [B] 실습 문제일 때 */}
              {problemType === "practice" && (
                <div className="space-y-5 animate-in fade-in-30 duration-300">
                  <div className="space-y-2 pt-1">
                    <Label htmlFor="flag">Secret Flag 인증 문자열 <span className="text-red-500">*</span></Label>
                    <Input id="flag" value={flag} onChange={(e) => setFlag(e.target.value)} placeholder="DK{Correct_Flag_Here}" className="font-mono text-sm border-indigo-200" />
                  </div>

                  {/* [추가] VM 환경 설정 입력란 */}
                  {/* <div className="p-4 bg-slate-50 border border-slate-100 rounded-xl space-y-4 mt-2">
                    <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">VM Environment Config</h4>

                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label>OS 이미지 <span className="text-red-500">*</span></Label>
                        <Input value={osImage} onChange={(e) => setOsImage(e.target.value)} placeholder="ubuntu:22.04" className="font-mono text-sm bg-white" />
                      </div>
                      <div className="space-y-1.5">
                        <Label>허용 명령어 (쉼표로 구분)</Label>
                        <Input value={allowedCommandsInput} onChange={(e) => setAllowedCommandsInput(e.target.value)} placeholder="ls, cat, grep" className="font-mono text-sm bg-white" />
                      </div>
                    </div>

                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label>CPU 제한 (Core)</Label>
                        <Input type="number" step="0.1" value={cpuLimit} onChange={(e) => setCpuLimit(Number(e.target.value))} className="font-mono text-sm bg-white" />
                      </div>
                      <div className="space-y-1.5">
                        <Label>메모리 제한</Label>
                        <Input
                          value={vmMemoryLimit}
                          onChange={(e) => setVmMemoryLimit(e.target.value)}
                          placeholder="512m, 1g"
                          className="font-mono text-sm bg-white"
                        />
                      </div>
                    </div>
                  </div> */}

                  <div className="space-y-2.5 pt-2">
                    <Label>Dockerfile 업로드 (.zip) <span className="text-red-500">*</span></Label>
                    <div className="relative p-5 border-2 border-dashed border-slate-200 rounded-2xl text-center bg-slate-50 hover:bg-slate-100/50 cursor-pointer transition-colors">
                      <input
                        type="file"
                        accept=".zip"
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        onChange={(e) => {
                          if (e.target.files && e.target.files.length > 0) {
                            setDockerfile(e.target.files[0]);
                          }
                        }}
                      />
                      <Zap className="h-6 w-6 text-slate-300 mx-auto fill-current" />
                      <span className="text-xs font-medium text-slate-500 mt-1 block">
                        {dockerfile ? dockerfile.name : "Click or Drag & Drop to upload dockerfile.zip"}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* [C] 객관식 문제일 때 */}
              {problemType === "objective" && (
                <div className="space-y-5 animate-in fade-in-30 duration-300">

                  {/* 순서 매칭 옵션 설정 카드 피처 */}
                  <div className="flex items-center justify-between p-4 bg-indigo-50/50 border border-indigo-100 rounded-xl">
                    <div className="space-y-0.5">
                      <Label className="text-sm font-bold text-slate-900 cursor-pointer" htmlFor="toggle-order">
                        정답 선택 순서 일치 옵션 활성화
                      </Label>
                      <p className="text-[11px] text-slate-500">체크하면 문제를 푸는 학생도 출제자가 선택한 순서대로 입력해야 정답 처리됩니다.</p>
                    </div>
                    <input
                      type="checkbox"
                      id="toggle-order"
                      checked={isOrderedAnswer}
                      onChange={(e) => {
                        const isChecked = e.target.checked;
                        setIsOrderedAnswer(isChecked);

                        // 옵션을 변경할 때 유저가 등록해 둔 기존 정답들을 번호 순으로 깔끔하게 정렬 리셋해 주어 UX 충돌을 방지
                        setSelectedAnswers((prev) => [...prev].sort((a, b) => a - b));
                      }}
                      className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                    />
                  </div>

                  <div className="space-y-4 pt-1">
                    <Label className="flex justify-between items-center">
                      <span>보기 설정 및 정답 선택 <span className="text-red-500">*</span></span>
                      <span className="text-[10px] text-slate-400">
                        {isOrderedAnswer ? "번호를 누른 순서가 정답 순서가 됩니다." : "정답 체크박스를 선택하세요 (중복 가능)"}
                      </span>
                    </Label>

                    <div className="space-y-3">
                      {choices.map((choice, idx) => {
                        const val = idx + 1;
                        const orderIndex = selectedAnswers.indexOf(val); // 몇 번째 순서로 들어가 있는지 확인 (-1이면 미선택)
                        const isSelected = orderIndex !== -1;

                        return (
                          <div key={idx} className="flex items-center gap-3 group">
                            {/* 정답 토글 버튼 (순서 시각화 탑재) */}
                            <div
                              onClick={() => toggleAnswer(idx)}
                              className={`w-6 h-6 rounded-full border-2 flex items-center justify-center cursor-pointer transition-all text-xs font-black select-none ${isSelected
                                  ? "bg-indigo-600 border-indigo-600 text-white shadow-sm"
                                  : "border-slate-200 text-transparent hover:border-indigo-300"
                                }`}
                            >
                              {/* 순서 모드이고 선택됐다면 순서 번호(1, 2..)를 노출하고, 아니면 체크 아이콘 배치 */}
                              {isSelected && isOrderedAnswer ? orderIndex + 1 : <CheckCircle2 size={14} />}
                            </div>

                            <span className="font-bold text-slate-400 w-4">{idx + 1}.</span>

                            <Input
                              value={choice.content}
                              onChange={(e) => {
                                const newChoices = [...choices];
                                newChoices[idx].content = e.target.value;
                                setChoices(newChoices);
                              }}
                              placeholder={`보기 ${idx + 1} 내용`}
                              className={`flex-1 ${selectedAnswers.includes(idx + 1) ? "border-indigo-200 bg-indigo-50/30" : ""}`}
                            />

                            {/* 보기 삭제 버튼 */}
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => removeChoice(idx)}
                              className="text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
                            >
                              <Trash2 size={16} />
                            </Button>
                          </div>
                        );
                      })}
                    </div>

                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setChoices([...choices, { index: choices.length + 1, content: "" }])}
                      className="w-full border-dashed text-slate-500 mt-2"
                    >
                      <PlusCircle className="w-4 h-4 mr-2" /> 보기 추가
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* 4. OBO 시각화 섹션 - 코딩/객관식만 표시 */}
          {(problemType === "coding" || problemType === "objective") && <Card className="border-slate-100 shadow-sm rounded-2xl">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Network className="w-5 h-5 text-indigo-500" />
                    OBO 시각화 포함
                  </CardTitle>
                  <CardDescription>
                    {oboBlockedByMultiAnswer
                      ? "다중 정답 문제는 OBO를 생성할 수 없습니다. 정답을 1개만 선택하면 활성화됩니다."
                      : "문제에 운영체제 동작 시각화(OBO)를 첨부합니다."}
                  </CardDescription>
                </div>
                <div
                  onClick={() => {
                    if (oboBlockedByMultiAnswer) return;
                    if (oboEnabled) {
                      const ok = window.confirm("OBO를 비활성화하면 편집한 내용이 초기화됩니다. 계속할까요?");
                      if (!ok) return;
                      setOboData({ mode: 'single', single: { nodes: [], edges: [], frames: [] } });
                    }
                    setOboEnabled(v => !v);
                  }}
                  className={`w-11 h-6 rounded-full transition-colors flex items-center px-0.5 shrink-0 ${oboBlockedByMultiAnswer ? "opacity-50 cursor-not-allowed pointer-events-none" : "cursor-pointer"
                    } ${oboEnabled ? "bg-indigo-600" : "bg-slate-200"}`}
                >
                  <div className={`w-5 h-5 bg-white rounded-full shadow transition-transform ${oboEnabled ? "translate-x-5" : "translate-x-0"}`} />
                </div>
              </div>
            </CardHeader>

            {oboEnabled && (
              <CardContent className="pt-0">
                <div className="flex items-center justify-between p-4 bg-slate-50 border border-slate-200 rounded-xl">
                  <p className="text-sm text-slate-500">
                    {oboData.mode === 'per_choice' ? (
                      <>보기별 모드 &nbsp;·&nbsp; 보기 <span className="font-bold text-slate-800">{Object.keys(oboData.perChoice ?? {}).length}</span>개 설정됨</>
                    ) : (
                      <>
                        노드 <span className="font-bold text-slate-800">{oboData.single?.nodes.length ?? 0}</span>개 &nbsp;·&nbsp;
                        엣지 <span className="font-bold text-slate-800">{oboData.single?.edges.length ?? 0}</span>개 &nbsp;·&nbsp;
                        프레임 <span className="font-bold text-slate-800">{oboData.single?.frames.length ?? 0}</span>개
                      </>
                    )}
                  </p>
                  <Button variant="outline" size="sm" onClick={openOboModal} className="gap-1.5">
                    <Network className="w-3.5 h-3.5" />
                    OBO 편집하기
                  </Button>
                </div>
              </CardContent>
            )}
          </Card>}

          {/* OBO 전체화면 모달 */}
          {oboModalOpen && (
            <div className="fixed inset-0 z-50 flex flex-col bg-white">
              <header className="h-14 border-b flex items-center justify-between px-6 shrink-0">
                <span className="font-bold text-slate-900">OBO 편집</span>
                <div className="flex gap-2">
                  <Button variant="ghost" size="sm" onClick={cancelOboModal}>취소</Button>
                  <Button size="sm" onClick={confirmOboModal}>완료</Button>
                </div>
              </header>
              <div className="flex-1 min-h-0">
                <OboEditorSection
                  value={oboData}
                  onChange={setOboData}
                  choices={problemType === 'objective'
                    ? choices.map(c => ({ id: `choice_${c.index}`, text: c.content }))
                    : undefined}
                  allowCodingDiff={problemType === 'coding'}
                  testcaseOutputs={problemType === 'coding'
                    ? testcases.map(tc => ({ index: tc.index, output: tc.output }))
                    : undefined}
                />
              </div>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

export default function ProblemCreatePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
      </div>
    }>
      <ProblemCreateContent />
    </Suspense>
  );
}