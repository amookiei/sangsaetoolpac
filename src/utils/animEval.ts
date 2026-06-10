/**
 * GIF 프레임 렌더링용 타이포 애니메이션 평가기.
 * typoAnimations.ts의 CSS 키프레임 20종을 캔버스에서 재현한다.
 * p: 해당 글자(또는 블록)의 진행도 0~1 (지연 이전이면 0 미만으로 들어옴 → 시작 상태 유지)
 */
export interface CharState {
  opacity: number;
  tx: number; // px (fontSize 곱 적용 완료)
  ty: number;
  sx: number;
  sy: number;
  rot: number; // rad
  skew: number; // rad (skewX)
  blur: number; // px
  spread: number; // 글자 간격 계수 (em) — 라인 중앙 기준으로 벌어짐
  clip: number | null; // 라인 가시 비율 0~1
  clipFrom: 'left' | 'right';
  bgFlash: number; // 글자 뒤 보라 블록 투명도 (blockgen)
  textAlpha: number | null; // null이면 opacity 사용
}

const BASE: CharState = {
  opacity: 1, tx: 0, ty: 0, sx: 1, sy: 1, rot: 0, skew: 0, blur: 0,
  spread: 0, clip: null, clipFrom: 'left', bgFlash: 0, textAlpha: null,
};

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const easeOut = (p: number) => 1 - Math.pow(1 - p, 3);
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
/** 구간 보간: stops = [[위치(0~1), 값], ...] */
function piece(p: number, stops: [number, number][]): number {
  if (p <= stops[0][0]) return stops[0][1];
  for (let i = 1; i < stops.length; i++) {
    if (p <= stops[i][0]) {
      const [p0, v0] = stops[i - 1];
      const [p1, v1] = stops[i];
      return lerp(v0, v1, (p - p0) / (p1 - p0));
    }
  }
  return stops[stops.length - 1][1];
}

const deg = (d: number) => (d * Math.PI) / 180;

export function evalAnim(id: string, rawP: number, fs: number): CharState {
  const p = clamp01(rawP);
  const e = easeOut(p);
  const s: CharState = { ...BASE };
  // 시작 전(rawP<0)인 글자는 첫 키프레임 상태로
  const pre = rawP < 0;

  switch (id) {
    case 'typewriter':
      s.opacity = pre || p <= 0 ? 0 : 1;
      break;
    case 'riseup':
      s.opacity = pre ? 0 : p;
      s.ty = (1 - (pre ? 0 : e)) * 0.6 * fs;
      break;
    case 'dropdown':
      s.opacity = pre ? 0 : p;
      s.ty = -(1 - (pre ? 0 : e)) * 0.6 * fs;
      break;
    case 'merge':
      s.opacity = pre ? 0 : p;
      s.spread = (1 - (pre ? 0 : e)) * 0.6;
      break;
    case 'blockwipe':
      s.clip = pre ? 0 : e;
      break;
    case 'burst':
      s.opacity = pre ? 0 : piece(p, [[0, 0], [0.7, 1], [1, 1]]);
      s.sx = s.sy = pre ? 1.8 : piece(p, [[0, 1.8], [0.7, 0.95], [1, 1]]);
      break;
    case 'bounce':
      s.opacity = pre ? 0 : piece(p, [[0, 0], [0.55, 1], [1, 1]]);
      s.ty = (pre ? -0.9 : piece(p, [[0, -0.9], [0.55, 0.15], [0.75, -0.08], [1, 0]])) * fs;
      break;
    case 'fall':
      s.opacity = pre ? 0 : piece(p, [[0, 0], [0.7, 1], [1, 1]]);
      s.ty = (pre ? -1.2 : piece(p, [[0, -1.2], [0.7, 0.08], [1, 0]])) * fs;
      s.rot = deg(pre ? 8 : piece(p, [[0, 8], [0.7, -2], [1, 0]]));
      break;
    case 'skate':
      s.opacity = pre ? 0 : p;
      s.tx = -(1 - (pre ? 0 : e)) * 0.9 * fs;
      s.skew = -deg(14) * (1 - (pre ? 0 : e));
      break;
    case 'spread':
      s.opacity = pre ? 0 : p;
      s.spread = pre ? -0.25 : lerp(-0.25, 0.05, e);
      s.blur = (1 - (pre ? 0 : e)) * 2;
      break;
    case 'sharpen':
      s.opacity = pre ? 0.2 : lerp(0.2, 1, p);
      s.blur = (1 - (pre ? 0 : e)) * 10;
      break;
    case 'floatup':
      s.opacity = pre ? 0 : p;
      s.ty = (1 - (pre ? 0 : e)) * 36;
      break;
    case 'panorama':
      s.clip = pre ? 0 : e;
      s.tx = -(1 - (pre ? 0 : e)) * 12;
      break;
    case 'appear':
      s.opacity = pre ? 0 : p;
      break;
    case 'springpop':
      s.opacity = pre ? 0 : piece(p, [[0, 0], [0.65, 1], [1, 1]]);
      s.sx = s.sy = pre ? 0.4 : piece(p, [[0, 0.4], [0.65, 1.12], [1, 1]]);
      break;
    case 'wipeclean':
      s.clip = pre ? 0 : e;
      s.clipFrom = 'right';
      s.opacity = pre ? 0.4 : lerp(0.4, 1, p);
      break;
    case 'blurfade':
      s.opacity = pre ? 0 : piece(p, [[0, 0], [0.35, 1], [0.75, 1], [1, 0]]);
      s.blur = pre ? 8 : piece(p, [[0, 8], [0.35, 0], [0.75, 0], [1, 8]]);
      break;
    case 'chain':
      s.opacity = pre ? 0 : piece(p, [[0, 0], [0.7, 1], [1, 1]]);
      s.sx = s.sy = pre ? 0 : piece(p, [[0, 0], [0.7, 1.25], [1, 1]]);
      break;
    case 'unfold':
      s.opacity = pre ? 0 : p;
      s.sx = pre ? 0.2 : lerp(0.2, 1, e);
      s.blur = (1 - (pre ? 0 : e)) * 4;
      break;
    case 'blockgen':
      s.opacity = pre ? 0 : piece(p, [[0, 0], [0.6, 1], [1, 1]]);
      s.bgFlash = pre ? 0 : piece(p, [[0, 1], [0.6, 1], [1, 0]]);
      s.textAlpha = pre ? 0 : piece(p, [[0, 0], [0.6, 0], [1, 1]]);
      break;
    default:
      break;
  }
  return s;
}
