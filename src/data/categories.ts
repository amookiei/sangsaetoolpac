import type { Platform, Category } from '../state/types';

export const PLATFORM_LABEL: Record<Platform, string> = {
  smartstore: '스마트스토어',
  wadiz: '와디즈',
};

export const CATEGORY_LABEL: Record<Category, string> = {
  food: '푸드',
  tech: '테크',
  life: '라이프',
  beauty: '뷰티',
  serviceai: '서비스·AI',
};

export const CATEGORIES: Category[] = ['food', 'tech', 'life', 'beauty', 'serviceai'];
export const PLATFORMS: Platform[] = ['smartstore', 'wadiz'];

/** 플랫폼별 권장 가로폭 (px) — 추출 시 기준 폭 */
export const PLATFORM_WIDTH: Record<Platform, number> = {
  smartstore: 860,
  wadiz: 1000,
};

/** 카테고리별 기본 무드 팔레트 (AI 플레이스홀더·배경 추천에 사용) */
export const CATEGORY_PALETTE: Record<Category, [string, string]> = {
  food: ['#ff9a56', '#ff5e62'],
  tech: ['#4f6df5', '#23b5d3'],
  life: ['#7ec8a9', '#f6e7b4'],
  beauty: ['#f5b3c8', '#c89af0'],
  serviceai: ['#8b5cf6', '#3b82f6'],
};
