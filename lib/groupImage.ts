// 그룹 대표 사진 주소. 백엔드가 profiles/groups/{groupId} 키로 올리므로 목록·상세·랭킹이 같은 주소를 쓴다.
// 사진이 없으면 404가 오고, 화면은 AvatarFallback의 SeaCritter를 보여 준다.
const GROUP_IMAGE_BASE = "https://d3ghudecvdi62z.cloudfront.net/profiles/groups/";

export function groupImageUrl(groupId: number | string | null | undefined, version?: number | string): string | undefined {
  if (groupId === null || groupId === undefined || groupId === "") return undefined;
  const url = `${GROUP_IMAGE_BASE}${encodeURIComponent(String(groupId))}`;
  return version === undefined ? url : `${url}?v=${version}`;
}
