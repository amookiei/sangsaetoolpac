# AI 이미지 생성 API 선택 가이드 — 나노바나나 vs GPT

## 결론 (추천)

**1순위: Gemini 나노바나나(`gemini-2.5-flash-image`)** — 이유:

1. **무료 테스트 가능**: Google AI Studio(aistudio.google.com)에서 무료 API 키 발급,
   무료 등급 내에서 테스트 가능 → "초반에 돈 안 들게" 조건 충족
2. **옴니버스(일관성)에 유리**: 레퍼런스 이미지를 입력으로 함께 보낼 수 있어
   제품/패키지/캐릭터를 동일하게 유지하는 멀티이미지 합성·캐릭터 일관성이 강점
3. **브라우저에서 바로 호출 가능**: CORS 제약 없이 프론트에서 직접 fetch 가능

**GPT(gpt-image-1)는**: 품질은 좋지만 무료 티어가 없고(장당 과금), 브라우저 직접
호출이 CORS로 막혀 서버 프록시가 필요합니다. 비용이 생겨도 괜찮아지는 시점에
비교 테스트용으로 추가하세요.

**0순위(앱 기본값): 무료 테스트 모드** — API 호출 없이 카테고리 무드 플레이스홀더를
로컬 생성(0원). 흐름 검증 단계에서는 이걸로 충분합니다.

## 비용 비교 (2026년 기준, 변동 가능 — 공식 가격 페이지 확인)

| | Gemini 나노바나나 | OpenAI gpt-image-1 |
|---|---|---|
| 무료 티어 | ✅ AI Studio 무료 키 | ❌ 없음 |
| 과금 | 이미지 출력 토큰 기준 (장당 약 $0.03~0.04) | 품질별 장당 약 $0.01~0.17 |
| 이미지 입력(일관성 레퍼런스) | ✅ | ✅ (edits 엔드포인트) |
| 브라우저 직접 호출 | ✅ | ❌ CORS — 프록시 필요 |
| 한국어 프롬프트 | 양호 | 양호 |

## GIF(타이포 모션)는?

두 API 모두 GIF 애니메이션 생성은 지원하지 않습니다. 이 앱에서는 와디즈식 타이포
GIF를 **타이포 애니메이션 프리셋 20종**(5단계 에디터)으로 만들고, 애니메이션 SVG로
추출합니다. 실제 GIF 파일이 필요하면 로드맵:

- 프론트에서 프레임 캡처 + [gif.js](https://github.com/jnordberg/gif.js)로 인코딩
- 또는 영상 생성 API(Veo, Kling 등)로 업그레이드 — 비용 높음, 후순위 권장

## OpenAI 프록시가 필요할 때 (Supabase Edge Function 예시)

```ts
// supabase/functions/gen-image/index.ts
Deno.serve(async (req) => {
  const { prompt } = await req.json();
  const r = await fetch('https://api.openai.com/v1/images/generations', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${Deno.env.get('OPENAI_API_KEY')}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ model: 'gpt-image-1', prompt, size: '1024x1024' }),
  });
  return new Response(await r.text(), {
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
  });
});
```

## 옴니버스 일관성이 동작하는 방식

`src/utils/aiImage.ts > buildPrompt()`가 모든 생성 요청에:

1. 1단계에서 등록한 옴니버스 자산의 **설명 텍스트**를 프롬프트 맨 앞에 고정 삽입
2. Gemini 호출 시 옴니버스 **기준 이미지를 함께 첨부** → "첨부 레퍼런스와 동일한
   외형" 지시

→ 미드저니 옴니레퍼런스(--oref)와 같은 효과를 API 레벨에서 재현합니다.
일관성이 떨어지면 옴니버스 설명을 더 구체적으로(색·재질·로고 위치) 적어주세요.
