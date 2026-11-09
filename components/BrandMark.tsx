// DiveOn 로고: 디보 + 워드마크 (Header 및 단독 헤더 페이지 공용)
export function BrandMark({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  const img = size === "lg" ? "h-10" : size === "sm" ? "h-7" : "h-8";
  const text = size === "lg" ? "text-3xl" : size === "sm" ? "text-lg" : "text-xl";
  return (
    <span className="inline-flex items-center gap-2">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/images/divo.webp" alt="" className={`${img} w-auto`} />
      <span className={`${text} font-extrabold tracking-[-0.03em] text-ink`}>
        Dive<span className="text-primary">On</span>
      </span>
    </span>
  );
}
