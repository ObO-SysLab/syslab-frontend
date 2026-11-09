// references/ad.md — VM(실습 환경) / 광고
import { fromNow, ok } from "./common";

// GET /api/vm/status/{probId}
export const mockVmStatusRunningResponse = ok(
  { status: "RUNNING", containerId: "a1b2c3d4e5f6", message: "실행 중인 VM이 있습니다." },
  "VM 상태를 조회했습니다."
);
export const mockVmStatusNoneResponse = ok(
  { status: "NONE", containerId: null, message: "실행 중인 VM이 없습니다." },
  "VM 상태를 조회했습니다."
);
export const mockVmStatusNotReadyResponse = ok(
  { status: "IMAGE_NOT_READY", containerId: null, message: "문제 이미지가 아직 준비 중입니다." },
  "VM 상태를 조회했습니다."
);

// POST /api/vm/create — 새로 생성 / 기존 VM 반환 둘 다 201
export const mockVmCreateResponse = ok(
  { status: "success", containerId: "a1b2c3d4e5f6", message: "VM이 생성되었습니다.", expiresAt: fromNow(2) },
  "VM이 생성되었습니다.",
  201
);
export const mockVmExistingResponse = ok(
  { status: "success", containerId: "a1b2c3d4e5f6", message: "기존 VM을 반환합니다.", expiresAt: fromNow(1.5) },
  "기존 VM을 반환합니다.",
  201
);

// DELETE /api/vm/stop
export const mockVmStopResponse = ok({ status: "success", message: "VM이 종료되었습니다." }, "VM이 종료되었습니다.");

// POST /api/vm/reset — 생성과 같은 형식, HTTP 200
export const mockVmResetResponse = ok(
  { status: "success", containerId: "f6e5d4c3b2a1", message: "VM이 생성되었습니다.", expiresAt: fromNow(2) },
  "VM이 생성되었습니다."
);

// GET /api/ad?placement=
const AD_SIZE = {
  main: { width: 1200, height: 250 },
  probList: { width: 1200, height: 250 },
  probDetail: { width: 300, height: 600 },
} as const;

export type AdPlacement = keyof typeof AD_SIZE;

export const getMockAd = (placement: AdPlacement) => {
  const { width, height } = AD_SIZE[placement];
  return ok(
    {
      placement,
      width,
      height,
      ads: [1, 2].map((n) => ({
        adId: n,
        imageUrl: `https://placehold.co/${width}x${height}/0066FF/FFFFFF?text=DiveOn+Ad+${n}`,
        linkUrl: "#",
        altText: `광고 ${n}`,
        expiresAt: "2026-12-31T23:59:59",
      })),
    },
    "광고 조회에 성공하였습니다."
  );
};
