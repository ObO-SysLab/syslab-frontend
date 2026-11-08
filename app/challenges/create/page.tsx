"use client";
import { logout } from "@/lib/authSession";

import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import {
  Menu, LogOut, CheckCircle2, Target, Zap, Code2, PlusCircle, Eye,
  StickyNote, Bell, Trash2, Network
} from "lucide-react";
import type { ProblemOboData } from "@/components/obo/types";
import { OboEditorSection } from "@/components/obo/OboEditorSection";
import { freshId } from '@/components/obo/runtime/document.mjs';
import { CodingExampleControl } from '@/components/obo/simulation/CodingExampleControl';
import { CodingRules } from '@/components/obo/simulation/CodingRules';
import { describeCodingContract } from '@/components/obo/guidance/codingContract';
import { validateProblemObo } from "@/components/obo/lib/validateObo";
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
import {problemApi,problemToken} from '@/lib/problemApi';
import {useBrowserDraft} from '@/components/obo/authoring/useBrowserDraft';
import {isProblemDraft,type ProblemDraft} from '@/components/obo/authoring/problemDraft';

function ProblemCreateContent() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const searchParams = useSearchParams();
  const editId = searchParams.get("id"); // URL의 ?id=... 값을 가져옴
  const isEditMode = !!editId; // id가 있으면 수정 모드(true)
  const [userImgUrl, setUserImgUrl] = useState("/avatar.png");

  useEffect(() => {
    const token = problemToken();
    if (token) {
      setIsLoggedIn(true);
    } else {
      alert("로그인이 필요한 서비스입니다.");
      window.location.href = "/signin"; // 로그인 페이지로 리다이렉트
    }
  }, []);

  const handleLogout = () => {
    if (!logout()) return;
    setIsLoggedIn(false);
    window.location.href = "/";
  };

  // [STATE] 문제 유형 (coding / ctf / objective) - API 명세에 맞춰 내부 값 변경
  const [problemType, setProblemType] = useState("coding");
  const [descriptionTab,setDescriptionTab]=useState('desc');

  // [STATE] 공통 정보
  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState(""); // 스토리를 summary로 매핑
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("kernel");
  const [difficulty, setDifficulty] = useState("1");
  const [visibility, setVisibility] = useState(isEditMode ? "" : "public");

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
    { id: 'choice_1', index: 1, content: "" }, { id: 'choice_2', index: 2, content: "" }, { id: 'choice_3', index: 3, content: "" }, { id: 'choice_4', index: 4, content: "" }
  ]);
  const [selectedAnswers, setSelectedAnswers] = useState<number[]>([1]);
  const [isOrderedAnswer, setIsOrderedAnswer] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editLoaded,setEditLoaded]=useState(!editId);
  const [editError,setEditError]=useState('');
  const [saveNotice,setSaveNotice]=useState('');
  const [editVersion,setEditVersion]=useState<string|null>(null);
  const [oboAlternates,setOboAlternates]=useState<ProblemDraft['oboAlternates']>({});

  // 객관식 정답 토글 핸들러
  // [상태 관리] OBO 시각화
  const [oboEnabled, setOboEnabled] = useState(false);
  const [oboData, setOboData] = useState<ProblemOboData>({ mode: 'single', single: { nodes: [], edges: [], frames: [] } });
  const [oboModalOpen, setOboModalOpen] = useState(false);
  const modernObjective=oboEnabled&&oboData.mode==='simulation';
  const orderedSelection=isOrderedAnswer&&!modernObjective;
  const [oboDataSnapshot, setOboDataSnapshot] = useState<ProblemOboData | null>(null);

  const openOboModal = () => {
    setOboDataSnapshot(oboData);
    setOboModalOpen(true);
  };
  const confirmOboModal = () => setOboModalOpen(false);
  const cancelOboModal = () => {
    // 편집으로 내용이 바뀐 경우에만 폐기 확인
    const dirty = JSON.stringify(oboData) !== JSON.stringify(oboDataSnapshot);
    if (dirty && !window.confirm("편집한 내용이 저장되지 않습니다. 취소할까요?")) return;
    if (oboDataSnapshot) setOboData(oboDataSnapshot);
    setOboModalOpen(false);
  };

  // 2. 객관식 정답 토글 핸들러
  const toggleAnswer = (idx: number) => {
    const val = idx + 1;
    if (oboEnabled && oboData.mode === 'simulation' && oboData.simulation?.question.selectionMode === 'single') {
      setSelectedAnswers([val]);
      return;
    }

    if (selectedAnswers.includes(val)) {
      // 해제한 후 정답이 0개가 되는 '결과론적 상황'만 차단
      if (selectedAnswers.length === 1) {
        alert("최소 하나의 정답은 선택해야 합니다.");
        return;
      }
      setSelectedAnswers(selectedAnswers.filter((a) => a !== val));
    } else {
      // 순서 일치 옵션이 켜져 있다면 .sort()를 생략하고 누른 순서 그대로 push
      const next = orderedSelection
        ? [...selectedAnswers, val]                     // 1. 순서 지정 모드: 누른 데이터 뒤에 차례로 누적 [4, 2, 1]
        : [...selectedAnswers, val].sort((a, b) => a - b); // 2. 일반 다중 모드: 기존처럼 번호 순 정렬 [1, 2, 4]

      setSelectedAnswers(next);

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
    if (oboData.mode === 'simulation' && oboData.simulation) {
      const explanations = {...oboData.simulation.explanations.choices};
      delete explanations[choices[indexToRemove].id];
      setOboData({...oboData, simulation: {...oboData.simulation, explanations: {...oboData.simulation.explanations, choices: explanations}}});
    }

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
    setSaveNotice('');
    if(isEditMode&&problemType!=='practice'&&!editVersion){setSaveNotice('서버 버전을 확인하지 못했습니다. 초안을 보관하고 다시 열어주세요.');return;}
    draft.save();
    if(!editLoaded)return;
    if (!title || !category || !description) {
      alert("제목, 카테고리, 문제 설명은 필수입니다.");
      return;
    }

    if (!isEditMode && visibility === "group" && !selectedGroupId) {
      alert("공개할 그룹을 선택해주세요.");
      return;
    }

    if (oboEnabled) {
      const oboErrors = validateProblemObo(oboData, { choiceCount: choices.length });
      if (oboErrors.length) {
        alert("OBO 설정을 확인하세요:\n- " + oboErrors.join("\n- "));
        return;
      }
    }

    setIsSubmitting(true);
    const token = problemToken();

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
        endpoint = problemApi(`/api/problems/${problemType.toLocaleLowerCase()}/${editId}`);

        const patchPayload = {
          expectedEditVersion:editVersion,
          title,
          summary: summary || title,
          description,
          difficulty: difficulty,
          oboAction: oboEnabled ? 'replace' : 'remove',
          oboJson: oboEnabled ? oboData : null,
          ...(problemType==='objective'?{choices,answer:selectedAnswers}:{}),
          ...(problemType==='coding'?{
            constraints:{timeLimitMs:timeLimit*1000,memoryLimitMb:memoryLimit,allowedLanguages},
            inputDescription:inputDesc,outputDescription:outputDesc,
            testcases:testcases.map(tc=>({index:tc.index,input:tc.input,output:tc.output,isSample:tc.is_sample})),
          }:{}),
        };

        bodyData = JSON.stringify(patchPayload);
      }
      // ----------------------------------------------------
      // [CASE 2] 신규 문제 등록 모드 (POST) - 기존 로직 유지
      // ----------------------------------------------------
      else {
        // 실습형(practice)은 multipart/form-data 처리
        if (problemType === "practice") {
          endpoint = problemApi(`/api/problems/practice`);

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
            endpoint = problemApi(`/api/problems/coding`);
            payload = {
              ...payload,
              constraints: {
                timeLimitMs: timeLimit * 1000,
                memoryLimitMb: memoryLimit,
                allowedLanguages: allowedLanguages
              },
              inputDescription: inputDesc || "입력 설명",
              outputDescription: outputDesc || "출력 설명",
              testcases: testcases.map(tc => ({ index: Number(tc.index), input: tc.input, output: tc.output, isSample: tc.is_sample })),
              obo: { enabled: false, initialImageUrl: null },
              oboJson: oboEnabled ? oboData : null,
              isDraft: false
            };
          } else if (problemType === "objective") {
            endpoint = problemApi(`/api/problems/objective`);
            if (choices.some(c => !c.content.trim())) {
              setIsSubmitting(false);
              return alert('빈 보기의 내용을 입력하거나 해당 보기를 삭제하세요.');
            }
            const validChoices = choices.map((c, i) => ({ id: c.id, index: i + 1, content: c.content, imageUrl: null }));
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
        const savedResponse=await response.json().catch(()=>null);
        const savedId=isEditMode?editId:savedResponse?.data?.probId;
        draft.markSaved();
        alert(isEditMode ? "수정되었습니다!" : problemType === 'practice'
          ? "문제가 등록되었습니다. 상세 화면에서 실습 환경 제작 상태를 확인할 수 있습니다."
          : "등록되었습니다!");
        window.location.href = savedId ? `/challenges/detail?id=${savedId}` : "/challenges";
      } else {
        if(response.status===409){setSaveNotice('다른 창에서 수정되었습니다. 내 초안은 유지됩니다. 파일로 보관하거나 최신 서버 자료를 다시 연 뒤 비교하세요.');return;}
        const errorText = await response.text();
        let errorMessage = "입력값이 잘못되었거나 권한이 없습니다.";
        try {
          const errorData = JSON.parse(errorText);
          errorMessage = errorData.detail || errorData.message || errorMessage;
        } catch (e) { errorMessage = errorText; }
        setSaveNotice(`서버 저장 실패: ${errorMessage} 작성 내용과 브라우저 초안을 유지합니다.`);
        alert(`실패: ${errorMessage}`);
      }
    } catch (error) {
      console.error(error);
      setSaveNotice('서버에 연결하지 못했습니다. 작성 내용과 브라우저 초안을 유지합니다. 다시 저장할 수 있습니다.');
      alert("서버 통신 중 오류가 발생했습니다.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // [API] 수정 모드용 데이터 로드
  useEffect(() => {
    if (isEditMode) {
      const token = problemToken();

      fetch(problemApi(`/api/problems/${editId}`), {
        headers: { "Authorization": `Bearer ${token}` }
      })
        .then(res => {if(!res.ok)throw new Error('문제를 불러오지 못했습니다.');return res.json();})
        .then(async json => {
          const data = json.data;
          if(!data?.isOwner)throw new Error('작성자만 문제를 수정할 수 있습니다.');
          if(!['public','private','group','contest'].includes(data.visibility))throw new Error('공개 범위를 확인할 수 없습니다. 문제를 다시 열어주세요.');
          if (data.isOwner && (data.type === 'objective' || data.type === 'coding')) {
            const authorObo = await fetch(problemApi(`/api/challenges/obo/author/settings?id=${editId}`), {
              headers: { Authorization: `Bearer ${token}` }, cache: 'no-store',
            });
            if (!authorObo.ok) throw new Error('작성자 OBO를 불러오지 못했습니다.');
            const text = await authorObo.text();
            Object.assign(data, text ? JSON.parse(text) : {});
          }
          // 공통 필드 채우기
          setEditVersion(data.editVersion??null);
          setTitle(data.title);
          setSummary(data.summary || "");
          setDescription(data.description);
          setCategory(data.category?.toLowerCase() || "");
          setDifficulty(String(data.difficulty));
          setVisibility(data.visibility);
          setProblemType(data.type); // 'coding', 'objective', 'practice' 중 하나

          // 유형별 상세 필드 채우기
          if (data.type === "coding") {
            setTimeLimit((data.constraints?.timeLimitMs || 1000) / 1000);
            setMemoryLimit(data.constraints?.memoryLimitMb || 256);
            setAllowedLanguages(data.constraints?.allowedLanguages ?? ['c','cpp','python']);
            setInputDesc(data.inputDescription ?? '');setOutputDesc(data.outputDescription ?? '');
            setTestcases((data.testcases || []).map((tc: {index:number;input:string;output:string;isSample?:boolean;is_sample?:boolean}) => ({index:tc.index,input:tc.input,output:tc.output,is_sample:tc.isSample??tc.is_sample??false})));
          } else if (data.type === "objective") {
            setChoices((data.choices || []).map((choice: {id?:string;index:number;content:string}) => ({...choice,id:choice.id??`choice_${choice.index}`})));
            setSelectedAnswers(data.answer?.length ? data.answer : [1]);
            setIsOrderedAnswer(data.isSeqeuntialAnswer??false);
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

          if (data.oboJson) {
            // 이전 형식(OboBlob 직접 저장) 호환성 처리
            const raw = data.oboJson;
            if (raw.mode === 'single' || raw.mode === 'per_choice' || raw.mode === 'coding_diff' || raw.mode === 'simulation') {
              setOboData(raw);
            } else {
              // legacy: OboBlob 그대로 저장된 경우
              setOboData({ mode: 'single', single: raw });
            }
            setOboEnabled(true);
          }
          setEditLoaded(true);setEditError('');
        })
        .catch(err => {
          setEditError(err instanceof Error?err.message:'문제를 불러오지 못했습니다.');
          console.error(err);
        });
    }
  }, [editId]);

  useEffect(() => {
    const fetchProfileImage = async () => {
      const token = problemToken();
      if (!token) return;

      setIsLoggedIn(true);

      try {
        const response = await fetch(problemApi("/api/profile/show"), {
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
    if (!isEditMode && visibility === "group" && myGroups.length === 0) {
      setIsFetchingGroups(true);
      const token = problemToken();
      fetch(problemApi("/api/groups/me"), {
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
    if (!isEditMode && visibility === "contest" && myContests.length === 0) {
      setIsFetchingContests(true);
      const token = problemToken();
      fetch(problemApi("/api/contests/me/owned"), {
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
  const draftValue:ProblemDraft={problemType,title,summary,description,category,difficulty,visibility,timeLimit,memoryLimit,inputDesc,outputDesc,allowedLanguages,testcases,choices,selectedAnswers,isOrderedAnswer,oboEnabled,oboData,editVersion,selectedGroupId,selectedContestId,oboAlternates};
  const restoreDraft=(d:ProblemDraft)=>{
    setProblemType(d.problemType);setTitle(d.title);setSummary(d.summary);setDescription(d.description);setCategory(d.category);setDifficulty(d.difficulty);
    // Updates preserve the server's audience; old drafts must not replace its displayed scope.
    if(!isEditMode)setVisibility(d.visibility);
    setTimeLimit(d.timeLimit);setMemoryLimit(d.memoryLimit);setInputDesc(d.inputDesc);setOutputDesc(d.outputDesc);setAllowedLanguages(d.allowedLanguages);setTestcases(d.testcases);
    setChoices(d.choices);setSelectedAnswers(d.selectedAnswers);setIsOrderedAnswer(d.isOrderedAnswer);setOboEnabled(d.oboEnabled);setOboData(d.oboData);setEditVersion(d.editVersion);
    setSelectedGroupId(d.selectedGroupId);setSelectedContestId(d.selectedContestId);setOboAlternates(d.oboAlternates);setOboModalOpen(false);
  };
  const draft=useBrowserDraft({documentId:editId??'new',value:draftValue,restore:restoreDraft,enabled:editLoaded&&isLoggedIn&&problemType!=='practice',valid:isProblemDraft});

  if(draft.locked)return <main className="p-8"><p role="alert">계정이 바뀌었습니다. 이전 계정의 작성 화면을 닫았습니다.</p><a className="underline" href="/signin">다시 로그인</a> · <a className="underline" href="/challenges/create">작성 화면 다시 열기</a></main>;

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
        <section inert={isSubmitting} className="col-span-12 md:col-span-9 space-y-8 animate-in fade-in-50 duration-500">
          {/* 타이틀 및 저장 버튼 */}
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div className="space-y-1">
              <h1 className="text-3xl font-black tracking-tighter text-slate-950">
                {isEditMode ? "문제 수정" : "문제 등록"}
              </h1>
              <p className="text-slate-500">문제를 만들고 다른 유저들과 공유합니다.</p>
            </div>
            <div className="flex gap-2">
              <Button variant="secondary" className="px-6" onClick={draft.save}>브라우저에 보관</Button>
              <Button variant="outline" onClick={()=>{setDescriptionTab('prev');document.getElementById(problemType==='coding'?'learner-preview':'problem-description')?.scrollIntoView({behavior:'smooth',block:'start'});}} className="px-6 border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-all group">
                <Eye size={16} className="mr-2 text-slate-400 group-hover:text-indigo-500 transition-colors" />{problemType==='coding'?'학습자 미리보기':'문제 미리보기'}
              </Button>
              {/* 제출 버튼에 onClick 연결 */}
              {editError&&<p role="alert" className="text-sm text-red-600">{editError}</p>}
              <Button onClick={handleSubmit} disabled={isSubmitting||!editLoaded}>
                <Zap size={16} className="mr-2" />
                {isSubmitting ? "처리 중..." : (isEditMode ? "수정 완료" : "문제 등록")}
              </Button>
            </div>
          </div>
          {problemType!=='practice'&&<div className="space-y-2 rounded-xl border border-indigo-100 bg-white p-4 text-sm" aria-label="작성 자료 보관">
            <p role="status">{draft.status}</p>
            <p className="text-xs text-slate-500">이 기기·브라우저에 보관됩니다. 서버 저장은 문제 등록/수정 완료 버튼으로 진행합니다.</p>
            <Button variant="outline" size="sm" onClick={draft.exportFile}>초안 파일로 보관</Button>
            <p className="text-xs text-slate-500">초안은 암호화 없이 이 브라우저에 남습니다. 공용 기기에서는 사용 후 보관본을 삭제하세요.</p>
            <Button variant="outline" size="sm" onClick={()=>{if(confirm('이 계정의 현재 문서 보관본을 모든 탭에 걸쳐 삭제할까요? 화면의 작성 내용은 유지됩니다.'))draft.deleteSaved();}}>이 문서의 보관본 삭제</Button>
            {draft.candidates.map(record=><div key={record.id} className="flex flex-wrap items-center gap-2"><span>{new Date(record.savedAt).toLocaleString('ko-KR')} · {record.value.title||'제목 없는 초안'}</span><Button variant="outline" size="sm" onClick={()=>{if(window.confirm('현재 작성 내용을 먼저 보관하고 선택한 초안을 불러올까요?')){if(draft.save())draft.recover(record);}}}>초안 복구</Button></div>)}
            {saveNotice&&<p role="alert" className="text-rose-700">{saveNotice}</p>}
          </div>}
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
                  <Select value={visibility} onValueChange={setVisibility} disabled={isEditMode}>
                    <SelectTrigger><SelectValue placeholder="공개범위 선택" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="public" className="text-emerald-600 font-bold">전체 공개</SelectItem>
                      <SelectItem value="group" className="text-blue-600 font-bold">그룹 공개</SelectItem>
                      <SelectItem value="contest" className="text-purple-600 font-bold">대회 공개</SelectItem>
                      <SelectItem value="private" className="text-amber-600 font-bold">비공개</SelectItem>
                    </SelectContent>
                  </Select>
                  {isEditMode && <p className="text-xs text-slate-500">현재 공개 범위입니다. 이 수정 화면에서는 변경할 수 없습니다.</p>}
                </div>
              </div>

              {!isEditMode && visibility === "group" && (
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

              {!isEditMode && visibility === "contest" && (
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
          <Card id="problem-description" className="scroll-mt-20 border-slate-100 shadow-sm rounded-2xl overflow-hidden">
            <Tabs value={descriptionTab} onValueChange={setDescriptionTab}>
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
                  if(problemType!=='practice'&&!draft.checkpoint())return;
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
                      <Input type="number" min={1} max={30} step={1} value={timeLimit} onChange={(e) => setTimeLimit(Number(e.target.value))} className="font-mono" />
                      <p className="text-xs text-slate-500">1~30초, 정수 단위</p>
                    </div>
                    <div className="space-y-1.5">
                      <Label>메모리 제한 (MB)</Label>
                      <Input type="number" min={16} max={1024} step={1} value={memoryLimit} onChange={(e) => setMemoryLimit(Number(e.target.value))} className="font-mono" />
                      <p className="text-xs text-slate-500">16~1024 MiB</p>
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
                    <p className="text-xs text-slate-500">등록 후 실습 환경을 제작합니다. 상세 화면에서 제작 중·완료·실패 상태를 확인할 수 있으며, 제작 완료 후 실습을 시작할 수 있습니다.</p>
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
                  {!modernObjective&&<div className="flex items-center justify-between p-4 bg-indigo-50/50 border border-indigo-100 rounded-xl">
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
                  </div>}

                  <div className="space-y-4 pt-1">
                    <Label className="flex justify-between items-center">
                      <span>보기 설정 및 정답 선택 <span className="text-red-500">*</span></span>
                      <span className="text-[10px] text-slate-400">
                        {orderedSelection ? "번호를 누른 순서가 정답 순서가 됩니다." : modernObjective&&oboData.simulation?.question.selectionMode==='single'?'정답 하나를 선택하세요.':"정답 보기를 모두 선택하세요."}
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
                              {isSelected && orderedSelection ? orderIndex + 1 : <CheckCircle2 size={14} />}
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
                      onClick={() => setChoices([...choices, { id: freshId('choice'), index: choices.length + 1, content: "" }])}
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
                    문제에 운영체제 동작 시각화(OBO)를 첨부합니다. 복수 선택 문제도 보기별 해설을 제공합니다.
                  </CardDescription>
                </div>
                <button type="button" role="switch" aria-label="OBO 시각화 포함" aria-checked={oboEnabled}
                  onClick={() => {
                    if (oboEnabled) {
                      const ok = window.confirm("OBO를 비활성화하면 편집한 내용이 초기화됩니다. 계속할까요?");
                      if (!ok) return;
                      setOboData({ mode: 'single', single: { nodes: [], edges: [], frames: [] } });
                    }
                    setOboEnabled(v => !v);
                  }}
                  className={`w-11 h-6 rounded-full transition-colors flex items-center px-0.5 shrink-0 cursor-pointer ${oboEnabled ? "bg-indigo-600" : "bg-slate-200"}`}
                >
                  <div className={`w-5 h-5 bg-white rounded-full shadow transition-transform ${oboEnabled ? "translate-x-5" : "translate-x-0"}`} />
                </button>
              </div>
            </CardHeader>

            {oboEnabled && (
              <CardContent className="pt-0">
                {problemType==='coding'&&oboData.mode==='simulation'&&oboData.simulation?.question.judgeProfile==='obo-v1'&&<CodingExampleControl document={oboData.simulation} onAdd={(input,output)=>{
                  setTestcases(previous=>{
                    const kept=previous.filter(tc=>tc.input.trim()||tc.output.trim());
                    return [...kept,{index:kept.length+1,input,output,is_sample:true}];
                  });
                }}/>}
                <div className="flex items-center justify-between p-4 bg-slate-50 border border-slate-200 rounded-xl">
                  <p className="text-sm text-slate-500">
                    {oboData.mode === 'simulation' ? (
                      <>규칙 기반 시뮬레이션 · {oboData.simulation?.instances.length ?? 0}개 독립 실행</>
                    ) : oboData.mode === 'per_choice' ? (
                      <>보기별 모드 &nbsp;·&nbsp; 보기 <span className="font-bold text-slate-800">{Object.keys(oboData.perChoice ?? {}).length}</span>개 설정됨</>
                    ) : oboData.mode === 'coding_diff' ? (
                      <>
                        출력 기록 재생 &nbsp;·&nbsp;
                        노드 <span className="font-bold text-slate-800">{oboData.codingDiff?.nodes.length ?? 0}</span>개 &nbsp;·&nbsp;
                        엣지 <span className="font-bold text-slate-800">{oboData.codingDiff?.edges.length ?? 0}</span>개 &nbsp;·&nbsp;
                        트레이스 <span className="font-bold text-slate-800">{oboData.codingDiff?.referenceTrace.length ?? 0}</span>스텝
                      </>
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

          {problemType==='coding'&&<section id="learner-preview" className="scroll-mt-20 rounded-2xl border bg-white p-5">
            <h2 className="font-semibold">학습자 제출 안내 미리보기</h2>
            <p className="mt-2 text-sm text-slate-600">저장 전 현재 작성 내용으로 확인합니다. 공개 예제만 표시하며, 실제 저장은 문제 등록·수정 버튼을 눌러야 합니다.</p>
            <div className="my-4 border-b pb-4"><h3 className="font-semibold">{title||'문제 제목'}</h3><p className="mt-2 whitespace-pre-wrap break-words text-sm">{description||'문제 설명을 작성하세요.'}</p></div>
            {oboEnabled&&oboData.mode==='coding_diff'&&<p className="mt-2 text-sm text-indigo-700">아래 요소 ID·종류·허용 필드·연결선 ID는 제출 전 공개됩니다. ID에 정답을 넣지 마세요. 기본값·라벨·배치·연결 관계·참고 출력은 공개하지 않습니다. 풀이에 필요한 초기 조건과 칸 수는 위 입력·출력 설명에 작성하세요.</p>}
            <CodingRules contract={describeCodingContract(oboEnabled?oboData:null)} inputDescription={inputDesc} outputDescription={outputDesc} allowedLanguages={allowedLanguages}/>
            <h3 className="font-medium">공개 입출력 예제</h3>
            {testcases.filter(tc=>tc.is_sample).length?testcases.filter(tc=>tc.is_sample).map((tc,i)=><div key={tc.index} className="mt-3 grid gap-3 md:grid-cols-2"><div><p className="text-xs font-semibold">입력 예제 {i+1}</p><pre className="overflow-auto rounded bg-slate-50 p-3 text-xs">{tc.input}</pre></div><div><p className="text-xs font-semibold">출력 예제 {i+1}</p><pre className="overflow-auto rounded bg-slate-50 p-3 text-xs">{tc.output}</pre></div></div>):<p className="mt-2 text-sm text-amber-700">공개 예제가 없습니다. 학습자가 형식을 확인할 수 있도록 테스트케이스에서 공개 예제를 지정하세요.</p>}
          </section>}

          {/* OBO 전체화면 모달 */}
          {oboModalOpen && (
            <div className="fixed inset-0 z-50 flex flex-col bg-white">
              <header className="h-14 border-b flex items-center justify-between px-6 shrink-0">
                <span className="font-bold text-slate-900">OBO 편집</span>
                <div className="flex gap-2">
                  <Button variant="ghost" size="sm" onClick={cancelOboModal}>취소</Button>
                  <Button size="sm" onClick={confirmOboModal}>작성 내용에 반영</Button>
                </div>
              </header>
              <div className="flex-1 min-h-0">
                <OboEditorSection
                  value={oboData}
                  onChange={setOboData}
                  alternatives={oboAlternates}
                  onAlternativesChange={setOboAlternates}
                  choices={problemType === 'objective'
                    ? choices.map(c => ({ id: oboData.mode === 'simulation' ? c.id : `choice_${c.index}`, text: c.content }))
                    : undefined}
                  allowCodingDiff={problemType === 'coding'}
                  testcaseOutputs={problemType === 'coding'
                    ? testcases.filter(tc=>tc.is_sample).map(tc => ({ index: tc.index, output: tc.output }))
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
