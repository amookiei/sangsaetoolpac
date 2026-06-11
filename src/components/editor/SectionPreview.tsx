import { useRef, useState } from 'react';
import type { Block, Section } from '../../state/types';
import { TypoText, AnimBox } from './TypoText';
import { useCycle } from './useCycle';
import { segmentLine } from '../../utils/richText';
import { animById, effectiveUnit, LINE_DELAY } from '../../data/typoAnimations';

/**
 * 섹션 라이브 미리보기 = 프리뷰창 (애니메이션 실시간 재생 + 글자 드래그 선택).
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
  onReorderBlocks,
  onTextSelect,
}: {
  section: Section;
  width: number;
  selectedBlock: string | null;
  onSelectBlock: (id: string) => void;
  zoom?: number;
  onResizeBlock?: (id: string, heightPx: number) => void;
  onResizeTop?: (id: string, padTop: number) => void;
  onReorderBlocks?: (fromId: string, toId: string) => void;
  /** 프리뷰창에서 글자를 드래그 선택했을 때 (블록 id + 원본 텍스트 인덱스 범위) */
  onTextSelect?: (blockId: string, start: number, end: number) => void;
}) {
  const dragBlock = useRef<string | null>(null);
  const [hoverId, setHoverId] = useState<string | null>(null);

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

  // 프리뷰창에서 글자 드래그 선택 → 원본 텍스트 인덱스로 변환
  const handleMouseUp = () => {
    if (!onTextSelect) return;
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed || !sel.anchorNode || !sel.focusNode) return;
    const pos = (node: Node, off: number): { idx: number; el: HTMLElement } | null => {
      const el = node instanceof Element ? node : node.parentElement;
      const ci = el?.closest('[data-ci]') as HTMLElement | null;
      if (ci) return { idx: +ci.dataset.ci! + Math.min(off, 1), el: ci };
      const ls = el?.closest('[data-ls]') as HTMLElement | null;
      if (ls) return { idx: +ls.dataset.ls! + off, el: ls };
      return null;
    };
    const a = pos(sel.anchorNode, sel.anchorOffset);
    const f = pos(sel.focusNode, sel.focusOffset);
    if (!a || !f) return;
    const aBlock = a.el.closest('[data-block]') as HTMLElement | null;
    const fBlock = f.el.closest('[data-block]') as HTMLElement | null;
    if (!aBlock || aBlock !== fBlock) return;
    const start = Math.min(a.idx, f.idx);
    const end = Math.max(a.idx, f.idx);
    if (end > start) onTextSelect(aBlock.dataset.block!, start, end);
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
    <div style={{ width, background: bgStyle, padding: '72px 64px' }} onMouseUp={handleMouseUp}>
      {segs.map((seg, si) => {
        const inner = seg.blocks.map((b) => (
          <div
            key={b.id}
            data-block={b.id}
            className={`ed-block ${selectedBlock === b.id ? 'sel' : ''}`}
            onClick={(e) => {
              e.stopPropagation();
              onSelectBlock(b.id);
            }}
            onMouseEnter={() => setHoverId(b.id)}
            onMouseLeave={() => setHoverId((h) => (h === b.id ? null : h))}
            onDragOver={(e) => {
              if (dragBlock.current) e.preventDefault();
            }}
            onDrop={(e) => {
              e.preventDefault();
              if (dragBlock.current && dragBlock.current !== b.id) {
                onReorderBlocks?.(dragBlock.current, b.id);
              }
              dragBlock.current = null;
            }}
            style={{ marginBottom: 32, minHeight: b.heightPx ?? undefined, paddingTop: b.padTop ?? undefined }}
          >
            {onReorderBlocks && (
              <div
                className="block-drag"
                title="꾹 눌러 드래그하면 블록 순서가 바뀝니다"
                draggable
                onDragStart={(e) => {
                  dragBlock.current = b.id;
                  e.dataTransfer.effectAllowed = 'move';
                }}
                onDragEnd={() => {
                  dragBlock.current = null;
                }}
              >
                ⠿
              </div>
            )}
            {selectedBlock === b.id && onResizeTop && (
              <div
                className="resize-handle top"
                title="아래로 드래그해 블록 위 여백 늘리기"
                onPointerDown={(e) => startResizeTop(e, b)}
              />
            )}
            <BlockView b={b} selected={selectedBlock === b.id} hovered={hoverId === b.id} />
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

/**
 * 블록 렌더.
 * - selected: 정적 텍스트로 전환 → 음절 단위 드래그 선택이 부드럽게 동작
 * - hovered: 애니메이션 사이클 재시작 정지 → 드래그 중 리마운트로 선택이 끊기지 않음
 */
function BlockView({ b, selected, hovered }: { b: Block; selected: boolean; hovered: boolean }) {
  const weight = b.bold || b.kind === 'heading' ? 800 : 400;
  const unit = effectiveUnit(b.animation, b.animUnit);
  const speed = b.animSpeed ?? 1;
  const hlPad = b.hlPad ?? 8;
  const hlRadius = b.hlRadius ?? 4;
  const isText = b.kind !== 'image' && !b.numberShape;
  const animActive = isText && !!b.animation && !selected;

  // 블록 단위 공유 사이클 — 모든 줄이 함께 다시 재생 (빈 줄 포함 블록도 정상 동작)
  const anim = animById(b.animation);
  let periodMs = 0;
  if (animActive && anim) {
    const dur = Math.max(anim.duration, 0.3) / speed;
    const stagger = (anim.stagger || 0.06) / speed;
    const lineCount = b.text.split('\n').length;
    periodMs =
      unit === 'line'
        ? (((lineCount - 1) * LINE_DELAY) / speed + dur) * 1000 + 1400
        : (b.text.length * stagger + dur) * 1000 + 1400;
    periodMs = Math.max(periodMs, 2600);
  }
  const cycle = useCycle(hovered ? 0 : periodMs);

  if (b.kind === 'image') {
    if (b.imageDataUrl) {
      return (
        <AnimBox animId={b.animation} speed={speed}>
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

  const lines = splitWithOffsets(b.text);
  const emptyLineH = Math.round(b.fontSize * 0.93); // layout.ts의 빈 줄 높이(0.6 * lineH)와 일치

  // 부분 스타일(runs): 줄을 스타일 세그먼트로 나눠 렌더 — 애니메이션도 세그먼트별 적용
  if (b.runs?.length) {
    return (
      <div style={{ textAlign: b.align, lineHeight: 1.55, fontFamily: `"${b.font}", "Noto Sans KR", sans-serif`, fontSize: b.fontSize }}>
        {lines.map(({ line, startIdx }, i) =>
          line === '' ? (
            <div key={i} style={{ height: emptyLineH }} />
          ) : (
            <div key={i}>
              {segmentLine(b, line, startIdx).map((seg, si) => {
                const segStyle: React.CSSProperties = {
                  fontWeight: seg.style.bold ? 800 : 400,
                  color: seg.style.color,
                  background: seg.style.highlight ?? undefined,
                  padding: seg.style.highlight ? `0 ${hlPad}px` : undefined,
                  borderRadius: seg.style.highlight ? hlRadius : undefined,
                };
                return animActive ? (
                  <TypoText
                    key={si}
                    text={seg.text}
                    animId={b.animation}
                    unit={unit}
                    speed={speed}
                    charOffset={seg.startIdx}
                    lineIdx={i}
                    cycle={cycle}
                    style={segStyle}
                  />
                ) : (
                  <span key={si} data-ls={seg.startIdx} style={segStyle}>
                    {seg.text}
                  </span>
                );
              })}
            </div>
          ),
        )}
      </div>
    );
  }

  // 일반 텍스트 — 글자별 단위는 블록 맨 위부터 누적 순서 (빈 줄도 높이 유지)
  const lineStyle: React.CSSProperties = {
    fontFamily: `"${b.font}", "Noto Sans KR", sans-serif`,
    fontSize: b.fontSize,
    fontWeight: weight,
    color: b.color,
    background: b.highlight ?? undefined,
    padding: b.highlight ? `0 ${hlPad}px` : undefined,
    borderRadius: b.highlight ? hlRadius : undefined,
    boxDecorationBreak: 'clone',
  };
  return (
    <div style={{ textAlign: b.align, lineHeight: 1.55 }}>
      {lines.map(({ line, startIdx }, i) =>
        line === '' ? (
          <div key={i} style={{ height: emptyLineH }} />
        ) : (
          <div key={i}>
            {animActive ? (
              <TypoText
                text={line}
                animId={b.animation}
                unit={unit}
                speed={speed}
                charOffset={startIdx}
                lineIdx={i}
                cycle={cycle}
                style={lineStyle}
              />
            ) : (
              <span data-ls={startIdx} style={lineStyle}>{line}</span>
            )}
          </div>
        ),
      )}
    </div>
  );
}
