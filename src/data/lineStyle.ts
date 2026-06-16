import type { Block, LineStyle, NumberShape, StyleGuide } from '../state/types';
import { bodyStyleOf } from './styleGuide';

/** 줄(개행 단위)에 적용된 실효 스타일 — 블록 기본값 + lineStyle 병합 */
export interface EffLine {
  font: string;
  size: number;
  color: string;
  bold: boolean;
  numberShape: NumberShape | null;
  numberShapeColor: string;
}

export function effLine(b: Block, srcIdx: number): EffLine {
  const ls = b.lineStyles?.[srcIdx] ?? null;
  return {
    font: ls?.font ?? b.font,
    size: ls?.size ?? b.fontSize,
    color: ls?.color ?? b.color,
    bold: ls?.bold ?? (b.bold || b.kind === 'heading'),
    numberShape: ls?.numberShape ?? null,
    numberShapeColor: ls?.numberShapeColor ?? '#d97757',
  };
}

/** 줄 텍스트가 숫자 한 글자(1음절)인지 — 자동 숫자 처리 대상 */
export const isSingleNumber = (s: string) => /^\s*[0-9]\s*$/.test(s);

/** 역할(제목/본문/숫자)을 가이드 기준 구체 스타일로 변환 */
export function presetLineStyle(
  role: 'heading' | 'body' | 'number',
  guide: StyleGuide,
  bodyStyleId?: string,
): LineStyle {
  if (role === 'heading') {
    return {
      role,
      font: guide.headingFont,
      size: guide.headingSize,
      color: guide.headingColor,
      bold: guide.headingBold,
      numberShape: null,
    };
  }
  if (role === 'number') {
    return {
      role,
      size: guide.numberSize,
      color: guide.numberColor,
      numberShape: guide.numberShape,
      numberShapeColor: guide.numberShapeColor,
    };
  }
  const bs = bodyStyleOf(guide, bodyStyleId);
  return { role, font: bs.font, size: bs.size, color: bs.color, bold: false, numberShape: null };
}

/**
 * 텍스트의 각 줄을 보고, 숫자 한 글자인데 아직 줄 스타일이 없는 줄은 자동으로 숫자 역할 부여.
 * 길이 변화에 맞춰 lineStyles 배열을 소스 줄 수에 정렬한다.
 */
export function autoNumberLineStyles(
  text: string,
  existing: (LineStyle | null)[] | undefined,
  guide: StyleGuide,
): (LineStyle | null)[] | undefined {
  const lines = text.split('\n');
  const out: (LineStyle | null)[] = lines.map((line, i) => {
    const cur = existing?.[i] ?? null;
    if (cur) return cur;
    if (isSingleNumber(line)) return presetLineStyle('number', guide);
    return null;
  });
  return out.some(Boolean) ? out : undefined;
}
