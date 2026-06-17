import type { FloatObject, Paint } from '../state/types';
import { paintToCanvas, paintToSvg } from '../data/paint';
import { loadImage } from './renderPng';

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const strokeColor = (p: Paint) => (p.type === 'solid' ? p.color : p.stops[0]?.color ?? '#000');

/** 자유 오브젝트들을 SVG 문자열로 (defs + body) */
export function objectsToSvg(objects: FloatObject[]): { defs: string; body: string } {
  const defs: string[] = [];
  const body: string[] = [];
  objects.filter((o) => !o.hidden).forEach((o, i) => {
    const cx = o.x + o.w / 2;
    const cy = o.y + o.h / 2;
    const tf = `transform="translate(${cx.toFixed(1)} ${cy.toFixed(1)}) rotate(${o.rotation}) translate(${(-o.w / 2).toFixed(1)} ${(-o.h / 2).toFixed(1)})" opacity="${o.opacity}"`;
    let filter = '';
    if (o.shadow) {
      const fid = `sh${i}`;
      defs.push(
        `<filter id="${fid}" x="-50%" y="-50%" width="200%" height="200%"><feDropShadow dx="${o.shadow.x}" dy="${o.shadow.y}" stdDeviation="${o.shadow.blur / 2}" flood-color="${o.shadow.color}"/></filter>`,
      );
      filter = ` filter="url(#${fid})"`;
    }
    let fillAttr = 'fill="none"';
    if (o.kind !== 'image' && o.fill) {
      const { fill, def } = paintToSvg(o.fill, o.w, o.h);
      if (def) defs.push(def);
      fillAttr = `fill="${fill}"`;
    }
    const strokeAttr = o.stroke && o.stroke.width > 0
      ? ` stroke="${strokeColor(o.stroke.paint)}" stroke-width="${o.stroke.width}"`
      : '';
    let shape: string;
    if (o.kind === 'image' && o.imageDataUrl) {
      shape = `<image x="0" y="0" width="${o.w}" height="${o.h}" href="${o.imageDataUrl}" preserveAspectRatio="none"${strokeAttr}/>`;
    } else if (o.kind === 'ellipse') {
      shape = `<ellipse cx="${o.w / 2}" cy="${o.h / 2}" rx="${o.w / 2}" ry="${o.h / 2}" ${fillAttr}${strokeAttr}/>`;
    } else {
      shape = `<rect x="0" y="0" width="${o.w}" height="${o.h}" rx="${o.radius ?? 0}" ${fillAttr}${strokeAttr}/>`;
    }
    body.push(`<g ${tf}${filter}>${shape}</g>`);
  });
  return { defs: defs.join(''), body: body.join('\n') };
}

/** 자유 오브젝트들을 캔버스에 그리기 (PNG·GIF 공용) */
export async function drawObjectsCanvas(c: CanvasRenderingContext2D, objects: FloatObject[]) {
  for (const o of objects) {
    if (o.hidden) continue;
    c.save();
    c.globalAlpha = o.opacity;
    c.translate(o.x + o.w / 2, o.y + o.h / 2);
    c.rotate((o.rotation * Math.PI) / 180);
    c.translate(-o.w / 2, -o.h / 2);
    if (o.shadow) {
      c.shadowColor = o.shadow.color;
      c.shadowBlur = o.shadow.blur;
      c.shadowOffsetX = o.shadow.x;
      c.shadowOffsetY = o.shadow.y;
    }

    const pathRect = () => {
      c.beginPath();
      if (o.kind === 'ellipse') c.ellipse(o.w / 2, o.h / 2, o.w / 2, o.h / 2, 0, 0, Math.PI * 2);
      else c.roundRect(0, 0, o.w, o.h, o.radius ?? 0);
    };

    if (o.kind === 'image' && o.imageDataUrl) {
      try {
        const img = await loadImage(o.imageDataUrl);
        if (o.kind === 'image') c.drawImage(img, 0, 0, o.w, o.h);
      } catch {
        /* skip */
      }
    } else if (o.fill) {
      pathRect();
      c.fillStyle = paintToCanvas(c, o.fill, o.w, o.h);
      c.fill();
    }
    // stroke (그림자는 채움에만 — 테두리 그릴 땐 끔)
    c.shadowColor = 'transparent';
    c.shadowBlur = 0;
    if (o.stroke && o.stroke.width > 0) {
      if (o.kind === 'image') {
        c.beginPath();
        c.rect(0, 0, o.w, o.h);
      } else pathRect();
      c.lineWidth = o.stroke.width;
      c.strokeStyle = o.stroke.paint.type === 'solid' ? o.stroke.paint.color : (paintToCanvas(c, o.stroke.paint, o.w, o.h) as string | CanvasGradient as string);
      c.stroke();
    }
    c.restore();
  }
}

export { esc };
