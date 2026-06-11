import type { Project, StyleGuide } from '../state/types';
import { DEFAULT_FONT } from './fonts';

export const DEFAULT_STYLE_GUIDE: StyleGuide = {
  headingFont: DEFAULT_FONT,
  headingSize: 32,
  headingColor: '#1a1a2e',
  headingBold: true,
  bodyFont: DEFAULT_FONT,
  bodySize: 20,
  bodyColor: '#555566',
  emphasisColor: '#d97757',
  emphasisHighlight: '#fff176',
  numberShape: 'circle',
  numberSize: 26,
  numberColor: '#ffffff',
  numberShapeColor: '#d97757',
  pageBg: '#ffffff',
  cardBg: '#f6f7f9',
  gradEnabled: false,
  gradColor2: '#fde7d8',
  gradAngle: 180,
};

/** 저장된 가이드에 새 필드가 없을 수 있어 기본값과 병합 */
export const guideOf = (p: Project): StyleGuide => ({ ...DEFAULT_STYLE_GUIDE, ...p.styleGuide });

/** 스타일 가이드를 모든 섹션에 일괄 적용한 패치 생성 */
export function applyStyleGuide(p: Project, g: StyleGuide): Partial<Project> {
  return {
    styleGuide: g,
    globalFont: g.headingFont,
    sections: p.sections.map((s) => ({
      ...s,
      bg: g.pageBg,
      bgGrad: g.gradEnabled ? { color2: g.gradColor2, angle: g.gradAngle } : null,
      blocks: s.blocks.map((b) => {
        if (b.numberShape) {
          return {
            ...b,
            numberShape: g.numberShape,
            numberShapeColor: g.numberShapeColor,
            fontSize: g.numberSize,
            color: g.numberColor,
          };
        }
        if (b.kind === 'heading') {
          return {
            ...b,
            font: g.headingFont,
            fontSize: g.headingSize,
            color: g.headingColor,
            bold: g.headingBold,
          };
        }
        if (b.kind === 'body') {
          return { ...b, font: g.bodyFont, color: g.bodyColor, fontSize: g.bodySize };
        }
        return b;
      }),
    })),
  };
}
