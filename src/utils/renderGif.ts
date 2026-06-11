import { GIFEncoder, quantize, applyPalette } from 'gifenc';
import type { Section } from '../state/types';
import { layoutSection, setFont, type Prim } from './layout';
import { animById, LINE_DELAY } from '../data/typoAnimations';
import { evalAnim } from './animEval';
import { loadImage, imgCache, fillSectionBg, drawShape, fillTextBold, drawBgLayers } from './renderPng';

const LEAD_IN = 0.25; // 애니메이션 시작 전 정지 구간(초)
const HOLD = 0.9; // 종료 후 정지 구간(초)

interface AnimLine {
  prim: Extract<Prim, { type: 'line' }>;
  chars: string[];
  charWs: number[];
  lineW: number;
  animId: string;
  duration: number; // 속도 반영 완료
  stagger: number;
  lineDelay: number; // 줄별 단위에서 이 줄의 시작 지연
  unit: 'char' | 'line';
  charOffset: number;
  end: number;
}

interface AnimImage {
  prim: Extract<Prim, { type: 'image' }>;
  animId: string;
  duration: number;
  end: number;
}

/**
 * 타이포/이미지 애니메이션이 들어간 섹션을 움직이는 GIF로 인코딩.
 * CSS 키프레임을 animEval.ts로 재현해 프레임별로 캔버스에 그린다.
 */
