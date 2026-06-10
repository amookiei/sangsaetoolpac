/** 상세 스튜디오 로고 — public/favicon.svg와 동일한 마크 */
export function Logo({ size = 34 }: { size?: number }) {
  return (
    <img
      src="/favicon.svg"
      width={size}
      height={size}
      alt="상세 스튜디오"
      style={{ display: 'block', filter: 'drop-shadow(0 3px 8px rgba(194,91,57,0.3))' }}
    />
  );
}
