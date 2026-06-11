import type { AiConfig, Project, Section } from '../state/types';
import { buildSections, type SectionCopy } from '../data/draftGenerator';
import { CATEGORY_LABEL, PLATFORM_LABEL } from '../data/categories';
import { callCopyLLM, parseJsonLoose } from './copyLLM';

/**
 * AI 카피라이팅 — 기획안 전체를 읽고 상세페이지 문구를 작성한다.
 * 엔진은 copyLLM 라우터가 결정 (Claude 우선 → Gemini 폴백).
 * 엔진이 없으면 throw → 호출부에서 로컬 템플릿으로 폴백.
 */

function productContext(p: Project): string {
  const omni = p.omni
    .filter((o) => o.name || o.description)
    .map((o) => `- [${o.role}] ${o.name}: ${o.description}`)
    .join('\n');
  return [
    `플랫폼: ${PLATFORM_LABEL[p.platform]} (${p.platform === 'wadiz' ? '펀딩 설득형 — 문제제기와 메이커 서사 중심' : '구매 전환형 — 신뢰와 혜택 중심'})`,
    `카테고리: ${CATEGORY_LABEL[p.category]}`,
    `제품/서비스명: ${p.name}`,
    p.keywords.length ? `핵심 키워드: ${p.keywords.join(', ')}` : '',
    omni ? `일관성 자산(옴니버스):\n${omni}` : '',
    p.briefText ? `기획안 내용:\n${p.briefText.slice(0, 2400)}` : '',
  ]
    .filter(Boolean)
    .join('\n\n');
}

/** 후킹멘트 3종 (직설·혜택형 / 호기심·질문형 / 감성·스토리형) AI 생성 */
export async function generateAiHooks(p: Project, ai: AiConfig): Promise<string[]> {
  const prompt = [
    `당신은 한국 커머스 상세페이지 전문 카피라이터입니다.`,
    productContext(p),
    `위 제품의 상세페이지 첫 화면에 들어갈 후킹멘트를 3가지 스타일로 1개씩 작성하세요.`,
    `1번: 직설·혜택형 (제품이 주는 이득을 단호하게)`,
    `2번: 호기심·질문형 (궁금하게 만드는 질문/반전)`,
    `3번: 감성·스토리형 (장면이 그려지는 감성 문장)`,
    `규칙: 각 15~25자, 자연스러운 한국어 조사, 근거 없는 과장(1위, 최고 등) 금지, 제품명 활용 가능.`,
    `출력: ["멘트1","멘트2","멘트3"] JSON 배열만. 다른 텍스트 금지.`,
  ].join('\n\n');
  const raw = await callCopyLLM(prompt, ai);
  const arr = parseJsonLoose<string[]>(raw);
  if (!Array.isArray(arr) || arr.length < 3) throw new Error('후킹멘트 생성 결과가 올바르지 않습니다.');
  return arr.slice(0, 3).map(String);
}

/** 구조별 섹션 카피(헤드라인·본문·이미지 묘사) AI 생성 */
export async function generateAiSections(p: Project, ai: AiConfig): Promise<Section[]> {
  const structure = p.structure.map((s, i) => `${i + 1}. ${s.name} — ${s.purpose}`).join('\n');
  const prompt = [
    `당신은 한국 커머스 상세페이지 전문 카피라이터입니다.`,
    productContext(p),
    `선택된 후킹멘트: ${p.hookSelected || '(미선택 — 직접 작성)'}`,
    `아래 상세페이지 구조의 각 섹션에 들어갈 카피를 작성하세요.`,
    `구조 (${p.structure.length}개):\n${structure}`,
    [
      `규칙:`,
      `- heading: 임팩트 있는 한 줄 (8~20자). 1번 섹션(인트로)은 선택된 후킹멘트를 그대로 사용.`,
      `- body: 1~3문장. 줄바꿈은 \\n. 구체적인 제품 정보(기획안 근거) 반영. 어색한 조사 금지.`,
      `- imageDesc: 그 자리에 들어갈 이미지를 디자이너에게 지시하듯 구체적으로. "[컷 종류]"로 시작 (예: [제품 클로즈업], [비교표], [사용 장면컷]). 옴니버스 자산이 있으면 동일 외형 유지 지시 포함.`,
      `- 근거 없는 과장 표현(최고, 1위, 100% 등) 금지. 식품이면 효능 과장 금지.`,
    ].join('\n'),
    `출력: {"sections":[{"heading":"","body":"","imageDesc":""}, ...]} — 정확히 ${p.structure.length}개, JSON만. 다른 텍스트 금지.`,
  ].join('\n\n');

  const raw = await callCopyLLM(prompt, ai);
  const parsed = parseJsonLoose<{ sections?: SectionCopy[] }>(raw);
  const copies = parsed.sections;
  if (!Array.isArray(copies) || copies.length !== p.structure.length) {
    throw new Error(`AI가 ${copies?.length ?? 0}개 섹션을 반환했습니다 (구조는 ${p.structure.length}개) — 다시 시도해 주세요.`);
  }
  return buildSections(
    p,
    copies.map((c) => ({
      heading: String(c.heading ?? ''),
      body: String(c.body ?? ''),
      imageDesc: String(c.imageDesc ?? ''),
    })),
  );
}
