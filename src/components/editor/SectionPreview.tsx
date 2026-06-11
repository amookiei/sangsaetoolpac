import type { Block, Section } from '../../state/types';
import { TypoText, AnimBox } from './TypoText';
import { segmentLine } from '../../utils/richText';
import { effectiveUnit } from '../../data/typoAnimations';

/**
 * 섹션 라이브 미리보기 (HTML 렌더 — 애니메이션 실시간 재생).
 * 추출 시에는 동일 데이터를 layout.ts 기반 SVG/PNG/GIF 렌더러가 그린다.
 */
export function SectionPreview({
  section,
  width,
  selectedBlock,
  onSelectBlock,
  zoom = 1,
  onResizeBlock,
  onResizeTop,
}: {
  section: Section;
  width: number;
  selectedBlock: string | null;
  onSelectBlock: (id: string) => void;
  zoom?: number;
  onResizeBlock?: (id: string, heightPx: number) => void;
  onResizeTop?: (id: string, padTop: number) => void;
}) {
  // 블록 하단 핸들 드래그 — 상단 고정, 아래로 늘어남
  const startResize = (e: React.PointerEvent, blockId: string) => {
    e.stopPropagation();
    e.preventDefault();
    const blockEl = (e.currentTarget as HTMLElement).parentElement!;
    const startH = blockEl.getBoundingClientRect().height / zoom;
    const startY = e.clientY;
    const move = (ev: PointerEvent) =>
      onResizeBlock?.(blockId, Math.max(40, Math.round(startH + (ev.clientY - startY) / zoom)));
    const up = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  };

  // 블록 상단 핸들 드래그 — 위쪽 여백(padTop) 조절
  const startResizeTop = (e: React.PointerEvent, b: Block) => {
    e.stopPropagation();
    e.preventDefault();
    const startPad = b.padTop ?? 0;
    const startY = e.clientY;
    const move = (ev: PointerEvent) =>
      onResizeTop?.(b.id, Math.max(0, Math.round(startPad + (ev.clientY - startY) / zoom)));
    const up = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  };

  // 연속된 동일 cardBg 블록을 한 카드로 묶음 (layout.ts와 동일 규칙)
  const segs: { cardBg: string | null; blocks: Block[] }[] = [];
  for (const b of section.blocks) {
    const bg = b.cardBg ?? null;
    const last = segs[segs.length - 1];
    if (last && last.cardBg === bg && bg !== null) last.blocks.push(b);
    else segs.push({ cardBg: bg, blocks: [b] });
  }

  const bgStyle = section.bgGrad
    ? `linear-gradient(${section.bgGrad.angle}deg, ${section.bg}, ${section.bgGrad.color2})`
    : section.bg;

  return (
    <div style={{ width, background: bgStyle, padding: '72px 64px' }}>
      {segs.map((seg, si) => {
        const inner = seg.blocks.map((b) => (
          <div
            key={b.id}
            className={`ed-block ${selectedBlock === b.id ? 'sel' : ''}`}
            onClick={(e) => {
              e.stopPropagation();
              onSelectBlock(b.id);
            }}
            style={{ marginBottom: 32, minHeight: b.heightPx ?? undefined, paddingTop: b.padTop ?? undefined }}
          >
            {selectedBlock === b.id && onResizeTop && (
              <div
                className="resize-handle top"
                title="아래로 드래그해 블록 위 여백 늘리기"
                onPointerDown={(e) => startResizeTop(e, b)}
              />
            )}
            <BlockView b={b} />
            {selectedBlock === b.id && onResizeBlock && (
              <div
                className="resize-handle"
                title="아래로 드래그해 블록 높이 늘리기 (상단 고정)"
                onPointerDown={(e) => startResize(e, b.id)}
              />
            )}
          </div>
        ));
        if (!seg.cardBg) return inner;
        return (
          <div
            key={`card-${si}`}
            style={{
              background: seg.cardBg,
              borderRadius: 18,
              padding: '28px 24px 0',
              margin: '0 -24px 48px',
            }}
          >
            {inner}
          </div>
        );
      })}
    </div>
  );
}

function splitWithOffsets(text: string): { line: string; startIdx: number }[] {
  const out: { line: string; startIdx: number }[] = [];
  let off = 0;
  for (const line of text.split('\n')) {
    out.push({ line, startIdx: off });
    off += line.length + 1;
  }
  return out;
}

