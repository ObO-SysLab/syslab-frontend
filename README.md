# syslab-frontend

DiveOn([diveon.net](https://diveon.net))의 웹 화면이다. Next.js 16(App Router)과 React 19로 만들었다. 정적 파일로 빌드해 S3에 올리고 CloudFront로 내보낸다.

## 화면

| 경로 | 화면 |
| --- | --- |
| `/` | 홈. 오늘의 문제, 최근 활동 |
| `/challenges` | 문제 목록. `detail` 풀이, `create`·`editor` 출제, `submissions` 제출 기록, `terminal` 실습 터미널, `obo` 장면 재생 |
| `/contests` | 대회 목록과 대회 화면 |
| `/groups` | 그룹, 그룹 문제, 게시판 |
| `/ranking` | 사용자 랭킹 |
| `/store` | 포인트 상점 |
| `/settings` | 계정·알림 설정 |
| `/signin`, `/signup`, `/find-account` | 로그인, 회원가입, 계정 찾기 |

## OBO

OBO(Operating By Operating)는 운영체제 동작을 장면 단위로 재생하는 기능이다. `components/obo/`에 있다.

- `runtime/`: 시나리오 엔진. 프로세스 상태 전이, CPU 스케줄링(FCFS·SJF·RR·우선순위), 문맥 교환, 페이지 교체(FIFO·LRU·OPT, Belady 현상), 스래싱, 주소 변환·TLB, 메모리 할당, 자원 할당 그래프, 은행원 알고리즘, 생산자·소비자, 식사하는 철학자, inode 접근, 디스크 스케줄링, 시스템 호출, IPC 등 20가지 시나리오가 있다.
- 그림은 React Flow(`@xyflow/react`)로 그린다. 브라우저에서는 엔진을 Web Worker(`simulation.worker.mjs`)로 돌린다.
- 출제자는 간편 모드(값만 넣으면 장면과 정답을 만든다)나 자유 모드(직접 그린다)로 OBO를 만든다.

같은 엔진을 백엔드(문제 저장 때 검사)와 채점기(코딩 제출의 장면 생성)도 쓴다. 엔진을 고쳤으면 아래 명령으로 두 저장소의 복사본을 맞추고 같이 커밋한다. 세 저장소가 같은 부모 폴더에 있어야 한다.

```sh
node scripts/export-obo-runtime.mjs          # syslab-backend/obo-runtime, syslab-infra/grader/obo_runtime에 복사
node scripts/export-obo-runtime.mjs --check  # 같은지만 확인
```

`npm run dev`·`build`·`test` 전에는 `scripts/export-obo-browser.mjs`가 브라우저용 묶음을 `public/obo-runtime/<해시>/`에 만든다.

## 기술

| 용도 | 사용 |
| --- | --- |
| 프레임워크 | Next.js 16.4, React 19, TypeScript |
| 스타일·컴포넌트 | Tailwind CSS 4, Radix UI, lucide 아이콘 |
| OBO 그림 | React Flow |
| 차트 | Recharts |
| 코드 편집기 | Monaco Editor |
| 실습 터미널 | xterm.js |
| 테스트 | Vitest |

## 로컬 실행

```sh
npm ci
npm run dev        # http://localhost:3000
npm test
npx tsc --noEmit
npm run build      # out/에 정적 파일
```

API 주소는 `https://diveon.net/api`로 코드에 들어 있는 곳이 많다. 백엔드 없이 화면만 볼 때는 `.env.example`을 `.env.local`로 복사하고 `NEXT_PUBLIC_USE_MOCK=true`로 바꾸면 `lib/mock`의 목 응답을 쓴다.

## 배포

[`.github/workflows/deploy.yml`](.github/workflows/deploy.yml)이 맡는다.

- PR, `fix/**` push: 테스트, 타입 검사, 빌드까지 한다.
- `main` push: `out/`을 S3에 올리고 CloudFront 캐시를 비운다. 바뀔 파일을 먼저 백업해 두고, 중간에 실패하면 백업으로 되돌린다(`scripts/deploy-static.py`).
