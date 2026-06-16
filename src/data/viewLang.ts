import type { Section } from '../state/types';

/** 미리보기·추출에 쓰는 표시 언어. 'ko'는 원문(번역 없음). */
export type ViewLang = 'ko' | 'en' | 'ja' | 'zh';

export const VIEW_LANGS: { code: ViewLang; label: string }[] = [
  { code: 'ko', label: '한국어' },
  { code: 'en', label: 'EN' },
  { code: 'ja', label: 'JA' },
  { code: 'zh', label: 'ZH' },
];

/**
 * 섹션을 표시 언어로 해석한다 (비파괴 — 원본은 그대로).
 * 번역본이 있으면 block.text를 번역으로 교체하고, 글자 인덱스가 달라지므로
 * 부분 스타일(runs)은 제거한다. 번역이 없으면 원문(한국어)으로 폴백.
 */
export function resolveSection(section: Section, lang: ViewLang): Section {
  if (lang === 'ko') return section;
  return {
    ...section,
    blocks: section.blocks.map((b) => {
      if (b.kind === 'image') return b;
      const tr = b.translations?.[lang];
      if (tr == null) return b;
      return { ...b, text: tr, runs: undefined };
    }),
  };
}

/** 해당 언어에서 번역이 비어 있는(원문 폴백) 텍스트 블록 수 */
export function untranslatedCount(section: Section, lang: ViewLang): number {
  if (lang === 'ko') return 0;
  return section.blocks.filter(
    (b) => b.kind !== 'image' && b.text.trim() && b.translations?.[lang] == null,
  ).length;
}