export async function renderGif(
  section: Section,
  width: number,
  opts: { fps?: number; scale?: number; onProgress?: (ratio: number) => void } = {},
): Promise<Blob> {
  const fps = opts.fps ?? 15;
  const scale = opts.scale ?? 1;
  await document.fonts.ready;

  const lay = layoutSection(section, width);
  const h = Math.ceil(lay.height);

  const measure = document.createElement('canvas').getContext('2d')!;
  const animLines: AnimLine[] = [];
  const animImages: AnimImage[] = [];

  for (const p of lay.prims) {
    if (p.type === 'image' && p.anim) {
      const anim = animById(p.anim);
      if (!anim) continue;
      const dur = Math.max(anim.duration, 0.3) / (p.animSpeed || 1);
      animImages.push({ prim: p, animId: anim.id, duration: dur, end: LEAD_IN + dur });
      continue;
    }
    if (p.type !== 'line' || !p.anim || !p.animMeta) continue;
    const anim = animById(p.anim);
    if (!anim) continue;
    const m = p.animMeta;
    setFont(measure, p.font, p.size, p.weight);
    const chars = [...p.text];
    const charWs = chars.map((ch) => measure.measureText(ch).width);
    const lineW = charWs.reduce((a, b) => a + b, 0);
    const dur = Math.max(anim.duration, 0.3) / m.speed;
    const stagger = (anim.stagger || 0.06) / m.speed;
    const lineDelay = m.unit === 'line' ? (m.lineIdx * LINE_DELAY) / m.speed : 0;
    const end =
      m.unit === 'char'
        ? LEAD_IN + dur + stagger * (m.charOffset + Math.max(chars.length - 1, 0))
        : LEAD_IN + lineDelay + dur;
    animLines.push({
      prim: p, chars, charWs, lineW,
      animId: anim.id, duration: dur, stagger, lineDelay,
      unit: m.unit, charOffset: m.charOffset, end,
    });
  }

  if (animLines.length === 0 && animImages.length === 0) {
    throw new Error('애니메이션이 적용된 텍스트/이미지가 없습니다. 5단계에서 애니메이션을 설정해 주세요.');
  }

  const total =
    Math.max(...animLines.map((l) => l.end), ...animImages.map((i) => i.end), 0) + HOLD;
  const frameCount = Math.max(2, Math.round(total * fps));

  const canvas = document.createElement('canvas');
  canvas.width = Math.round(width * scale);
  canvas.height = Math.round(h * scale);
  const c = canvas.getContext('2d', { willReadFrequently: true })!;

  // 이미지 프리로드 (블록 이미지 + 배경 레이어)
  for (const p of lay.prims) {
    if (p.type === 'image') await loadImage(p.dataUrl).catch(() => null);
  }
  for (const L of section.bgLayers ?? []) {
    if (L.imageDataUrl) await loadImage(L.imageDataUrl).catch(() => null);
  }

  // 레이어 1(블록 콘텐츠) 불투명도 — 1 미만이면 프레임마다 별도 캔버스에 그려 합성
  const contentOpacity = section.contentOpacity ?? 1;
  let cc: HTMLCanvasElement | null = null;
  let cctx: CanvasRenderingContext2D | null = null;
  if (contentOpacity < 1) {
    cc = document.createElement('canvas');
    cc.width = canvas.width;
    cc.height = canvas.height;
    cctx = cc.getContext('2d')!;
  }

  const animSet = new Set<Prim>([
    ...animLines.map((l) => l.prim as Prim),
    ...animImages.map((i) => i.prim as Prim),
  ]);
  const gif = GIFEncoder();

  for (let f = 0; f < frameCount; f++) {
    const t = f / fps;
    c.setTransform(scale, 0, 0, scale, 0, 0);
    fillSectionBg(c, lay, width, h);
    await drawBgLayers(c, section, width, h);

    let tc = c; // 콘텐츠를 그릴 대상 (불투명도 합성 시 별도 캔버스)
    if (cctx && cc) {
      cctx.setTransform(1, 0, 0, 1, 0, 0);
      cctx.clearRect(0, 0, cc.width, cc.height);
      cctx.setTransform(scale, 0, 0, scale, 0, 0);
      tc = cctx;
    }
    for (const p of lay.prims) {
      if (animSet.has(p)) continue; // 애니메이션 요소는 아래에서
      drawStatic(tc, p);
    }
    for (const img of animImages) drawAnimImage(tc, img, t);
    for (const line of animLines) drawAnimLine(tc, line, t);
    if (cctx && cc) {
      c.save();
      c.setTransform(1, 0, 0, 1, 0, 0);
      c.globalAlpha = contentOpacity;
      c.drawImage(cc, 0, 0);
      c.restore();
    }

    const { data } = c.getImageData(0, 0, canvas.width, canvas.height);
    const palette = quantize(data, 256);
    const index = applyPalette(data, palette);
    gif.writeFrame(index, canvas.width, canvas.height, { palette, delay: Math.round(1000 / fps) });
    opts.onProgress?.((f + 1) / frameCount);
    // 인코딩 중 UI 멈춤 방지
    if (f % 4 === 3) await new Promise((r) => setTimeout(r, 0));
  }

  gif.finish();
  return new Blob([gif.bytes().slice().buffer as ArrayBuffer], { type: 'image/gif' });
}

function drawStatic(c: CanvasRenderingContext2D, p: Prim) {
  if (p.type === 'rect') {
    c.fillStyle = p.color;
    c.beginPath();
    c.roundRect(p.x, p.y, p.w, p.h, p.rx);
    c.fill();
  } else if (p.type === 'shape') {
    drawShape(c, p);
  } else if (p.type === 'image') {
    const img = imgFromCache(p.dataUrl);
    if (img) c.drawImage(img, p.x, p.y, p.w, p.h);
  } else if (p.type === 'placeholder') {
    c.fillStyle = '#f0f4ff';
    c.beginPath();
    c.roundRect(p.x, p.y, p.w, p.h, 12);
    c.fill();
    c.fillStyle = '#2563eb';
    setFont(c, 'Pretendard Variable', 16, 400);
    c.textAlign = 'center';
    p.descLines.forEach((line, i) => {
      c.fillText(line, p.x + p.w / 2, p.y + p.h / 2 - (p.descLines.length - 1) * 12 + i * 24);
    });
    c.textAlign = 'left';
  } else {
    c.fillStyle = p.color;
    setFont(c, p.font, p.size, p.weight);
    fillTextBold(c, p.text, p.x, p.baseline, p.size, p.weight);
  }
}

function imgFromCache(src: string): HTMLImageElement | null {
  return imgCache.get(src) ?? null;
}

