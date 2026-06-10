import type { Section } from '../state/types';
import { layoutSection, setFont } from './layout';

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

  c.fillStyle = lay.bg;
  c.fillRect(0, 0, width, h);

  for (const p of lay.prims) {
    if (p.type === 'rect') {
      c.fillStyle = p.color;
      c.beginPath();
      c.roundRect(p.x, p.y, p.w, p.h, p.rx);
      c.fill();
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
      c.fillText(p.text, p.x, p.baseline);
    }
  }

  return canvas;
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
