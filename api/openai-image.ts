/**
 * OpenAI 이미지 생성 프록시 (Vercel Edge Function).
 * 브라우저에서 OpenAI를 직접 호출하면 CORS로 막히고 키가 노출되므로
 * 서버에서 OPENAI_API_KEY 환경변수로 대신 호출한다.
 * Vercel 대시보드 → Settings → Environment Variables → OPENAI_API_KEY 설정 필요.
 */
export const config = { runtime: 'edge' };

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'POST만 지원합니다.' }), { status: 405 });
  }
  const key = process.env.OPENAI_API_KEY;
  if (!key) {
    return new Response(
      JSON.stringify({ error: 'Vercel 환경변수 OPENAI_API_KEY가 설정되지 않았습니다.' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    );
  }
  const { prompt, size } = (await req.json()) as { prompt?: string; size?: string };
  if (!prompt) {
    return new Response(JSON.stringify({ error: 'prompt가 필요합니다.' }), { status: 400 });
  }
  const r = await fetch('https://api.openai.com/v1/images/generations', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
    body: JSON.stringify({ model: 'gpt-image-1', prompt, size: size ?? '1024x1024' }),
  });
  return new Response(await r.text(), {
    status: r.status,
    headers: { 'Content-Type': 'application/json' },
  });
}
