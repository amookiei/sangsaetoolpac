import type { Project, StyleGuide } from '../state/types';
import { DEFAULT_FONT } from './fonts';

export const DEFAULT_STYLE_GUIDE: StyleGuide = {
  headingFont: DEFAULT_FONT,
  headingColor: '#1a1a2e',
  headingBold: true,
  emphasisColor: '#d97757',
  emphasisHighlight: '#fff176',
  bodyFont: DEFAULT_FONT,
  bodyColor: '#555566',
  bodySize: 20,
  numberColor: '#ff5e51',
  pageBg: '#ffffff',
  cardBg: '#f6f7f9',
};

export const guideOf = (p: Project): StyleGuide => p.styleGuide ?? DEFAULT_STYLE_GUIDE;

/** 스타일 가이드를 모든 섹션에 일괄 적용한 패치 생성 */
export function applyStyleGuide(p: Project, g: StyleGuide): Partial<Project> {
  return {
    styleGuide: g,
    globalFont: g.headingFont,
    sections: p.sections.map((s) => ({
      ...s,
      bg: g.pageBg,
      blocks: s.blocks.map((b) => {
        if (b.kind === 'heading') {
          return { ...b, font: g.headingFont, color: g.headingColor, bold: g.headingBold };
        }
        if (b.kind === 'body') {
          return { ...b, font: g.bodyFont, color: g.bodyColor, fontSize: g.bodySize };
        }
        return b;
      }),
    })),
  };
}
