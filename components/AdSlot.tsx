// 우측 광고 칸 (공통). 광고가 없으면 아무것도 그리지 않는다 — "광고 영역" 같은 자리 표시는 두지 않는다.
// 감싸는 aside는 각 페이지에서 `hidden xl:block`으로 둔다(1280px 미만에서는 칸 자체를 숨김).

export type AdItem = {
  ad_id: string | number;
  link_url: string;
  image_url: string;
  alt_text?: string;
};

export function AdSlot({ ads }: { ads?: AdItem[] | null }) {
  if (!ads || ads.length === 0) return null;
  return (
    <div className="sticky top-24 space-y-4">
      {ads.map((ad) => (
        <a
          key={ad.ad_id}
          href={ad.link_url}
          target="_blank"
          rel="noreferrer"
          className="block w-full overflow-hidden rounded-2xl border border-line transition-colors hover:border-line-strong"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={ad.image_url} alt={ad.alt_text ?? "광고"} className="w-full object-cover" />
        </a>
      ))}
    </div>
  );
}
