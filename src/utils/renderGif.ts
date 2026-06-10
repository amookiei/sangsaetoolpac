import { GIFEncoder, quantize, applyPalette } from 'gifenc';
import type { Section } from '../state/types';
import { layoutSection, setFont, type Prim } from './layout';
import { animById } from '../data/typoAnimations';
import { evalAnim } from './animEval';
import { loadImage, imgCache } from './renderPng';

const LEAD_IN = 0.25; // 애니메이션 시작 전 정지 구간(초)
const HOLD = 0.9; // 종료 후 정지 구간(초)

interface AnimLine {
  prim: Extract<Prim, { type: 'line' }>;
  chars: string[];
  charWs: number[];
  lineW: number;
  animId: string;
  duration: number;
  stagger: number;
  mode: 'char' | 'block';
  end: number;
}

/**
 * 타이포 애니메이션이 들어간 섹션을 움직이는 GIF로 인코딩.
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
  for (const p of lay.prims) {
    if (p.type !== 'line' || !p.anim) continue;
    const anim = animById(p.anim);
    if (!anim) continue;
    setFont(measure, p.font, p.size, p.weight);
    const chars = [...p.text];
    const charWs = chars.map((ch) => measure.measureText(ch).width);
    const lineW = charWs.reduce((a, b) => a + b, 0);
    const dur = Math.max(anim.duration, 0.3);
    const end =
      LEAD_IN + dur + (anim.mode === 'char' ? anim.stagger * Math.max(chars.length - 1, 0) : 0);
    animLines.push({
      prim: p, chars, charWs, lineW,
      animId: anim.id, duration: dur, stagger: anim.stagger, mode: anim.mode, end,
    });
  }
  if (animLines.length === 0) {
    throw new Error('타이포 애니메이션이 적용된 텍스트가 없습니다. 5단계에서 애니메이션을 설정해 주세요.');
  }

  const total = Math.max(...animLines.map((l) => l.end)) + HOLD;
  const frameCount = Math.max(2, Math.round(total * fps));

  const canvas = document.createElement('canvas');
  canvas.width = Math.round(width * scale);
  canvas.height = Math.round(h * scale);
  const c = canvas.getContext('2d', { willReadFrequently: true })!;

  // 이미지 프리로드
  for (const p of lay.prims) {
    if (p.type === 'image') await loadImage(p.dataUrl).catch(() => null);
  }

  const animSet = new Set<Prim>(animLines.map((l) => l.prim));
  const gif = GIFEncoder();

  for (let f = 0; f < frameCount; f++) {
    const t = f / fps;
    c.setTransform(scale, 0, 0, scale, 0, 0);
    c.fillStyle = lay.bg;
    c.fillRect(0, 0, width, h);

    for (const p of lay.prims) {
      if (animSet.has(p)) continue; // 애니메이션 라인은 아래에서
      drawStatic(c, p);
    }
    for (const line of animLines) drawAnimLine(c, line, t);

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
    c.fillText(p.text, p.x, p.baseline);
  }
}

function imgFromCache(src: string): HTMLImageElement | null {
  return imgCache.get(src) ?? null;
}

function drawAnimLine(c: CanvasRenderingContext2D, line: AnimLine, t: number) {
  const { prim, chars, charWs, lineW } = line;
  const fs = prim.size;
  setFont(c, prim.font, fs, prim.weight);

  // 라인 단위 클립(blockwipe/panorama/wipeclean)
  const blockP = (t - LEAD_IN) / line.duration;
  const blockState = evalAnim(line.animId, t < LEAD_IN ? -1 : blockP, fs);
  const useClip = blockState.clip !== null && line.mode === 'block';
  if (useClip) {
    c.save();
    const visW = lineW * (blockState.clip ?? 1);
    const cx = blockState.clipFrom === 'left' ? prim.x : prim.x + lineW - visW;
    c.beginPath();
    c.rect(cx + blockState.tx, prim.baseline - fs * 1.4, visW + 2, fs * 2);
    c.clip();
  }

  let x = prim.x;
  const n = chars.length;
  for (let i = 0; i < n; i++) {
    const ch = chars[i];
    const w = charWs[i];
    if (ch !== ' ') {
      const rawP =
        line.mode === 'char' ? (t - LEAD_IN - i * line.stagger) / line.duration : blockP;
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
        c.fillStyle = '#8b5cf6';
        c.fillRect(-w / 2 - 2, -fs * 0.72, w + 4, fs * 1.3);
      }
      c.globalAlpha = st.textAlpha !== null ? st.textAlpha : st.opacity;
      c.fillStyle = prim.color;
      c.fillText(ch, -w / 2, fs * 0.35);
      c.restore();
    }
    x += w;
  }

  if (useClip) c.restore();
}
