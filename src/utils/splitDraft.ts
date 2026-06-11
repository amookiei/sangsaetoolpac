/**
 * 외부에서 작성해 온 기획안을 문단별로 쪼개 페이지(섹션) 데이터로 변환 — API 비용 0원.
 * 규칙:
 *  - 빈 줄(엔터 2번)이 문단 = 페이지 구분 기준
 *  - 문단 첫 줄이 30자 이하면 헤드라인으로 사용 (마크다운 #, 번호., - 글머리 제거)
 *  - "[이미지] ...", "(사진) ..." 처럼 이미지/사진/컷 표시가 있는 줄은 파란 이미지 묘사로 분리
 */
export interface DraftChunk {
  name: string; // 섹션 이름 (구조 리스트용)
  heading: string;
  body: string;
  imageDesc: string;
}

const IMG_LINE = /^[[(【]?\s*(이미지|사진|컷|비주얼|img|image|gif)\s*[\])】:]/i;

export function splitDraft(text: string): DraftChunk[] {
  const chunks = text
    .replace(/\r/g, '')
    .split(/\n\s*\n+/)
    .map((c) => c.trim())
    .filter(Boolean);

  return chunks.map((chunk, i) => {
    const lines = chunk.split('\n').map((l) => l.trim()).filter(Boolean);

    const imgLines: string[] = [];
    const textLines: string[] = [];
    for (const l of lines) {
      if (IMG_LINE.test(l)) imgLines.push(l);
      else textLines.push(l);
    }

    let heading = '';
    let bodyLines = textLines;
    if (textLines.length > 0) {
      const first = textLines[0].replace(/^#+\s*|^\d+[.)]\s*|^[-•·]\s*/, '').trim();
      if (first.length <= 30) {
        heading = first;
        bodyLines = textLines.slice(1);
      }
    }

    return {
      name: heading ? heading.slice(0, 18) : `페이지 ${i + 1}`,
      heading,
      body: bodyLines.join('\n'),
      imageDesc:
        imgLines.join('\n') ||
        `[이미지] "${heading || `페이지 ${i + 1}`}" 내용에 어울리는 컷 — 직접 업로드하거나 6단계에서 AI 생성`,
    };
  });
}
