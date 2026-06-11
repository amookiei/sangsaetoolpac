/**
 * Claude 카피라이팅 프록시 (Vercel Edge Function).
 * 브라우저에 키를 노출하지 않고 서버 환경변수 ANTHROPIC_API_KEY로 호출한다.
 * Vercel 대시보드 → Settings → Environment Variables → ANTHROPIC_API_KEY 설정.
 */
import Anthropic from '@anthropic-ai/sdk';

// Node.js 런타임 (Web 핸들러 시그니처) — Edge 번들러는 SDK의 node 내장 모듈을 처리하지 못함
export default async function handler(req: Request): Promise<Response> {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'POST만 지원합니다.' }), { status: 405 });
  }
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) {
    // 503 → 클라이언트가 '프록시 미구성'으로 보고 다른 엔진으로 폴백
    return new Response(
      JSON.stringify({ error: 'Vercel 환경변수 ANTHROPIC_API_KEY가 설정되지 않았습니다.' }),
      { status: 503, headers: { 'Content-Type': 'application/json' } },
    );
  }
  const { prompt, maxTokens } = (await req.json()) as { prompt?: string; maxTokens?: number };
  if (!prompt) {
    return new Response(JSON.stringify({ error: 'prompt가 필요합니다.' }), { status: 400 });
  }

  const client = new Anthropic({ apiKey: key });
  try {
    const msg = await client.messages.create({
      model: 'claude-opus-4-8',
      max_tokens: Math.min(maxTokens ?? 8000, 16000),
      messages: [{ role: 'user', content: prompt }],
    });
    if (msg.stop_reason === 'refusal') {
      return new Response(JSON.stringify({ error: 'Claude가 요청을 거절했습니다 — 프롬프트를 조정해 주세요.' }), {
        status: 422, headers: { 'Content-Type': 'application/json' },
      });
    }
    const text = msg.content
      .filter((b): b is Anthropic.TextBlock => b.type === 'text')
      .map((b) => b.text)
      .join('');
    return new Response(JSON.stringify({ text }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (e) {
    const status = e instanceof Anthropic.APIError ? (e.status ?? 500) : 500;
    const message = e instanceof Error ? e.message : 'Claude API 오류';
    return new Response(JSON.stringify({ error: message }), {
      status, headers: { 'Content-Type': 'application/json' },
    });
  }
}
