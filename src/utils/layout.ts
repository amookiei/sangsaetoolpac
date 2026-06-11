import type { Block, NumberShape, Section } from '../state/types';
import { segmentLine, styleAt } from './richText';
import { effectiveUnit } from '../data/typoAnimations';

/**
 * 섹션 → 그리기 프리미티브 목록.
 * SVG 추출(피그마 편집용)·PNG 추출(캔버스 래스터)·GIF 추출이 같은 레이아웃을 공유한다.
 */
export interface AnimMeta {
  unit: 'char' | 'line';
  speed: number; // 배속 (지연·재생시간을 1/speed로)
  lineIdx: number; // 블록 내 줄 순서 (줄별 단위용)
  charOffset: number; // 블록 맨 위부터 누적된 글자 수 (글자별 단위용)
}

export type Prim =
  | { type: 'rect'; x: number; y: number; w: number; h: number; color: string; rx: number }
  | { type: 'shape'; shape: NumberShape; x: number; y: number; w: number; h: number; color: string }
  | {
      type: 'line';
      text: string;
      x: number; // 정렬 반영된 시작 x
      baseline: number;
      font: string;
      size: number;
      weight: number;
      color: string;
      anim: string | null;
      animMeta: AnimMeta | null;
      charXs: number[] | null; // 글자별 애니메이션용 x 좌표
    }
  | {
      type: 'image';
      x: number; y: number; w: number; h: number;
      dataUrl: string;
      anim: string | null;
      animSpeed: number;
    }
  | { type: 'placeholder'; x: number; y: number; w: number; h: number; descLines: string[] };

export interface SectionLayout {
  width: number;
  height: number;
  bg: string;
  bgGrad: { color2: string; angle: number } | null;
  prims: Prim[];
}

/** CSS linear-gradient 각도(0=위, 90=오른쪽) → 시작/끝 좌표 */
export function gradPoints(angle: number, w: number, h: number) {
  const rad = (angle * Math.PI) / 180;
  const vx = Math.sin(rad);
  const vy = -Math.cos(rad);
  return {
    x1: (0.5 - vx * 0.5) * w,
    y1: (0.5 - vy * 0.5) * h,
    x2: (0.5 + vx * 0.5) * w,
    y2: (0.5 + vy * 0.5) * h,
  };
}

const PAD_X = 64;
const PAD_Y = 72;
const GAP = 32;

let measureCtx: CanvasRenderingContext2D | null = null;
function ctx(): CanvasRenderingContext2D {
  if (!measureCtx) {
    measureCtx = document.createElement('canvas').getContext('2d')!;
  }
  return measureCtx;
}

export function setFont(c: CanvasRenderingContext2D, family: string, size: number, weight: number) {
  c.font = `${weight} ${size}px "${family}", "Noto Sans KR", sans-serif`;
}

/** 캔버스 measureText 기반 줄바꿈 (한글은 글자 단위, 영문 단어 보존) */
export function wrapText(text: string, family: string, size: number, weight: number, maxW: number): string[] {
  const c = ctx();
  setFont(c, family, size, weight);
  const out: string[] = [];
  for (const para of text.split('\n')) {
    if (!para) {
      out.push('');
      continue;
    }
    let line = '';
    for (const word of para.split(/(\s+)/)) {
      if (c.measureText(line + word).width <= maxW || !line) {
        line += word;
        // 공백 없는 긴 한글 라인 — 글자 단위로 자르기
        while (c.measureText(line).width > maxW && line.length > 1) {
          let cut = line.length - 1;
          while (cut > 1 && c.measureText(line.slice(0, cut)).width > maxW) cut--;
          out.push(line.slice(0, cut));
          line = line.slice(cut);
        }
      } else {
        out.push(line.trimEnd());
        line = word.trimStart();
      }
    }
    out.push(line.trimEnd());
  }
  return out;
}

function blockWeight(b: Block): number {
  return b.bold || b.kind === 'heading' ? 800 : 400;
}

