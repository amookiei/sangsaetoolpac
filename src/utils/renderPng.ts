import type { Section } from '../state/types';
import { layoutSection, setFont, gradPoints, type Prim, type SectionLayout } from './layout';

/**
 * 굵게 보강 텍스트 그리기 (PNG·GIF 공용).
 * 캔버스는 폰트에 700+ 웨이트가 없으면 가짜 볼드를 합성하지 않아
 * 굵게가 안 보이는 경우가 있다 → 같은 색 스트로크를 겹쳐 보강.
 */
export function fillTextBold(
  c: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  size: number,
  weight: number,
) {
  c.fillText(text, x, y);
  if (weight >= 700) {
    const prevStroke = c.strokeStyle;
    const prevWidth = c.lineWidth;
    const prevJoin = c.lineJoin;
    c.strokeStyle = c.fillStyle;
    c.lineWidth = Math.max(size / 30, 0.7);
    c.lineJoin = 'round';
    c.strokeText(text, x, y);
    c.strokeStyle = prevStroke;
    c.lineWidth = prevWidth;
    c.lineJoin = prevJoin;
  }
}

/** 숫자 뱃지 도형 그리기 (PNG·GIF 공용) */
export function drawShape(c: CanvasRenderingContext2D, p: Extract<Prim, { type: 'shape' }>) {
  c.fillStyle = p.color;
  if (p.shape === 'circle') {
    c.beginPath();
    c.arc(p.x + p.w / 2, p.y + p.h / 2, p.w / 2, 0, Math.PI * 2);
    c.fill();
  } else if (p.shape === 'triangle') {
    c.beginPath();
    c.moveTo(p.x + p.w / 2, p.y);
    c.lineTo(p.x, p.y + p.h);
    c.lineTo(p.x + p.w, p.y + p.h);
    c.closePath();
    c.fill();
  } else {
    c.beginPath();
    c.roundRect(p.x, p.y, p.w, p.h, p.shape === 'square' ? 10 : 2.5);
    c.fill();
  }
}

/** 섹션 배경 채우기 (단색 또는 그라디언트) */
export function fillSectionBg(c: CanvasRenderingContext2D, lay: SectionLayout, w: number, h: number) {
  if (lay.bgGrad) {
    const g = gradPoints(lay.bgGrad.angle, w, h);
    const grad = c.createLinearGradient(g.x1, g.y1, g.x2, g.y2);
    grad.addColorStop(0, lay.bg);
    grad.addColorStop(1, lay.bgGrad.color2);
    c.fillStyle = grad;
  } else {
    c.fillStyle = lay.bg;
  }
  c.fillRect(0, 0, w, h);
}

/** 이미지를 영역에 cover 방식으로 그리기 (배경 레이어용) */
export function drawCover(
  c: CanvasRenderingContext2D,
  img: HTMLImageElement,
  w: number,
  h: number,
) {
  const s = Math.max(w / img.naturalWidth, h / img.naturalHeight);
  const dw = img.naturalWidth * s;
  const dh = img.naturalHeight * s;
  c.drawImage(img, (w - dw) / 2, (h - dh) / 2, dw, dh);
}

/** 레이어 2+ (블록 콘텐츠 아래 배경 레이어) 그리기 — PNG·GIF 공용 */
export async function drawBgLayers(
  c: CanvasRenderingContext2D,
  section: Section,
  w: number,
  h: number,
) {
  for (const L of [...(section.bgLayers ?? [])].reverse()) {
    if (L.hidden) continue;
    c.save();
    c.globalAlpha = L.opacity;
    if (L.imageDataUrl) {
      const img = await loadImage(L.imageDataUrl).catch(() => null);
      if (img) drawCover(c, img, w, h);
    } else if (L.color) {
      c.fillStyle = L.color;
      c.fillRect(0, 0, w, h);
    }
    c.restore();
  }
}

export const imgCache = new Map<string, HTMLImageElement>();
export function loadImage(src: string): Promise<HTMLImageElement> {
  const hit = imgCache.get(src);
  if (hit) return Promise.resolve(hit);
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      imgCache.set(src, img);
      resolve(img);
    };
    img.onerror = reject;
    img.src = src;
  });
}

/**
 * 캔버스에 직접 그려 PNG 생성 (scale배 해상도).
 * 문서에 로드된 웹폰트를 그대로 사용하므로 SVG 래스터화보다 폰트가 안정적으로 나온다.
 */
export async function renderPngCanvas(
  section: Section,
  width: number,
  scale = 2,
): Promise<HTMLCanvasElement> {
  await document.fonts.ready;
  const lay = layoutSection(section, width);
  const h = Math.ceil(lay.height);
  const canvas = document.createElement('canvas');
  canvas.width = width * scale;
  canvas.height = h * scale;
  const c = canvas.getContext('2d')!;
  c.scale(scale, scale);

  fillSectionBg(c, lay, width, h);
  await drawBgLayers(c, section, width, h);

  // 레이어 1(블록 콘텐츠) 불투명도 — 1 미만이면 별도 캔버스에 그려 합성
  const contentOpacity = section.contentOpacity ?? 1;
  if (contentOpacity < 1) {
    const cc = document.createElement('canvas');
    cc.width = canvas.width;
    cc.height = canvas.height;
    const c2 = cc.getContext('2d')!;
    c2.scale(scale, scale);
    await drawPrims(c2, lay);
    c.save();
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.globalAlpha = contentOpacity;
    c.drawImage(cc, 0, 0);
    c.restore();
  } else {
    await drawPrims(c, lay);
  }

  return canvas;
}

/** 레이아웃 프리미티브 일괄 그리기 (정적 — PNG용) */
async function drawPrims(c: CanvasRenderingContext2D, lay: SectionLayout) {
  for (const p of lay.prims) {
    if (p.type === 'rect') {
      c.fillStyle = p.color;
      c.beginPath();
      c.roundRect(p.x, p.y, p.w, p.h, p.rx);
      c.fill();
    } else if (p.type === 'shape') {
      drawShape(c, p);
    } else if (p.type === 'image') {
      try {
        const img = await loadImage(p.dataUrl);
        c.drawImage(img, p.x, p.y, p.w, p.h);
      } catch {
        /* 손상된 이미지는 건너뜀 */
      }
    } else if (p.type === 'placeholder') {
      c.fillStyle = '#f0f4ff';
      c.strokeStyle = '#2563eb';
      c.setLineDash([6, 5]);
      c.lineWidth = 1.5;
      c.beginPath();
      c.roundRect(p.x, p.y, p.w, p.h, 12);
      c.fill();
      c.stroke();
      c.setLineDash([]);
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
}

export function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('PNG 생성 실패'))), 'image/png'),
  );
}

export async function renderPng(section: Section, width: number, scale = 2): Promise<Blob> {
  return canvasToBlob(await renderPngCanvas(section, width, scale));
}

/** 선택된 섹션들을 세로로 이어붙인 한 장짜리 PNG */
export async function renderPngCombined(
  sections: Section[],
  width: number,
  scale = 2,
): Promise<Blob> {
  const canvases: HTMLCanvasElement[] = [];
  for (const s of sections) canvases.push(await renderPngCanvas(s, width, scale));
  const total = canvases.reduce((a, c) => a + c.height, 0);
  const master = document.createElement('canvas');
  master.width = Math.round(width * scale);
  master.height = total;
  const c = master.getContext('2d')!;
  let y = 0;
  for (const cv of canvases) {
    c.drawImage(cv, 0, y);
    y += cv.height;
  }
  return canvasToBlob(master);
}