function BlockView({ b }: { b: Block }) {
  if (b.kind === 'image') {
    if (b.imageDataUrl) {
      return (
        <AnimBox animId={b.animation} speed={b.animSpeed ?? 1}>
          <img src={b.imageDataUrl} style={{ width: '100%', borderRadius: 2, display: 'block' }} />
        </AnimBox>
      );
    }
    return (
      <div
        className="img-desc"
        style={{ minHeight: 240, display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}
      >
        {b.imageDesc || '이미지 영역 — 에디터에서 업로드하거나 6단계에서 AI로 생성'}
      </div>
    );
  }

  const weight = b.bold || b.kind === 'heading' ? 800 : 400;
  const unit = effectiveUnit(b.animation, b.animUnit);
  const speed = b.animSpeed ?? 1;

  // 숫자 뱃지 — 동그라미/세모/네모/밑줄
  if (b.numberShape) {
    const shapeColor = b.numberShapeColor ?? '#d97757';
    const fs = b.fontSize;
    const text = b.text.split('\n')[0] ?? '';
    const common: React.CSSProperties = {
      fontFamily: `"${b.font}", "Noto Sans KR", sans-serif`,
      fontSize: fs,
      fontWeight: weight,
      color: b.color,
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
    };
    let badge: React.ReactNode;
    if (b.numberShape === 'circle') {
      const d = Math.max(fs * 2.1, fs + text.length * fs * 0.62);
      badge = <span style={{ ...common, width: d, height: d, borderRadius: '50%', background: shapeColor }}>{text}</span>;
    } else if (b.numberShape === 'square') {
      badge = <span style={{ ...common, padding: `${fs * 0.35}px ${fs * 0.55}px`, borderRadius: 10, background: shapeColor }}>{text}</span>;
    } else if (b.numberShape === 'triangle') {
      const w = Math.max(fs * 2.8, fs + text.length * fs * 0.8);
      badge = (
        <span
          style={{
            ...common, width: w, height: w * 0.88, background: shapeColor,
            clipPath: 'polygon(50% 0, 0 100%, 100% 100%)', alignItems: 'flex-end',
            paddingBottom: fs * 0.3,
          }}
        >
          {text}
        </span>
      );
    } else {
      badge = (
        <span style={{ ...common, borderBottom: `5px solid ${shapeColor}`, paddingBottom: 4 }}>{text}</span>
      );
    }
    return (
      <div style={{ textAlign: b.align }}>
        <AnimBox animId={b.animation} speed={speed}>{badge}</AnimBox>
      </div>
    );
  }

  // 부분 스타일(runs): 줄을 스타일 세그먼트로 나눠 렌더
  if (b.runs?.length) {
    const lines = splitWithOffsets(b.text);
    return (
      <div style={{ textAlign: b.align, lineHeight: 1.55, fontFamily: `"${b.font}", "Noto Sans KR", sans-serif`, fontSize: b.fontSize }}>
        {lines.map(({ line, startIdx }, i) => (
          <div key={i}>
            {segmentLine(b, line, startIdx).map((seg, si) => (
              <span
                key={si}
                style={{
                  fontWeight: seg.style.bold ? 800 : 400,
                  color: seg.style.color,
                  background: seg.style.highlight ?? undefined,
                  padding: seg.style.highlight ? '0 3px' : undefined,
                  borderRadius: seg.style.highlight ? 4 : undefined,
                }}
              >
                {seg.text}
              </span>
            ))}
          </div>
        ))}
      </div>
    );
  }

  // 글자별 단위는 블록 맨 위부터 글자 수를 누적해 순서를 이어간다
  return (
    <div style={{ textAlign: b.align, lineHeight: 1.55 }}>
      {splitWithOffsets(b.text).map(({ line, startIdx }, i) => {
        return (
          <div key={i}>
            <TypoText
              text={line}
              animId={b.animation}
              unit={unit}
              speed={speed}
              charOffset={startIdx}
              lineIdx={i}
              style={{
                fontFamily: `"${b.font}", "Noto Sans KR", sans-serif`,
                fontSize: b.fontSize,
                fontWeight: weight,
                color: b.color,
                background: b.highlight ?? undefined,
                padding: b.highlight ? '0 8px' : undefined,
                borderRadius: b.highlight ? 4 : undefined,
                boxDecorationBreak: 'clone',
              }}
            />
          </div>
        );
      })}
    </div>
  );
}
