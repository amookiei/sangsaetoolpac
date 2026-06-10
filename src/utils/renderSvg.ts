import type { Section } from '../state/types';
import { layoutSection } from './layout';
import { TYPO_KEYFRAMES_CSS, animById } from '../data/typoAnimations';

const esc = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/**
 * 피그마에서 편집 가능한 네이티브 SVG 생성.
 * 텍스트는 <text>, 배경은 <rect>, 이미지는 <image>로 추출되어
 * 피그마 임포트 시 레이어별로 수정할 수 있다.
 * animated=true 면 타이포 애니메이션이 CSS로 임베드된다(브라우저 재생용).
 */
export function renderSvg(section: Section, width: number, animated: boolean): string {
  const lay = layoutSection(section, width);
  const parts: string[] = [];
  let hasAnim = false;

  for (const p of lay.prims) {
    if (p.type === 'rect') {
      parts.push(
        `<rect x="${p.x.toFixed(1)}" y="${p.y.toFixed(1)}" width="${p.w.toFixed(1)}" height="${p.h.toFixed(1)}" rx="${p.rx}" fill="${p.color}"/>`,
      );
    } else if (p.type === 'image') {
      parts.push(
        `<image x="${p.x.toFixed(1)}" y="${p.y.toFixed(1)}" width="${p.w.toFixed(1)}" height="${p.h.toFixed(1)}" href="${p.dataUrl}" preserveAspectRatio="xMidYMid slice"/>`,
      );
    } else if (p.type === 'placeholder') {
      parts.push(
        `<rect x="${p.x}" y="${p.y}" width="${p.w}" height="${p.h}" rx="12" fill="#f0f4ff" stroke="#2563eb" stroke-width="1.5" stroke-dasharray="6 5"/>`,
      );
      p.descLines.forEach((line, i) => {
        parts.push(
          `<text x="${p.x + p.w / 2}" y="${p.y + p.h / 2 - (p.descLines.length - 1) * 12 + i * 24}" text-anchor="middle" font-family="Pretendard Variable, Noto Sans KR, sans-serif" font-size="16" fill="#2563eb">${esc(line)}</text>`,
        );
      });
    } else {
      const common = `font-family="${esc(p.font)}, Noto Sans KR, sans-serif" font-size="${p.size}" font-weight="${p.weight}" fill="${p.color}"`;
      const anim = animated ? animById(p.anim) : null;
      if (anim && p.charXs) {
        hasAnim = true;
        const chars = [...p.text];
        chars.forEach((ch, i) => {
          if (ch === ' ') return;
          const delay = anim.mode === 'char' ? i * anim.stagger : 0;
          parts.push(
            `<text x="${p.charXs![i].toFixed(1)}" y="${p.baseline.toFixed(1)}" ${common} class="ta" style="animation:ta-${anim.id} ${Math.max(anim.duration, 0.3)}s ${delay.toFixed(2)}s both; animation-timing-function:cubic-bezier(.2,.7,.3,1)">${esc(ch)}</text>`,
          );
        });
      } else {
        parts.push(`<text x="${p.x.toFixed(1)}" y="${p.baseline.toFixed(1)}" ${common}>${esc(p.text)}</text>`);
      }
    }
  }

  const style = hasAnim
    ? `<style>${TYPO_KEYFRAMES_CSS} .ta { transform-box: fill-box; transform-origin: center; }</style>`
    : '';

  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${lay.width}" height="${Math.ceil(lay.height)}" viewBox="0 0 ${lay.width} ${Math.ceil(lay.height)}">`,
    style,
    `<rect width="${lay.width}" height="${Math.ceil(lay.height)}" fill="${lay.bg}"/>`,
    ...parts,
    `</svg>`,
  ].join('\n');
}
