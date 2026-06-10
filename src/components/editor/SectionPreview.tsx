import type { Block, Section } from '../../state/types';
import { TypoText } from './TypoText';
import { segmentLine } from '../../utils/richText';

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
}: {
  section: Section;
  width: number;
  selectedBlock: string | null;
  onSelectBlock: (id: string) => void;
  zoom?: number;
  onResizeBlock?: (id: string, heightPx: number) => void;
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
            style={{ marginBottom: 32, minHeight: b.heightPx ?? undefined }}
          >
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
      return <img src={b.imageDataUrl} style={{ width: '100%', borderRadius: 2, display: 'block' }} />;
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

  return (
    <div style={{ textAlign: b.align, lineHeight: 1.55 }}>
      {b.text.split('\n').map((line, i) => (
        <div key={i}>
          <TypoText
            text={line}
            animId={b.animation}
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
      ))}
    </div>
  );
}
