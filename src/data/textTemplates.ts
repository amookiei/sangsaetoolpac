import type { Block, StyleGuide } from '../state/types';

/**
 * 텍스트 템플릿 라이브러리 — 레퍼런스(상세페이지 에디터들)의
 * 카피/리뷰 카드/이벤트·쿠폰/레이아웃/뱃지·씰/서비스 구성 요소를 블록 조합으로 제공.
 * 색상에 토큰을 쓰면 삽입 시 스타일 가이드 값으로 치환된다:
 *   $emphasis → emphasisColor, $number → numberColor, $card → cardBg
 */
export type TplBlock = Partial<Block> & { kind: 'heading' | 'body'; text: string };

export interface TextTemplate {
  id: string;
  group: string;
  label: string;
  preview: string; // 사이드바 미리보기 텍스트
  blocks: TplBlock[];
}

export const TEMPLATE_GROUPS = ['카피', '리뷰/Q&A', '이벤트/쿠폰', '레이아웃', '뱃지/씰', '서비스/기타'];

export const TEXT_TEMPLATES: TextTemplate[] = [
  // ─── 카피 ───
  {
    id: 'main-copy', group: '카피', label: '메인 카피', preview: '메인 카피 텍스트',
    blocks: [{ kind: 'heading', text: '메인 카피를 입력해 주세요', fontSize: 44, bold: true }],
  },
  {
    id: 'sub-copy', group: '카피', label: '서브 카피', preview: '서브 카피 텍스트',
    blocks: [{ kind: 'body', text: '서브 카피를 입력해 주세요', fontSize: 24, color: '#555566' }],
  },
  {
    id: 'body-copy', group: '카피', label: '본문', preview: '본문 텍스트',
    blocks: [{ kind: 'body', text: '본문 내용을 입력해 주세요.\n핵심만 간결하게 적어보세요.', fontSize: 18, color: '#666677' }],
  },
  // ─── 리뷰/Q&A ───
  {
    id: 'review-card', group: '리뷰/Q&A', label: '리뷰 카드', preview: '★★★★★ 리뷰',
    blocks: [
      { kind: 'body', text: '★★★★★', fontSize: 20, color: '#ffa726', bold: true, cardBg: '$card' },
      { kind: 'body', text: '“내용을 입력해 주세요. 정말 만족스러워요!”', fontSize: 17, color: '#333344', cardBg: '$card' },
      { kind: 'body', text: '네이버 구매평 · 김**님', fontSize: 13, color: '#999aab', cardBg: '$card' },
    ],
  },
  {
    id: 'qna', group: '리뷰/Q&A', label: 'Q&A', preview: 'Q. 질문 / A. 답변',
    blocks: [
      { kind: 'heading', text: 'Q. 질문을 입력해 주세요', fontSize: 20, bold: true, align: 'left' },
      { kind: 'body', text: 'A. 답변 내용을 입력해 주세요.', fontSize: 17, color: '#555566', align: 'left' },
    ],
  },
  {
    id: 'rating-summary', group: '리뷰/Q&A', label: '별점 요약', preview: '4.9 ★★★★★',
    blocks: [
      { kind: 'heading', text: '4.9', fontSize: 64, bold: true },
      { kind: 'body', text: '★★★★★  리뷰 1,234개', fontSize: 16, color: '#ffa726', bold: true },
    ],
  },
  // ─── 이벤트/쿠폰 ───
  {
    id: 'secret-coupon', group: '이벤트/쿠폰', label: '시크릿 쿠폰', preview: '2만원 중복 할인',
    blocks: [
      { kind: 'body', text: 'S E C R E T   C O U P O N', fontSize: 13, color: '#ffd9d0', bold: true, cardBg: '#ff6b52' },
      { kind: 'heading', text: '10만원 이상 결제 시\n2만원 중복 할인', fontSize: 26, color: '#ffffff', bold: true, cardBg: '#ff6b52' },
    ],
  },
  {
    id: 'percent-big', group: '이벤트/쿠폰', label: '00% 할인', preview: '00%',
    blocks: [
      { kind: 'heading', text: '00%', fontSize: 80, bold: true, color: '$number' },
      { kind: 'body', text: '(최대 00,000원 할인)', fontSize: 14, color: '#999aab' },
    ],
  },
  {
    id: 'benefit-01', group: '이벤트/쿠폰', label: '혜택 01', preview: '혜택 01',
    blocks: [
      { kind: 'body', text: '혜택', fontSize: 20, color: '#ffffff', bold: true, cardBg: '$number' },
      { kind: 'heading', text: '01', fontSize: 54, color: '#ffffff', bold: true, cardBg: '$number' },
    ],
  },
  {
    id: 'max-70', group: '이벤트/쿠폰', label: '최대 00%', preview: '최대 70%',
    blocks: [{ kind: 'heading', text: '최대 70%', fontSize: 40, color: '#ffffff', bold: true, cardBg: '#ffa372' }],
  },
  // ─── 레이아웃 ───
  {
    id: 'title-set', group: '레이아웃', label: '부제+제목+설명', preview: '제목을 입력해 주세요',
    blocks: [
      { kind: 'body', text: '부제목을 입력해 주세요.', fontSize: 16, color: '$emphasis', bold: true },
      { kind: 'heading', text: '제목을 입력해 주세요.', fontSize: 34, bold: true },
      { kind: 'body', text: '내용을 입력해 주세요.', fontSize: 16, color: '#777788' },
    ],
  },
  {
    id: 'title-band', group: '레이아웃', label: '강조 밴드 제목', preview: '제목 + 검정 밴드',
    blocks: [
      { kind: 'heading', text: '제목을 입력해 주세요.', fontSize: 40, bold: true },
      { kind: 'body', text: '내용을 입력해 주세요.', fontSize: 18, color: '#ffffff', highlight: '#1a1a2e' },
    ],
  },
  {
    id: 'checklist', group: '레이아웃', label: '체크 리스트', preview: '✓ 내용 입력',
    blocks: [
      {
        kind: 'body', align: 'left', fontSize: 18, color: '#333344',
        text: '✓  내용을 입력해 주세요.\n✓  내용을 입력해 주세요.\n✓  내용을 입력해 주세요.',
      },
    ],
  },
  {
    id: 'metrics', group: '레이아웃', label: '숫자 지표', preview: '000 · 000 · 000',
    blocks: [
      { kind: 'heading', text: '000  ·  000  ·  000', fontSize: 36, bold: true, color: '$emphasis' },
      { kind: 'body', text: '누적 판매      재구매율      만족도', fontSize: 14, color: '#999aab' },
    ],
  },
  // ─── 뱃지/씰 ───
  {
    id: 'point-badge', group: '뱃지/씰', label: 'POINT #01', preview: 'Point #01',
    blocks: [{ kind: 'heading', text: ' POINT #01 ', fontSize: 22, color: '#ffffff', highlight: '$number', bold: true }],
  },
  {
    id: 'quote', group: '뱃지/씰', label: '인용 말풍선', preview: '“ 내용 입력 ”',
    blocks: [
      { kind: 'heading', text: '“ 내용을 입력해 주세요 ”', fontSize: 24, bold: true, color: '#444455' },
      { kind: 'body', text: '- 고객 후기 중 -', fontSize: 14, color: '#999aab' },
    ],
  },
  {
    id: 'seal', group: '뱃지/씰', label: '공식 스토어 씰', preview: '★★★★★ 씰',
    blocks: [
      { kind: 'body', text: '★★★★★', fontSize: 16, color: '#c9a227', cardBg: '#fdf3f8' },
      { kind: 'heading', text: 'Official Brand', fontSize: 30, bold: true, cardBg: '#fdf3f8' },
      { kind: 'body', text: 'OFFICIAL ONLINE STORE', fontSize: 12, color: '#999aab', cardBg: '#fdf3f8' },
    ],
  },
  // ─── 서비스/기타 ───
  {
    id: 'cs-center', group: '서비스/기타', label: '고객센터', preview: '☎ 0000-0000',
    blocks: [
      { kind: 'body', text: ' 고객센터 ', fontSize: 14, color: '#ffffff', highlight: '#1a1a2e', bold: true, cardBg: '$card' },
      { kind: 'heading', text: '☎ 0000 - 0000', fontSize: 32, bold: true, cardBg: '$card' },
      { kind: 'body', text: '평일 오전 00:00 - 00:00 / 주말 및 공휴일 휴무', fontSize: 14, color: '#888899', cardBg: '$card' },
    ],
  },
  {
    id: 'open-hours', group: '서비스/기타', label: '운영시간', preview: '00:00 - 00:00',
    blocks: [
      { kind: 'body', text: ' 운영시간 ', fontSize: 14, color: '#ffffff', highlight: '#1a1a2e', bold: true, cardBg: '$card' },
      { kind: 'heading', text: '00 : 00  -  00 : 00', fontSize: 28, bold: true, cardBg: '$card' },
    ],
  },
  {
    id: 'product-info', group: '서비스/기타', label: '제품정보 표', preview: '제품명 / 용량 / 성분',
    blocks: [
      { kind: 'heading', text: '제품정보', fontSize: 18, bold: true, align: 'left', cardBg: '#fafafa' },
      {
        kind: 'body', align: 'left', fontSize: 15, color: '#555566', cardBg: '#fafafa',
        text: '제품명          내용을 입력해 주세요.\n용량             내용을 입력해 주세요.\n성분             내용을 입력해 주세요.\n제조사          내용을 입력해 주세요.\n반품/교환     내용을 입력해 주세요.',
      },
    ],
  },
  {
    id: 'shipping', group: '서비스/기타', label: '배송 안내', preview: '배송 안내',
    blocks: [
      { kind: 'heading', text: '배송 안내', fontSize: 20, bold: true },
      { kind: 'body', text: '결제 후 1~2일 내 출고 · CJ대한통운\n제주/도서산간 추가 배송비 0,000원', fontSize: 15, color: '#666677' },
    ],
  },
];

const uid = () => Math.random().toString(36).slice(2, 10);

/** 템플릿 → 실제 블록 변환 (스타일 가이드 토큰 치환 + 폰트 적용) */
export function instantiate(tpl: TextTemplate, font: string, guide: StyleGuide): Block[] {
  const token = (v: string | null | undefined): string | null => {
    if (!v) return null;
    if (v === '$emphasis') return guide.emphasisColor;
    if (v === '$number') return guide.numberColor;
    if (v === '$card') return guide.cardBg;
    return v;
  };
  return tpl.blocks.map((t) => ({
    id: uid(),
    kind: t.kind,
    text: t.text,
    imageDesc: '',
    imageDataUrl: null,
    imgW: 0,
    imgH: 0,
    font: t.font ?? font,
    fontSize: t.fontSize ?? 20,
    color: token(t.color) ?? '#222222',
    highlight: token(t.highlight),
    align: t.align ?? 'center',
    bold: t.bold ?? false,
    animation: null,
    cardBg: token(t.cardBg),
  }));
}
