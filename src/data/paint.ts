import type { Paint } from '../state/types';

export const solid = (color: string): Paint => ({ type: 'solid', color });

export const defaultGradient = (c1 = '#d97757', c2 = '#ffffff'): Paint => ({
  type: 'gradient',
  angle: 90,
  stops: [
    { color: c1, pos: 0 },
    { color: c2, pos: 1 },
  ],
});

/** CSS background 값으로 변환 (미리보기·DOM) */
export function paintToCss(p: Paint | null): string | undefined {
  if (!p) return undefined;
  if (p.type === 'solid') return p.color;
  const stops = p.stops
    .slice()
    .sort((a, b) => a.pos - b.pos)
    .map((s) => `${s.color} ${Math.round(s.pos * 100)}%`)
    .join(', ');
  return `linear-gradient(${p.angle}deg, ${stops})`;
}

/** 단색이면 그 색, 그라데이션이면 첫 stop 색 (단색 입력 위젯 기본값용) */
export function paintBaseColor(p: Paint | null, fallback = '#000000'): string {
  if (!p) return fallback;
  return p.type === 'solid' ? p.color : (p.stops[0]?.color ?? fallback);
}

/** CSS linear-gradient 각도(0=위) → 캔버스 좌표상의 시작/끝점 (박스 0,0,w,h 기준) */
export function gradLine(angle: number, w: number, h: number) {
  const rad = (angle * Math.PI) / 180;
  const vx = Math.sin(rad);
  const vy = -Math.cos(rad);
  const cx = w / 2;
  const cy = h / 2;
  const half = (Math.abs(vx) * w + Math.abs(vy) * h) / 2;
  return {
    x1: cx - vx * half,
    y1: cy - vy * half,
    x2: cx + vx * half,
    y2: cy + vy * half,
  };
}

/** 캔버스 그라디언트/단색 fillStyle 생성 (박스 0,0,w,h 로컬 좌표 기준) */
export function paintToCanvas(
  c: CanvasRenderingContext2D,
  p: Paint,
  w: number,
  h: number,
): string | CanvasGradient {
  if (p.type === 'solid') return p.color;
  const { x1, y1, x2, y2 } = gradLine(p.angle, w, h);
  const g = c.createLinearGradient(x1, y1, x2, y2);
  for (const s of [...p.stops].sort((a, b) => a.pos - b.pos)) g.addColorStop(Math.max(0, Math.min(1, s.pos)), s.color);
  return g;
}

let gradSeq = 0;
/** SVG 채움 — 단색은 색 문자열, 그라데이션은 {fill:url, def} 반환 */
export function paintToSvg(p: Paint, w: number, h: number): { fill: string; def: string } {
  if (p.type === 'solid') return { fill: p.color, def: '' };
  const id = `grad${gradSeq++}`;
  const { x1, y1, x2, y2 } = gradLine(p.angle, w, h);
  const stops = [...p.stops]
    .sort((a, b) => a.pos - b.pos)
    .map((s) => `<stop offset="${Math.round(s.pos * 100)}%" stop-color="${s.color}"/>`)
    .join('');
  const def = `<linearGradient id="${id}" x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" gradientUnits="userSpaceOnUse">${stops}</linearGradient>`;
  return { fill: `url(#${id})`, def };
}
