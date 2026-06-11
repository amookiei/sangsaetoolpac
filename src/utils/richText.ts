import type { Block, StyleRun } from '../state/types';

/** 글자 인덱스의 유효 스타일 (나중 run이 우선) */
export interface CharStyle {
  bold: boolean;
  color: string;
  highlight: string | null;
}

export function styleAt(b: Block, idx: number): CharStyle {
  const base: CharStyle = {
    bold: b.bold || b.kind === 'heading',
    color: b.color,
    highlight: b.highlight,
  };
  for (const r of b.runs ?? []) {
    if (idx >= r.start && idx < r.end) {
      if (r.bold !== undefined) base.bold = r.bold;
      if (r.color !== undefined) base.color = r.color;
      if (r.highlight !== undefined) base.highlight = r.highlight;
    }
  }
  return base;
}

/** run 추가 (선택 범위에 부분 스타일 입히기) */
export function addRun(runs: StyleRun[] | undefined, run: StyleRun): StyleRun[] {
  return [...(runs ?? []), run];
}

/** 선택 범위 전체가 이미 굵게 상태인지 (굵게 토글용) */
export function isRangeBold(b: Block, s: number, e: number): boolean {
  for (let i = s; i < e; i++) {
    if (!styleAt(b, i).bold) return false;
  }
  return e > s;
}

/** 선택 범위의 부분 스타일 제거 (걸친 run은 분할) */
export function clearRuns(runs: StyleRun[] | undefined, s: number, e: number): StyleRun[] {
  const out: StyleRun[] = [];
  for (const r of runs ?? []) {
    if (r.end <= s || r.start >= e) {
      out.push(r);
      continue;
    }
    if (r.start < s) out.push({ ...r, end: s });
    if (r.end > e) out.push({ ...r, start: e });
  }
  return out;
}

/** 텍스트 수정 시 run 인덱스가 범위를 벗어나지 않게 보정 */
export function clampRuns(runs: StyleRun[] | undefined, len: number): StyleRun[] | undefined {
  if (!runs) return undefined;
  const out = runs
    .map((r) => ({ ...r, start: Math.min(r.start, len), end: Math.min(r.end, len) }))
    .filter((r) => r.end > r.start);
  return out.length ? out : undefined;
}

/** 같은 스타일의 연속 구간으로 분할 (한 줄 안에서) */
export function segmentLine(
  b: Block,
  lineText: string,
  startIdx: number,
): { text: string; style: CharStyle; startIdx: number }[] {
  const segs: { text: string; style: CharStyle; startIdx: number }[] = [];
  let cur = '';
  let curStyle: CharStyle | null = null;
  let curStart = startIdx;
  let i = startIdx;
  for (const ch of lineText) {
    const st = styleAt(b, i);
    if (
      curStyle &&
      (st.bold !== curStyle.bold || st.color !== curStyle.color || st.highlight !== curStyle.highlight)
    ) {
      segs.push({ text: cur, style: curStyle, startIdx: curStart });
      cur = '';
      curStart = i;
    }
    cur += ch;
    curStyle = st;
    i += 1;
  }
  if (cur && curStyle) segs.push({ text: cur, style: curStyle, startIdx: curStart });
  return segs;
}
