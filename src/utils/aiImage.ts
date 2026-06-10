import type { AiConfig, Category, OmniAsset, Platform } from '../state/types';
import { CATEGORY_PALETTE, CATEGORY_LABEL, PLATFORM_LABEL } from '../data/categories';

/**
 * AI 이미지 생성 어댑터.
 * - 무료 테스트 모드: API 비용 0원 — 카테고리 무드 팔레트로 로컬 플레이스홀더 생성
 * - Gemini(나노바나나): gemini-2.5-flash-image — 옴니버스 레퍼런스 이미지를 함께 보내
 *   제품/캐릭터 일관성 유지 (이미지 입력 지원이 핵심)
 * - OpenAI(gpt-image-1): 브라우저 직접 호출은 CORS로 막힐 수 있음 → docs/AI_IMAGE_API.md 참고
 */

/** Vercel 환경변수 VITE_GEMINI_KEY가 있으면 키 미입력 시 기본값으로 사용 */
export const envGeminiKey = (import.meta.env.VITE_GEMINI_KEY as string | undefined) ?? '';
export const effectiveGeminiKey = (ai: AiConfig) => ai.geminiKey || envGeminiKey;

/** 옴니버스 자산 설명을 항상 프롬프트 앞에 고정 삽입해 일관성을 강제한다 */
export function buildPrompt(
  imageDesc: string,
  omni: OmniAsset[],
  platform: Platform,
  category: Category,
): string {
  const anchors = omni
    .filter((o) => o.description || o.dataUrl)
    .map((o) => `- [${o.role}] ${o.name}: ${o.description || '첨부 레퍼런스 이미지와 동일하게'}`)
    .join('\n');
  return [
    `한국 ${PLATFORM_LABEL[platform]} 상세페이지용 ${CATEGORY_LABEL[category]} 카테고리 커머스 이미지.`,
    anchors && `다음 자산은 반드시 첨부된 레퍼런스와 동일한 외형으로 일관되게 표현:\n${anchors}`,
    `장면 묘사: ${imageDesc.replace(/^\[.*?\]\s*/, '')}`,
    `스타일: 깔끔한 상업 사진/그래픽, 텍스트 없이, 고해상도, 상세페이지 톤.`,
  ]
    .filter(Boolean)
    .join('\n\n');
}

/** 무료 테스트 모드 — 캔버스로 무드 플레이스홀더 생성 (비용 0원) */
export function generatePlaceholder(desc: string, category: Category): string {
  const [c1, c2] = CATEGORY_PALETTE[category];
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 640;
  const c = canvas.getContext('2d')!;
  const g = c.createLinearGradient(0, 0, 1024, 640);
  g.addColorStop(0, c1);
  g.addColorStop(1, c2);
  c.fillStyle = g;
  c.fillRect(0, 0, 1024, 640);
  // 부드러운 빛 번짐
  for (let i = 0; i < 5; i++) {
    const rg = c.createRadialGradient(150 + i * 200, 100 + (i % 2) * 380, 10, 150 + i * 200, 100 + (i % 2) * 380, 220);
    rg.addColorStop(0, 'rgba(255,255,255,0.28)');
    rg.addColorStop(1, 'rgba(255,255,255,0)');
    c.fillStyle = rg;
    c.fillRect(0, 0, 1024, 640);
  }
  c.fillStyle = 'rgba(255,255,255,0.92)';
  c.font = '700 30px "Pretendard Variable", sans-serif';
  c.textAlign = 'center';
  const short = desc.replace(/^\[.*?\]\s*/, '').slice(0, 36);
  c.fillText('AI 생성 자리 (무료 테스트 모드)', 512, 290);
  c.font = '400 22px "Pretendard Variable", sans-serif';
  c.fillText(short + (desc.length > 36 ? '…' : ''), 512, 340);
  return canvas.toDataURL('image/png');
}

/** Gemini 나노바나나 호출 — 옴니버스 이미지를 함께 첨부해 일관성 유지 */
async function generateGemini(prompt: string, omni: OmniAsset[], key: string): Promise<string> {
  const parts: object[] = [{ text: prompt }];
  for (const o of omni) {
    if (o.dataUrl) {
      const [meta, b64] = o.dataUrl.split(',');
      const mime = meta.match(/data:(.*?);/)?.[1] ?? 'image/png';
      parts.push({ inline_data: { mime_type: mime, data: b64 } });
    }
  }
  const res = await fetch(
    'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
      body: JSON.stringify({ contents: [{ parts }] }),
    },
  );
  if (!res.ok) throw new Error(`Gemini API 오류 (${res.status}): ${(await res.text()).slice(0, 200)}`);
  const json = await res.json();
  const img = json.candidates?.[0]?.content?.parts?.find(
    (p: { inlineData?: { data: string } }) => p.inlineData,
  );
  if (!img) throw new Error('Gemini 응답에 이미지가 없습니다. 프롬프트를 조정해 보세요.');
  return `data:${img.inlineData.mimeType ?? 'image/png'};base64,${img.inlineData.data}`;
}

/**
 * OpenAI gpt-image-1 호출.
 * 키를 직접 입력했으면 브라우저에서 직접 호출(CORS 차단 가능),
 * 아니면 Vercel 서버리스 프록시(/api/openai-image, OPENAI_API_KEY 환경변수)를 사용.
 */
async function generateOpenAI(prompt: string, key: string): Promise<string> {
  const res = key
    ? await fetch('https://api.openai.com/v1/images/generations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
        body: JSON.stringify({ model: 'gpt-image-1', prompt, size: '1024x1024' }),
      })
    : await fetch('/api/openai-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, size: '1024x1024' }),
      });
  if (res.status === 404 && !key) {
    throw new Error(
      'OpenAI 프록시는 Vercel 배포에서만 동작합니다 — Vercel 환경변수 OPENAI_API_KEY를 설정하거나 키를 직접 입력하세요.',
    );
  }
  if (!res.ok) throw new Error(`OpenAI API 오류 (${res.status}): ${(await res.text()).slice(0, 200)}`);
  const json = await res.json();
  const b64 = json.data?.[0]?.b64_json;
  if (!b64) throw new Error('OpenAI 응답에 이미지가 없습니다.');
  return `data:image/png;base64,${b64}`;
}

export async function generateImage(
  desc: string,
  omni: OmniAsset[],
  platform: Platform,
  category: Category,
  ai: AiConfig,
): Promise<string> {
  if (ai.freeMode) return generatePlaceholder(desc, category);
  const prompt = buildPrompt(desc, omni, platform, category);
  if (ai.provider === 'gemini') {
    const key = effectiveGeminiKey(ai);
    if (!key) throw new Error('Gemini API 키를 입력해 주세요 (또는 Vercel에 VITE_GEMINI_KEY 설정).');
    return generateGemini(prompt, omni, key);
  }
  return generateOpenAI(prompt, ai.openaiKey);
}
