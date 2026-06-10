export type Platform = 'smartstore' | 'wadiz';
export type Category = 'food' | 'tech' | 'life' | 'beauty' | 'serviceai';

/** 관리자 스타일 학습용 레퍼런스 자산 (SVG/PNG) */
export interface RefAsset {
  id: string;
  platform: Platform;
  category: Category;
  name: string;
  dataUrl: string;
  mime: string;
  note: string;
  createdAt: number;
}

/** 옴니버스 자산 — 제품/패키지/캐릭터/인물이 항상 일관되게 나오도록 하는 앵커 */
export type OmniRole = 'product' | 'package' | 'character' | 'model' | 'logo';
export interface OmniAsset {
  id: string;
  name: string;
  role: OmniRole;
  dataUrl: string | null;
  description: string; // 모든 이미지 생성 프롬프트에 자동 삽입되는 일관성 설명
}

export type BlockKind = 'heading' | 'body' | 'image';

export interface Block {
  id: string;
  kind: BlockKind;
  text: string;
  imageDesc: string; // 파란 글씨로 표시되는 이미지 묘사 (기획안 단계)
  imageDataUrl: string | null;
  imgW: number;
  imgH: number;
  font: string;
  fontSize: number;
  color: string;
  highlight: string | null; // 폰트 배경(형광펜) 색
  align: 'left' | 'center' | 'right';
  bold: boolean;
  animation: string | null; // 타이포 애니메이션 프리셋 id
  cardBg?: string | null; // 블록 전체 카드 배경 (리뷰 카드·쿠폰 등 템플릿용)
}

/** 디자인 스타일 가이드 — 에디터에서 정립 후 전체 섹션에 일괄 적용 */
export interface StyleGuide {
  headingFont: string;
  headingColor: string;
  headingBold: boolean;
  emphasisColor: string; // 강조 문구 색
  emphasisHighlight: string | null; // 강조 문구 형광펜 배경
  bodyFont: string;
  bodyColor: string;
  bodySize: number;
  numberColor: string; // 숫자/지표 강조 색
  pageBg: string; // 섹션 기본 배경
  cardBg: string; // 카드 블록 기본 배경
}

export interface Section {
  id: string;
  name: string;
  purpose: string;
  bg: string;
  blocks: Block[];
}

export interface StructureItem {
  name: string;
  purpose: string;
}

export interface Project {
  id: string;
  name: string;
  platform: Platform;
  category: Category;
  createdAt: number;
  step: number; // 1~7
  briefText: string;
  briefFiles: { name: string; size: number }[];
  keywords: string[];
  omni: OmniAsset[];
  structure: StructureItem[];
  hookOptions: string[];
  hookSelected: string;
  sections: Section[];
  globalFont: string;
  styleGuide?: StyleGuide; // 미설정(기존 프로젝트)이면 기본값 사용
}

export interface CustomFont {
  id: string;
  family: string;
  dataUrl: string;
}

export type AiProvider = 'gemini' | 'openai';
export interface AiConfig {
  provider: AiProvider;
  geminiKey: string;
  openaiKey: string;
  freeMode: boolean; // 무료 테스트 모드 (로컬 플레이스홀더 생성)
}
