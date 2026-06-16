import type { Section } from '../state/types';

/**
 * 무료 번역 엔진 (API 비용 0원).
 * 1순위: Google 무료 번역 엔드포인트(translate.googleapis.com/translate_a/single) —
 *        브라우저에서 직접 호출 가능, 키 불필요. 비공식이지만 위젯이 쓰는 공개 엔드포인트.
 * 폴백: MyMemory(api.mymemory.translated.net) — CORS 허용, 무료(일일 한도 있음).
 * 결과는 원문을 덮어쓰지 않고 block.translations[lang]에 따로 저장한다(비파괴).
 */
export type TransLang = 'en' | 'ja' | 'zh';

const GOOGLE_CODE: Record<TransLang, string> = { en: 'en', ja: 'ja', zh: 'zh-CN' };
const MM_CODE: Record<TransLang, string> = { en: 'en-GB', ja: 'ja-JP', zh: 'zh-CN' };

async function viaGoogle(text: string, target: TransLang): Promise<string> {
  const url =
    'https://translate.googleapis.com/translate_a/single?client=gtx&sl=ko&tl=' +
    GOOGLE_CODE[target] +
    '&dt=t&q=' +
    encodeURIComponent(text);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`google ${res.status}`);
  const data = (await res.json()) as [Array<[string]>];
  if (!Array.isArray(data?.[0])) throw new Error('google parse');
  return data[0].map((seg) => seg[0]).join('');
}

async function viaMyMemory(text: string, target: TransLang): Promise<string> {
  const url =
    'https://api.mymemory.translated.net/get?q=' +
    encodeURIComponent(text) +
    '&langpair=' +
    encodeURIComponent(`ko|${MM_CODE[target]}`);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`mymemory ${res.status}`);
  const data = (await res.json()) as { responseData?: { translatedText?: string } };
  const out = data.responseData?.translatedText;
  if (!out) throw new Error('mymemory empty');
  return out;
}

/** 한 줄 번역 (구글 → 마이메모리 폴백) */
async function translateLine(text: string, target: TransLang): Promise<string> {
  if (!text.trim()) return text;
  try {
    return await viaGoogle(text, target);
  } catch {
    return await viaMyMemory(text, target);
  }
}

/** 블록 텍스트 번역 — 줄바꿈을 보존하기 위해 줄 단위로 번역 후 다시 합침 */
export async function translateBlockText(text: string, target: TransLang): Promise<string> {
  const lines = text.split('\n');
  const out = await Promise.all(lines.map((l) => translateLine(l, target)));
  return out.join('\n');
}

/** 섹션 1개를 번역해 각 텍스트 블록의 translations[target]를 채운 새 섹션 반환 (동시성 제한) */
export async function translateSectionFree(
  section: Section,
  target: TransLang,
  onProgress?: (done: number, total: number) => void,
): Promise<Section> {
  const blocks = section.blocks.map((b) => ({ ...b }));
  const jobs = blocks
    .map((b, i) => ({ b, i }))
    .filter(({ b }) => b.kind !== 'image' && b.text.trim());
  let done = 0;
  let cursor = 0;
  const POOL = 4;
  const worker = async () => {
    while (cursor < jobs.length) {
      const { b, i } = jobs[cursor++];
      try {
        const tr = await translateBlockText(b.text, target);
        blocks[i] = { ...b, translations: { ...b.translations, [target]: tr } };
      } catch {
        /* 실패한 블록은 원문 유지 */
      }
      done += 1;
      onProgress?.(done, jobs.length);
    }
  };
  await Promise.all(Array.from({ length: Math.min(POOL, jobs.length) }, worker));
  return { ...section, blocks };
}
