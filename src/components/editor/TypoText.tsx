import { useEffect, useState, type CSSProperties } from 'react';
import { animById } from '../../data/typoAnimations';

/**
 * 타이포 애니메이션 미리보기 — GIF처럼 2.6초 주기로 반복 재생.
 * char 모드는 글자별 stagger, block 모드는 통째로 적용.
 */
export function TypoText({
  text,
  animId,
  style,
}: {
  text: string;
  animId: string | null;
  style?: CSSProperties;
}) {
  const [cycle, setCycle] = useState(0);
  const anim = animById(animId);

  useEffect(() => {
    if (!anim) return;
    const t = setInterval(() => setCycle((c) => c + 1), 2600);
    return () => clearInterval(t);
  }, [anim]);

  if (!anim) return <span style={style}>{text}</span>;

  if (anim.mode === 'block') {
    return (
      <span
        key={cycle}
        style={{
          ...style,
          display: 'inline-block',
          animation: `ta-${anim.id} ${anim.duration}s cubic-bezier(.2,.7,.3,1) both`,
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
            animation: `ta-${anim.id} ${anim.duration}s ${(i * anim.stagger).toFixed(2)}s cubic-bezier(.2,.7,.3,1) both`,
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
