import { useEffect, useState, type CSSProperties, type ReactNode } from 'react';
import { animById, LINE_DELAY } from '../../data/typoAnimations';

const EASE = 'cubic-bezier(.2,.7,.3,1)';

/**
 * 타이포 애니메이션 미리보기 — GIF처럼 주기 반복 재생.
 * unit 'char': 글자별 stagger (charOffset으로 블록 맨 위부터 누적 순서 유지)
 * unit 'line': 줄 전체가 lineIdx 순서대로 등장
 */
export function TypoText({
  text,
  animId,
  style,
  unit = 'char',
  speed = 1,
  charOffset = 0,
  lineIdx = 0,
}: {
  text: string;
  animId: string | null;
  style?: CSSProperties;
  unit?: 'char' | 'line';
  speed?: number;
  charOffset?: number;
  lineIdx?: number;
}) {
  const anim = animById(animId);
  const dur = anim ? Math.max(anim.duration, 0.3) / speed : 0;
  const stagger = anim ? (anim.stagger || 0.06) / speed : 0;
  const totalMs = anim
    ? (unit === 'line'
        ? (lineIdx * LINE_DELAY) / speed + dur
        : (charOffset + text.length) * stagger + dur) * 1000 + 1400
    : 0;
  const cycle = useCycle(anim ? Math.max(totalMs, 2600) : 0);

  if (!anim) return <span style={style}>{text}</span>;

  if (unit === 'line') {
    const delay = (lineIdx * LINE_DELAY) / speed;
    return (
      <span
        key={cycle}
        style={{
          ...style,
          display: 'inline-block',
          animation: `ta-${anim.id} ${dur}s ${delay.toFixed(2)}s ${EASE} both`,
          opacity: 0,
        }}
      >
        {text}
      </span>
    );
  }

  return (
    <span key={cycle} style={style}>
      {[...text].map((ch, i) => (
        <span
          key={i}
          style={{
            display: 'inline-block',
            whiteSpace: 'pre',
            animation: `ta-${anim.id} ${dur}s ${((charOffset + i) * stagger).toFixed(2)}s ${EASE} both`,
            opacity: 0,
            animationFillMode: 'both',
          }}
        >
          {ch}
        </span>
      ))}
    </span>
  );
}

/** 이미지 등 블록 요소에 애니메이션을 반복 적용하는 래퍼 */
export function AnimBox({
  animId,
  speed = 1,
  children,
}: {
  animId: string | null;
  speed?: number;
  children: ReactNode;
}) {
  const anim = animById(animId);
  const dur = anim ? Math.max(anim.duration, 0.3) / speed : 0;
  const cycle = useCycle(anim ? Math.max(dur * 1000 + 1600, 2600) : 0);
  if (!anim) return <>{children}</>;
  return (
    <div key={cycle} style={{ animation: `ta-${anim.id} ${dur}s 0s ${EASE} both` }}>
      {children}
    </div>
  );
}

/** periodMs 간격으로 키를 바꿔 애니메이션을 재시작 (0이면 비활성) */
function useCycle(periodMs: number): number {
  const [cycle, setCycle] = useState(0);
  useEffect(() => {
    if (!periodMs) return;
    const t = setInterval(() => setCycle((c) => c + 1), periodMs);
    return () => clearInterval(t);
  }, [periodMs]);
  return cycle;
}
