import Anthropic from '@anthropic-ai/sdk';
import type { AiConfig } from '../state/types';
import { effectiveGeminiKey } from './aiImage';

/**
 * 카피라이팅·번역용 LLM 라우터 — Claude 우선, Gemini 폴백.
 * 호출 순서:
 *   1. 앱에 입력한 Claude 키 → 브라우저에서 SDK 직접 호출
 *   2. Vercel 프록시 /api/claude (서버 환경변수 ANTHROPIC_API_KEY — 권장, 키 노출 없음)
 *   3. Gemini 키 (폴백)
 * 모두 없으면 throw → 호출부에서 로컬 템플릿으로 폴백한다.
 */
export async function callCopyLLM(prompt: string, ai: AiConfig): Promise<string> {
  // 1. Claude 직접 호출 (개발·테스트용 — 운영은 프록시 권장)
  if (ai.claudeKey) {
    const client = new Anthropic({ apiKey: ai.claudeKey, dangerouslyAllowBrowser: true });
    const msg = await client.messages.create({
      model: 'claude-opus-4-8',
      max_tokens: 8000,
      messages: [{ role: 'user', content: prompt }],
    });
    if (msg.stop_reason === 'refusal') {
      throw new Error('Claude가 요청을 거절했습니다 — 프롬프트를 조정해 주세요.');
    }
    return msg.content
      .filter((b): b is Anthropic.TextBlock => b.type === 'text')
      .map((b) => b.text)
      .join('');
  }

  // 2. 서버 프록시 (배포 환경)
  try {
    const res = await fetch('/api/claude', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt }),
    });
    if (res.ok) {
      const { text } = (await res.json()) as { text: string };
      if (text) return text;
    } else if (res.status !== 404 && res.status !== 405 && res.status !== 503) {
      // 프록시는 있는데 호출이 실패 — 폴백하지 말고 원인을 알려준다
      const body = (await res.json().catch(() => null)) as { error?: string } | null;
      throw new Error(body?.error ?? `Claude 프록시 오류 (${res.status})`);
    }
    // 404/405/503 → 프록시 미구성으로 보고 Gemini 폴백
  } catch (e) {
    if (e instanceof Error && !/fetch|network/i.test(e.message)) throw e;
    // 네트워크 단계 실패(로컬 dev 등) → 폴백 계속
  }

  // 3. Gemini 폴백
  const gKey = effectiveGeminiKey(ai);
  if (gKey) {
    const res = await fetch(
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': gKey },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
      },
    );
    if (!res.ok) throw new Error(`Gemini API 오류 (${res.status}): ${(await res.text()).slice(0, 160)}`);
    const json = await res.json();
    const raw = json.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!raw) throw new Error('Gemini 응답이 비어 있습니다.');
    return raw;
  }

  throw new Error(
    'AI 카피 엔진이 연결돼 있지 않습니다 — Claude 키(6단계) 또는 Vercel 환경변수 ANTHROPIC_API_KEY를 설정하세요.',
  );
}

/** ```json 코드펜스를 벗겨내고 JSON 파싱 */
export function parseJsonLoose<T>(raw: string): T {
  const cleaned = raw
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/, '');
  const start = cleaned.search(/[[{]/);
  if (start === -1) throw new Error('AI 응답에서 JSON을 찾지 못했습니다.');
  return JSON.parse(cleaned.slice(start)) as T;
}
