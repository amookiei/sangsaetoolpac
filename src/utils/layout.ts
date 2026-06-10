import type { Block, Section } from '../state/types';

/**
 * 섹션 → 그리기 프리미티브 목록.
 * SVG 추출(피그마 편집용)과 PNG 추출(캔버스 래스터)이 같은 레이아웃을 공유한다.
 */
export type Prim =
  | { type: 'rect'; x: number; y: number; w: number; h: number; color: string; rx: number }
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
      charXs: number[] | null; // 글자별 애니메이션용 x 좌표
    }
  | { type: 'image'; x: number; y: number; w: number; h: number; dataUrl: string }
  | { type: 'placeholder'; x: number; y: number; w: number; h: number; descLines: string[] };

export interface SectionLayout {
  width: number;
  height: number;
  bg: string;
  prims: Prim[];
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

export function layoutSection(section: Section, width: number): SectionLayout {
  const c = ctx();
  const maxW = width - PAD_X * 2;
  const prims: Prim[] = [];
  let y = PAD_Y;

  for (const b of section.blocks) {
    if (b.kind === 'image') {
      if (b.imageDataUrl && b.imgW > 0) {
        const w = Math.min(maxW, b.imgW);
        const h = (b.imgH / b.imgW) * w;
        prims.push({ type: 'image', x: (width - w) / 2, y, w, h, dataUrl: b.imageDataUrl });
        y += h + GAP;
      } else {
        const h = 300;
        const descLines = wrapText(b.imageDesc || '이미지 영역', 'Pretendard Variable', 16, 400, maxW - 80);
        prims.push({ type: 'placeholder', x: PAD_X, y, w: maxW, h, descLines });
        y += h + GAP;
      }
      continue;
    }

    const weight = blockWeight(b);
    const lines = wrapText(b.text, b.font, b.fontSize, weight, maxW);
    const lineH = Math.round(b.fontSize * 1.55);
    setFont(c, b.font, b.fontSize, weight);
    for (const line of lines) {
      if (!line) {
        y += lineH * 0.6;
        continue;
      }
      const tw = c.measureText(line).width;
      const x = b.align === 'left' ? PAD_X : b.align === 'right' ? width - PAD_X - tw : (width - tw) / 2;
      const baseline = y + b.fontSize;
      if (b.highlight) {
        prims.push({
          type: 'rect',
          x: x - 8,
          y: y + b.fontSize * 0.08,
          w: tw + 16,
          h: b.fontSize * 1.3,
          color: b.highlight,
          rx: 4,
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
        charXs,
      });
      y += lineH;
    }
    y += GAP;
  }

  return { width, height: Math.max(y - GAP + PAD_Y, 200), bg: section.bg, prims };
}