/** 부분 스타일(runs) 블록용 — 원본 인덱스를 추적하는 줄바꿈 */
function wrapIndexed(
  b: Block,
  maxW: number,
  c: CanvasRenderingContext2D,
): { text: string; startIdx: number }[] {
  const lines: { text: string; startIdx: number }[] = [];
  let off = 0;
  for (const para of b.text.split('\n')) {
    if (!para) {
      lines.push({ text: '', startIdx: off });
      off += 1;
      continue;
    }
    let line = '';
    let lineStart = off;
    let w = 0;
    let lastSpace = -1;
    const segWidth = (s: string, from: number) => {
      let sw = 0;
      let k = from;
      for (const ch of s) {
        const st = styleAt(b, k);
        setFont(c, b.font, b.fontSize, st.bold ? 800 : 400);
        sw += c.measureText(ch).width;
        k += 1;
      }
      return sw;
    };
    for (let j = 0; j < para.length; j++) {
      const ch = para[j];
      const st = styleAt(b, off + j);
      setFont(c, b.font, b.fontSize, st.bold ? 800 : 400);
      const cw = c.measureText(ch).width;
      if (w + cw > maxW && line) {
        const brk = lastSpace > 0 ? lastSpace + 1 : line.length;
        lines.push({ text: line.slice(0, brk).trimEnd(), startIdx: lineStart });
        line = line.slice(brk);
        lineStart += brk;
        w = segWidth(line, lineStart);
        lastSpace = line.lastIndexOf(' ');
      }
      line += ch;
      w += cw;
      if (ch === ' ') lastSpace = line.length - 1;
    }
    lines.push({ text: line.trimEnd(), startIdx: lineStart });
    off += para.length + 1;
  }
  return lines;
}

/** 연속된 동일 cardBg 블록을 한 카드로 묶는다 (리뷰 카드·쿠폰 템플릿) */
function cardSegments(blocks: Block[]): { cardBg: string | null; blocks: Block[] }[] {
  const segs: { cardBg: string | null; blocks: Block[] }[] = [];
  for (const b of blocks) {
    const bg = b.cardBg ?? null;
    const last = segs[segs.length - 1];
    if (last && last.cardBg === bg && bg !== null) last.blocks.push(b);
    else segs.push({ cardBg: bg, blocks: [b] });
  }
  return segs;
}

