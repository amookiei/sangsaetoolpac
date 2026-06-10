import type { Project, Section, Block, StructureItem } from '../state/types';
import { CATEGORY_LABEL } from './categories';
import { DEFAULT_FONT } from './fonts';

const uid = () => Math.random().toString(36).slice(2, 10);

/** 기획안 텍스트에서 핵심 키워드 추출 (간단 빈도 기반 — API 비용 0원) */
export function extractKeywords(text: string, max = 8): string[] {
  const stop = new Set([
    '있는', '있다', '하는', '한다', '합니다', '있습니다', '그리고', '하지만', '또한',
    '위한', '위해', '대한', '통해', '제품', '서비스', '경우', '때문', '정도', '이번',
    '것을', '것이', '수가', '에서', '으로', '까지', '부터', '저희', '우리', '고객',
  ]);
  const freq = new Map<string, number>();
  for (const raw of text.split(/[\s,./!?()[\]{}"'·~\-:;\n]+/)) {
    const w = raw.trim();
    if (w.length < 2 || w.length > 12 || stop.has(w) || /^\d+$/.test(w)) continue;
    freq.set(w, (freq.get(w) ?? 0) + 1);
  }
  return [...freq.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, max)
    .map(([w]) => w);
}

const pick = <T,>(arr: T[], seed: number) => arr[seed % arr.length];

/** 후킹멘트 3종 생성: 직설형 / 호기심형 / 감성형 */
export function generateHooks(p: Project, seed = 0): string[] {
  const name = p.name || '이 제품';
  const kw = p.keywords[0] ?? CATEGORY_LABEL[p.category];
  const kw2 = p.keywords[1] ?? '일상';

  if (p.platform === 'smartstore') {
    const direct = [
      `${kw} 고민, ${name} 하나로 끝.`,
      `${name}, 써본 사람만 아는 ${kw}의 차이.`,
      `리뷰가 증명하는 ${kw} — ${name}`,
    ];
    const curious = [
      `${kw2}이 달라졌다는 후기가 쏟아지는 이유?`,
      `왜 다들 ${name}(으)로 갈아탔을까요?`,
      `${kw}에 진심인 사람들이 ${name}을(를) 찾는 이유`,
    ];
    const emotional = [
      `당신의 ${kw2}에 ${name}을(를) 더하다.`,
      `매일의 ${kw2}, ${name}(이)가 조용히 바꿔드립니다.`,
      `오늘부터 ${kw}는 ${name}에게 맡기세요.`,
    ];
    return [pick(direct, seed), pick(curious, seed), pick(emotional, seed)];
  }

  const direct = [
    `아직도 ${kw} 때문에 불편하신가요? ${name}(이)가 바꿉니다.`,
    `${kw}의 기준을 다시 쓰다 — ${name}`,
    `우리가 ${name}을(를) 만들 수밖에 없었던 이유.`,
  ];
  const curious = [
    `오픈 전부터 알림 신청이 몰린 ${kw}의 정체는?`,
    `${kw2}을 바꾸는 단 하나의 ${kw}, 궁금하지 않으세요?`,
    `서포터들이 먼저 알아본 ${name}, 무엇이 다를까?`,
  ];
  const emotional = [
    `${kw2}의 마지막 조각, ${name}(으)로 완성하세요.`,
    `매일 마주하던 ${kw}의 불편함, 이제 안녕.`,
    `당신의 ${kw2}이 조금 더 가벼워지도록, ${name}.`,
  ];
  return [pick(direct, seed), pick(curious, seed), pick(emotional, seed)];
}

export const HOOK_STYLE_LABELS = ['직설·혜택형', '호기심·질문형', '감성·스토리형'];

function makeBlock(partial: Partial<Block>): Block {
  return {
    id: uid(),
    kind: 'body',
    text: '',
    imageDesc: '',
    imageDataUrl: null,
    imgW: 0,
    imgH: 0,
    font: DEFAULT_FONT,
    fontSize: 22,
    color: '#222222',
    highlight: null,
    align: 'center',
    bold: false,
    animation: null,
    ...partial,
  };
}

interface SectionCopy {
  heading: string;
  body: string;
  imageDesc: string;
}

/** 구조 항목 이름을 보고 섹션별 카피·이미지 묘사를 생성 */
function copyFor(item: StructureItem, p: Project, idx: number): SectionCopy {
  const name = p.name || '제품';
  const kw = p.keywords[idx % Math.max(p.keywords.length, 1)] ?? CATEGORY_LABEL[p.category];
  const hook = p.hookSelected || generateHooks(p)[0];
  const n = item.name;

  if (n.includes('인트로') || n.includes('타이포')) {
    return {
      heading: hook,
      body: '',
      imageDesc: `[타이포 모션 배경] ${name}의 메인 비주얼 — 제품이 중앙에 크게 배치되고 카피가 애니메이션으로 등장. 옴니버스 제품 이미지를 그대로 사용해 일관성 유지.`,
    };
  }
  if (n.includes('문제제기')) {
    return {
      heading: `혹시, 이런 적 없으셨나요?`,
      body: `${kw} 때문에 겪는 불편한 순간들.\n매번 반복되지만 마땅한 해결책이 없었습니다.`,
      imageDesc: `[공감 연출컷] 기존 방식의 불편함을 겪는 인물의 장면. 어두운 톤, 답답한 분위기. 옴니버스 인물 자산이 있다면 동일 인물로.`,
    };
  }
  if (n.includes('해결')) {
    return {
      heading: `그래서, ${name}(이)가 만들어졌습니다.`,
      body: `${kw}의 문제를 처음부터 다시 설계했습니다.\n이제 다른 방법을 찾지 않아도 됩니다.`,
      imageDesc: `[솔루션 히어로컷] 밝은 톤으로 전환 — ${name} 제품이 빛을 받으며 등장하는 컷. 옴니버스 제품 이미지 기준으로 동일한 패키지/형태 유지.`,
    };
  }
  if (n.includes('리뷰') || n.includes('사례') || n.includes('비포애프터')) {
    return {
      heading: `이미 써본 분들의 이야기`,
      body: `“${kw}이(가) 정말 달라졌어요. 재구매 의사 100%!”\n★★★★★ 만족도 4.9 / 5.0`,
      imageDesc: `[리뷰 카드 3장] 실제 후기 캡처 스타일의 카드 3개 나열. 별점·닉네임·날짜 포함, 밝은 배경.`,
    };
  }
  if (n.includes('메인 소개')) {
    return {
      heading: `${name}, 핵심만 담았습니다`,
      body: `${p.keywords.slice(0, 3).join(' · ') || kw}\n복잡한 건 빼고, 꼭 필요한 것만.`,
      imageDesc: `[제품 정면 메인컷] 깨끗한 단색 배경 위 ${name} 정면 컷 + 핵심 키워드 3개 아이콘 배지. 옴니버스 제품과 동일 형태.`,
    };
  }
  if (n.startsWith('특징')) {
    const num = n.match(/\d/)?.[0] ?? String(idx);
    return {
      heading: `POINT ${num}. ${n.split('·')[1]?.trim() ?? kw}`,
      body: `${kw}을(를) 위해 디테일까지 설계했습니다.\n직접 경험하면 차이가 느껴집니다.`,
      imageDesc: `[특징 연출컷] "${n}"을 보여주는 클로즈업/사용 장면. 제품은 옴니버스 자산과 동일하게, 배경은 카테고리 무드 팔레트.`,
    };
  }
  if (n.includes('비교') || n.includes('차별')) {
    return {
      heading: `같은 듯, 전혀 다릅니다`,
      body: `일반 제품 vs ${name}\n핵심 항목별로 비교해 보세요.`,
      imageDesc: `[비교표] 2열 비교 테이블 — 좌측 일반 제품(회색), 우측 ${name}(브랜드 컬러 강조). 체크/엑스 아이콘.`,
    };
  }
  if (n.includes('스펙') || n.includes('구성품') || n.includes('사이즈') || n.includes('전성분') || n.includes('요금')) {
    return {
      heading: n.replace(/&.*/, '').trim(),
      body: `상세 정보를 표로 한눈에 정리했습니다.`,
      imageDesc: `[정보 표 그래픽] ${n} 내용을 담은 깔끔한 표/도식. 표 선은 얇게, 헤더는 브랜드 컬러.`,
    };
  }
  if (n.includes('인증') || n.includes('보안')) {
    return {
      heading: `믿고 선택할 수 있도록`,
      body: `필요한 인증과 검증 절차를 모두 거쳤습니다.`,
      imageDesc: `[인증 배지 나열] 인증 마크/성적서 아이콘을 일렬 배치. 신뢰감 있는 네이비·골드 톤.`,
    };
  }
  if (n.includes('메이커')) {
    return {
      heading: `${name}을(를) 만든 사람들`,
      body: `작은 불편에서 시작한 고민이 여기까지 왔습니다.\n좋은 ${CATEGORY_LABEL[p.category]} 제품 하나가 일상을 바꾼다고 믿습니다.`,
      imageDesc: `[메이커 스토리컷] 작업실/제작 과정의 따뜻한 스냅 + 팀 사진. 필름 감성 톤.`,
    };
  }
  if (n.includes('리워드')) {
    return {
      heading: `지금이 가장 좋은 가격`,
      body: `슈퍼얼리버드 → 얼리버드 → 일반 순으로 마감됩니다.\n원하는 구성을 서둘러 선택하세요.`,
      imageDesc: `[리워드 카드] 구성별 가격 카드 3개 — 할인율 뱃지 강조, 추천 구성에 리본 표시.`,
    };
  }
  if (n.includes('배송') || n.includes('일정') || n.includes('보관') || n.includes('A/S') || n.includes('지원')) {
    return {
      heading: n,
      body: `결제 후 영업일 기준 2~3일 내 발송됩니다.\n보관/이용 안내를 꼭 확인해 주세요.`,
      imageDesc: `[안내 아이콘 도식] 배송 트럭·캘린더·박스 아이콘의 타임라인 도식. 라인 아이콘 스타일.`,
    };
  }
  if (n.includes('FAQ')) {
    return {
      heading: `자주 묻는 질문`,
      body: `Q. 교환/환불은 어떻게 하나요?\nA. 수령 후 7일 이내 고객센터로 문의해 주세요.`,
      imageDesc: `[FAQ 리스트] Q&A 아코디언 형태의 정리 그래픽 3~4개.`,
    };
  }
  return {
    heading: n,
    body: `${kw}에 대한 내용을 담는 섹션입니다.`,
    imageDesc: `[${n} 이미지] 섹션 내용에 어울리는 연출컷.`,
  };
}

const SECTION_BGS = ['#ffffff', '#faf9f5', '#ffffff', '#f5f3ec'];

/** 구조 + 후킹멘트 기반으로 섹션별 상세페이지 기획안 생성 */
export function generateSections(p: Project): Section[] {
  return p.structure.map((item, i) => {
    const c = copyFor(item, p, i);
    const isIntro = i === 0;
    const blocks: Block[] = [
      makeBlock({
        kind: 'heading',
        text: c.heading,
        fontSize: isIntro ? 44 : 32,
        bold: true,
        color: isIntro ? '#1a1a2e' : '#222222',
        animation: isIntro ? 'riseup' : null,
        font: p.globalFont,
      }),
    ];
    if (c.body) {
      blocks.push(
        makeBlock({ kind: 'body', text: c.body, fontSize: 20, color: '#555566', font: p.globalFont }),
      );
    }
    blocks.push(makeBlock({ kind: 'image', imageDesc: c.imageDesc }));
    return {
      id: uid(),
      name: item.name,
      purpose: item.purpose,
      bg: SECTION_BGS[i % SECTION_BGS.length],
      blocks,
    };
  });
}