/** 애니메이션 이미지 — 블록형 프리셋 상태를 이미지 전체에 적용 */
function drawAnimImage(c: CanvasRenderingContext2D, item: AnimImage, t: number) {
  const { prim } = item;
  const img = imgFromCache(prim.dataUrl);
  if (!img) return;
  const rawP = (t - LEAD_IN) / item.duration;
  const st = evalAnim(item.animId, t < LEAD_IN ? -1 : rawP, 48);

  c.save();
  if (st.clip !== null) {
    const visW = prim.w * st.clip;
    const cx = st.clipFrom === 'left' ? prim.x : prim.x + prim.w - visW;
    c.beginPath();
    c.rect(cx + st.tx, prim.y - 2, visW + 2, prim.h + 4);
    c.clip();
  }
  const cx = prim.x + prim.w / 2 + st.tx;
  const cy = prim.y + prim.h / 2 + st.ty;
  c.translate(cx, cy);
  if (st.rot) c.rotate(st.rot);
  if (st.sx !== 1 || st.sy !== 1) c.scale(st.sx, st.sy);
  if (st.blur > 0.2) c.filter = `blur(${st.blur.toFixed(1)}px)`;
  c.globalAlpha = st.textAlpha !== null ? st.textAlpha : st.opacity;
  c.drawImage(img, -prim.w / 2, -prim.h / 2, prim.w, prim.h);
  c.restore();
}

function drawAnimLine(c: CanvasRenderingContext2D, line: AnimLine, t: number) {
  const { prim, chars, charWs, lineW } = line;
  const fs = prim.size;
  setFont(c, prim.font, fs, prim.weight);

  // 줄 단위 진행도 (줄별 모드·clip 프리셋)
  const lineP = (t - LEAD_IN - line.lineDelay) / line.duration;
  const lineState = evalAnim(line.animId, t < LEAD_IN ? -1 : lineP, fs);
  const useClip = lineState.clip !== null && line.unit === 'line';
  if (useClip) {
    c.save();
    const visW = lineW * (lineState.clip ?? 1);
    const cx = lineState.clipFrom === 'left' ? prim.x : prim.x + lineW - visW;
    c.beginPath();
    c.rect(cx + lineState.tx, prim.baseline - fs * 1.4, visW + 2, fs * 2);
    c.clip();
  }

  let x = prim.x;
  const n = chars.length;
  for (let i = 0; i < n; i++) {
    const ch = chars[i];
    const w = charWs[i];
    if (ch !== ' ') {
      const rawP =
        line.unit === 'char'
          ? (t - LEAD_IN - (line.charOffset + i) * line.stagger) / line.duration
          : lineP;
      const st = evalAnim(line.animId, t < LEAD_IN ? -1 : rawP, fs);
      const spreadTx = st.spread !== 0 ? (i - (n - 1) / 2) * st.spread * fs : 0;
      const cx = x + w / 2 + st.tx + spreadTx;
      const cy = prim.baseline - fs * 0.35 + st.ty;

      c.save();
      c.translate(cx, cy);
      if (st.rot) c.rotate(st.rot);
      if (st.skew) c.transform(1, 0, Math.tan(st.skew), 1, 0, 0);
      if (st.sx !== 1 || st.sy !== 1) c.scale(st.sx, st.sy);
      if (st.blur > 0.2) c.filter = `blur(${st.blur.toFixed(1)}px)`;

      if (st.bgFlash > 0.02) {
        c.globalAlpha = Math.min(st.opacity, st.bgFlash);
        c.fillStyle = '#d97757';
        c.fillRect(-w / 2 - 2, -fs * 0.72, w + 4, fs * 1.3);
      }
      c.globalAlpha = st.textAlpha !== null ? st.textAlpha : st.opacity;
      c.fillStyle = prim.color;
      fillTextBold(c, ch, -w / 2, fs * 0.35, fs, prim.weight);
      c.restore();
    }
    x += w;
  }

  if (useClip) c.restore();
}