export function layoutSection(section: Section, width: number): SectionLayout {
  const c = ctx();
  const maxW = width - PAD_X * 2;
  const prims: Prim[] = [];
  let y = PAD_Y;

  for (const seg of cardSegments(section.blocks)) {
    let cardStartY = 0;
    let cardInsertIdx = 0;
    if (seg.cardBg) {
      cardInsertIdx = prims.length;
      cardStartY = y;
      y += 28;
    }

    for (const b of seg.blocks) {
      const blockTop = y; // 블록 높이(heightPx)·상단 여백(padTop) 기준점
      if (b.padTop) y += b.padTop;
      const applyMinHeight = () => {
        if (b.heightPx && y - blockTop < b.heightPx) y = blockTop + b.heightPx;
      };
      const speed = b.animSpeed && b.animSpeed > 0 ? b.animSpeed : 1;
      const unit = effectiveUnit(b.animation, b.animUnit);
      // 블록 내 애니메이션 진행 카운터
      let lineIdx = 0;
      let charOffset = 0;
      const meta = (): AnimMeta | null =>
        b.animation ? { unit, speed, lineIdx, charOffset } : null;

      if (b.kind === 'image') {
        if (b.imageDataUrl && b.imgW > 0) {
          const w = Math.min(maxW, b.imgW);
          const h = (b.imgH / b.imgW) * w;
          prims.push({
            type: 'image', x: (width - w) / 2, y, w, h,
            dataUrl: b.imageDataUrl, anim: b.animation, animSpeed: speed,
          });
          y += h;
        } else {
          const h = 300;
          const descLines = wrapText(b.imageDesc || '이미지 영역', 'Pretendard Variable', 16, 400, maxW - 80);
          prims.push({ type: 'placeholder', x: PAD_X, y, w: maxW, h, descLines });
          y += h;
        }
        applyMinHeight();
        y += GAP;
        continue;
      }

      // 숫자 뱃지 블록 — 도형(동그라미/세모/네모/밑줄) 위에 단일 라인 텍스트
      if (b.numberShape) {
        const weight = blockWeight(b);
        const fs = b.fontSize;
        const text = b.text.split('\n')[0] ?? '';
        setFont(c, b.font, fs, weight);
        const tw = c.measureText(text).width;
        const shapeColor = b.numberShapeColor ?? '#d97757';
        let sw: number;
        let sh: number;
        if (b.numberShape === 'circle') {
          sw = sh = Math.max(tw + fs * 0.9, fs * 2.1);
        } else if (b.numberShape === 'square') {
          sw = tw + fs * 1.1;
          sh = fs * 1.9;
        } else if (b.numberShape === 'triangle') {
          sw = Math.max(tw + fs * 1.8, fs * 2.8);
          sh = sw * 0.88;
        } else {
          sw = tw + 8;
          sh = fs * 1.55 + 8;
        }
        const sx = b.align === 'left' ? PAD_X : b.align === 'right' ? width - PAD_X - sw : (width - sw) / 2;
        if (b.numberShape === 'underline') {
          prims.push({ type: 'shape', shape: 'underline', x: sx, y: y + fs * 1.45, w: sw, h: 5, color: shapeColor });
        } else {
          prims.push({ type: 'shape', shape: b.numberShape, x: sx, y, w: sw, h: sh, color: shapeColor });
        }
        // 텍스트 위치: 세모는 하단 중앙, 나머지는 중앙
        const tx = sx + (sw - tw) / 2;
        const baseline =
          b.numberShape === 'triangle' ? y + sh * 0.78 : b.numberShape === 'underline' ? y + fs * 1.1 : y + sh / 2 + fs * 0.35;
        prims.push({
          type: 'line', text, x: tx, baseline, font: b.font, size: fs, weight,
          color: b.color, anim: b.animation, animMeta: meta(), charXs: null,
        });
        y += sh;
        applyMinHeight();
        y += GAP;
        continue;
      }

      // 부분 스타일(runs)이 있으면 글자별 스타일 세그먼트로 분리해 배치
      if (b.runs?.length) {
        const lineH = Math.round(b.fontSize * 1.55);
        for (const { text: line, startIdx } of wrapIndexed(b, maxW, c)) {
          if (!line) {
            y += lineH * 0.6;
            lineIdx += 1;
            charOffset += 1; // 개행 — 미리보기 인덱스와 동기화
            continue;
          }
          const segs = segmentLine(b, line, startIdx);
          const widths = segs.map((s) => {
            setFont(c, b.font, b.fontSize, s.style.bold ? 800 : 400);
            return c.measureText(s.text).width;
          });
          const total = widths.reduce((a, v) => a + v, 0);
          let sx =
            b.align === 'left' ? PAD_X : b.align === 'right' ? width - PAD_X - total : (width - total) / 2;
          const baseline = y + b.fontSize;
          segs.forEach((s, si) => {
            if (s.style.highlight) {
              const pad = b.hlPad ?? 8;
              prims.push({
                type: 'rect', x: sx - pad, y: y + b.fontSize * 0.08,
                w: widths[si] + pad * 2, h: b.fontSize * 1.3, color: s.style.highlight,
                rx: b.hlRadius ?? 4,
              });
            }
            let charXs: number[] | null = null;
            if (b.animation) {
              charXs = [];
              setFont(c, b.font, b.fontSize, s.style.bold ? 800 : 400);
              let cx = sx;
              for (const ch of s.text) {
                charXs.push(cx);
                cx += c.measureText(ch).width;
              }
            }
            prims.push({
              type: 'line', text: s.text, x: sx, baseline,
              font: b.font, size: b.fontSize, weight: s.style.bold ? 800 : 400,
              color: s.style.color, anim: b.animation, animMeta: meta(), charXs,
            });
            charOffset += [...s.text].length;
            sx += widths[si];
          });
          charOffset += 1; // 개행
          lineIdx += 1;
          y += lineH;
        }
        applyMinHeight();
        y += GAP;
        continue;
      }

      const weight = blockWeight(b);
      const lines = wrapText(b.text, b.font, b.fontSize, weight, maxW);
      const lineH = Math.round(b.fontSize * 1.55);
      setFont(c, b.font, b.fontSize, weight);
      for (const line of lines) {
        if (!line) {
          y += lineH * 0.6;
          lineIdx += 1;
          charOffset += 1; // 개행 — 미리보기 인덱스와 동기화
          continue;
        }
        const tw = c.measureText(line).width;
        const x = b.align === 'left' ? PAD_X : b.align === 'right' ? width - PAD_X - tw : (width - tw) / 2;
        const baseline = y + b.fontSize;
        if (b.highlight) {
          const pad = b.hlPad ?? 8;
          prims.push({
            type: 'rect',
            x: x - pad,
            y: y + b.fontSize * 0.08,
            w: tw + pad * 2,
            h: b.fontSize * 1.3,
            color: b.highlight,
            rx: b.hlRadius ?? 4,
          });
        }
        let charXs: number[] | null = null;
        if (b.animation) {
          charXs = [];
          let cx = x;
          for (const ch of line) {
            charXs.push(cx);
            cx += c.measureText(ch).width;
          }
        }
        prims.push({
          type: 'line',
          text: line,
          x,
          baseline,
          font: b.font,
          size: b.fontSize,
          weight,
          color: b.color,
          anim: b.animation,
          animMeta: meta(),
          charXs,
        });
        charOffset += [...line].length + 1; // +1 개행
        lineIdx += 1;
        y += lineH;
      }
      applyMinHeight();
      y += GAP;
    }

    if (seg.cardBg) {
      const cardH = y - cardStartY - GAP + 28;
      prims.splice(cardInsertIdx, 0, {
        type: 'rect',
        x: PAD_X - 24,
        y: cardStartY,
        w: maxW + 48,
        h: cardH,
        color: seg.cardBg,
        rx: 18,
      });
      y += 16; // 카드 아래 추가 여백
    }
  }

  return {
    width,
    height: Math.max(y - GAP + PAD_Y, 200),
    bg: section.bg,
    bgGrad: section.bgGrad ?? null,
    prims,
  };
}
