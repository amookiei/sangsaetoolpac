import type { BodyStyle, Project, StyleGuide } from '../state/types';
import { DEFAULT_FONT } from './fonts';

export const DEFAULT_STYLE_GUIDE: StyleGuide = {
  headingFont: DEFAULT_FONT,
  headingSize: 32,
  headingColor: '#1a1a2e',
  headingBold: true,
  bodyStyles: [
    { id: 'body1', name: '내용 스타일 1', font: DEFAULT_FONT, size: 20, color: '#555566' },
  ],
  emphasisColor: '#d97757',
  emphasisHighlight: '#fff176',
  numberShape: 'circle',
  numberSize: 26,
  numberColor: '#ffffff',
  numberShapeColor: '#d97757',
  pageBg: '#ffffff',
  cardBg: '#f6f7f9',
  gradients: [{ id: 'g1', color1: '#ffffff', color2: '#fde7d8', angle: 180 }],
  gradEnabled: false,
};

/** 구버전 가이드(단일 내용 스타일·단일 그라데이션) 필드 */
interface LegacyGuide {
  bodyFont?: string;
  bodySize?: number;
  bodyColor?: string;
  gradColor2?: string;
  gradAngle?: number;
}

/** 저장된 가이드에 새 필드가 없을 수 있어 기본값과 병합 + 구버전 마이그레이션 */
export function guideOf(p: Project): StyleGuide {
  const raw = (p.styleGuide ?? {}) as Partial<StyleGuide> & LegacyGuide;
  const g: StyleGuide = { ...DEFAULT_STYLE_GUIDE, ...raw };
  if (!raw.bodyStyles?.length) {
    g.bodyStyles = [
      {
        id: 'body1',
        name: '내용 스타일 1',
        font: raw.bodyFont ?? DEFAULT_FONT,
        size: raw.bodySize ?? 20,
        color: raw.bodyColor ?? '#555566',
      },
    ];
  }
  if (!raw.gradients?.length) {
    g.gradients = [
      {
        id: 'g1',
        color1: g.pageBg,
        color2: raw.gradColor2 ?? '#fde7d8',
        angle: raw.gradAngle ?? 180,
      },
    ];
  }
  return g;
}

/** 블록의 특성(styleId)에 해당하는 내용 스타일 찾기 */
export function bodyStyleOf(g: StyleGuide, styleId: string | null | undefined): BodyStyle {
  return g.bodyStyles.find((s) => s.id === styleId) ?? g.bodyStyles[0];
}

/** 스타일 가이드를 모든 섹션에 일괄 적용한 패치 생성 */
export function applyStyleGuide(p: Project, g: StyleGuide): Partial<Project> {
  const grad = g.gradEnabled ? g.gradients[0] : null;
  return {
    styleGuide: g,
    globalFont: g.headingFont,
    sections: p.sections.map((s) => ({
      ...s,
      bg: grad ? grad.color1 : g.pageBg,
      bgGrad: grad ? { color2: grad.color2, angle: grad.angle } : null,
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
        if (b.kind === 'heading' || b.styleId === 'heading') {
          return {
            ...b,
            font: g.headingFont,
            fontSize: g.headingSize,
            color: g.headingColor,
            bold: g.headingBold,
          };
        }
        if (b.kind === 'body') {
          const st = bodyStyleOf(g, b.styleId);
          return { ...b, font: st.font, color: st.color, fontSize: st.size };
        }
        return b;
      }),
    })),
  };
}
