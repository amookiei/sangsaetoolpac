import type { AiConfig, Project, Section } from '../state/types';
import { callCopyLLM, parseJsonLoose } from './copyLLM';

export const CONTENT_LANGS = [
  { code: 'ko', label: '한국어' },
  { code: 'en', label: 'English' },
  { code: 'ja', label: '日本語' },
  { code: 'zh', label: '中文(简体)' },
] as const;
export type ContentLang = (typeof CONTENT_LANGS)[number]['code'];

/**
 * 상세페이지 본문(섹션 텍스트) AI 번역 — copyLLM 라우터 사용 (Claude 우선 → Gemini 폴백).
 * 커머스 카피 톤을 유지하도록 지시하고, 줄 단위 배열로 받아 원래 블록에 매핑한다.
 */
export async function translateSections(
  project: Project,
  target: ContentLang,
  ai: AiConfig,
): Promise<Section[]> {
  const texts: string[] = [];
  const slots: { sIdx: number; bIdx: number }[] = [];
  project.sections.forEach((s, sIdx) =>
    s.blocks.forEach((b, bIdx) => {
      if (b.kind !== 'image' && b.text.trim()) {
        texts.push(b.text);
        slots.push({ sIdx, bIdx });
      }
    }),
  );
  if (texts.length === 0) throw new Error('번역할 텍스트가 없습니다.');

  const langName = { ko: '한국어', en: '영어', ja: '일본어', zh: '중국어 간체' }[target];
  const prompt = [
    `다음은 커머스 상세페이지의 카피 문구 배열(JSON)입니다. 각 항목을 ${langName}로 번역하세요.`,
    `- 광고 카피의 톤과 임팩트를 유지하고, 직역보다 현지 커머스에서 자연스러운 표현을 쓰세요.`,
    `- 줄바꿈(\\n)은 그대로 유지하세요.`,
    `- 결과는 같은 길이의 JSON 문자열 배열만 출력하세요. 다른 텍스트 금지.`,
    JSON.stringify(texts),
  ].join('\n');

  const raw = await callCopyLLM(prompt, ai);
  const translated = parseJsonLoose<string[]>(raw);
  if (!Array.isArray(translated) || translated.length !== texts.length) {
    throw new Error('번역 결과 개수가 원문과 다릅니다 — 다시 시도해 주세요.');
  }

  const sections = project.sections.map((s) => ({ ...s, blocks: s.blocks.map((b) => ({ ...b })) }));
  slots.forEach(({ sIdx, bIdx }, i) => {
    sections[sIdx].blocks[bIdx].text = String(translated[i]);
    // 글자 인덱스가 바뀌므로 부분 스타일은 제거
    delete sections[sIdx].blocks[bIdx].runs;
  });
  return sections;
}
