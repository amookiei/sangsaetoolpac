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

/** 카테고리별 기본 무드 팔레트 (AI 플레이스홀더·프로젝트 썸네일) — 차분한 어스 톤 */
export const CATEGORY_PALETTE: Record<Category, [string, string]> = {
  food: ['#e2a276', '#c97d52'],
  tech: ['#9fb0bf', '#71889c'],
  life: ['#b3c2a0', '#8da37e'],
  beauty: ['#dcb3bb', '#bd8a96'],
  serviceai: ['#b5a8c9', '#8e7dab'],
};
