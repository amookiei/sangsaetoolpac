/**
 * 와디즈 타이포 GIF 스타일 애니메이션 프리셋 20종.
 * 레퍼런스 이미지(추천 11종 + 일반 9종) 기준.
 * mode: 'char' = 글자별 stagger 적용, 'block' = 블록 전체에 적용
 */
export interface TypoAnim {
  id: string;
  label: string;
  group: '추천' | '일반';
  mode: 'char' | 'block';
  stagger: number; // 글자별 지연(초)
  duration: number;
}

export const TYPO_ANIMS: TypoAnim[] = [
  { id: 'typewriter', label: '타자기', group: '추천', mode: 'char', stagger: 0.12, duration: 0.01 },
  { id: 'riseup', label: '올라오기', group: '추천', mode: 'char', stagger: 0.06, duration: 0.5 },
  { id: 'dropdown', label: '내려오기', group: '추천', mode: 'char', stagger: 0.06, duration: 0.5 },
  { id: 'merge', label: '합쳐주기', group: '추천', mode: 'block', stagger: 0, duration: 0.8 },
  { id: 'blockwipe', label: '블록 쓸기', group: '추천', mode: 'block', stagger: 0, duration: 1.0 },
  { id: 'burst', label: '터트리기', group: '추천', mode: 'char', stagger: 0.05, duration: 0.45 },
  { id: 'bounce', label: '튀기기', group: '추천', mode: 'char', stagger: 0.07, duration: 0.6 },
  { id: 'fall', label: '떨어지기', group: '추천', mode: 'char', stagger: 0.08, duration: 0.55 },
  { id: 'skate', label: '스케이트', group: '추천', mode: 'char', stagger: 0.06, duration: 0.5 },
  { id: 'spread', label: '퍼트리기', group: '추천', mode: 'block', stagger: 0, duration: 0.9 },
  { id: 'sharpen', label: '또렷하게', group: '추천', mode: 'block', stagger: 0, duration: 0.9 },
  { id: 'floatup', label: '떠오르기', group: '일반', mode: 'block', stagger: 0, duration: 0.8 },
  { id: 'panorama', label: '파노라마', group: '일반', mode: 'block', stagger: 0, duration: 1.0 },
  { id: 'appear', label: '나타내기', group: '일반', mode: 'block', stagger: 0, duration: 0.8 },
  { id: 'springpop', label: '튕겨주기', group: '일반', mode: 'block', stagger: 0, duration: 0.6 },
  { id: 'wipeclean', label: '닦아내기', group: '일반', mode: 'block', stagger: 0, duration: 0.9 },
  { id: 'blurfade', label: '흐리기 (페이드아웃)', group: '일반', mode: 'block', stagger: 0, duration: 1.2 },
  { id: 'chain', label: '연쇄', group: '일반', mode: 'char', stagger: 0.12, duration: 0.4 },
  { id: 'unfold', label: '풀어주기', group: '일반', mode: 'block', stagger: 0, duration: 0.8 },
  { id: 'blockgen', label: '블록 생성', group: '일반', mode: 'char', stagger: 0.1, duration: 0.5 },
];

export const animById = (id: string | null) => TYPO_ANIMS.find((a) => a.id === id) ?? null;

/**
 * 애니메이션 키프레임 CSS. 미리보기(HTML)와 애니메이션 SVG 추출에 공통 사용.
 * 모든 프리셋은 2.4초 주기로 반복 재생되어 GIF 느낌을 냄.
 */
export const TYPO_KEYFRAMES_CSS = `
@keyframes ta-typewriter { from { opacity: 0; } to { opacity: 1; } }
@keyframes ta-riseup { from { opacity: 0; transform: translateY(0.6em); } to { opacity: 1; transform: translateY(0); } }
@keyframes ta-dropdown { from { opacity: 0; transform: translateY(-0.6em); } to { opacity: 1; transform: translateY(0); } }
@keyframes ta-merge { from { opacity: 0; letter-spacing: 0.6em; } to { opacity: 1; letter-spacing: normal; } }
@keyframes ta-blockwipe { from { clip-path: inset(0 100% 0 0); } to { clip-path: inset(0 0 0 0); } }
@keyframes ta-burst { 0% { opacity: 0; transform: scale(1.8); } 70% { opacity: 1; transform: scale(0.95); } 100% { opacity: 1; transform: scale(1); } }
@keyframes ta-bounce { 0% { opacity: 0; transform: translateY(-0.9em); } 55% { opacity: 1; transform: translateY(0.15em); } 75% { transform: translateY(-0.08em); } 100% { opacity: 1; transform: translateY(0); } }
@keyframes ta-fall { 0% { opacity: 0; transform: translateY(-1.2em) rotate(8deg); } 70% { opacity: 1; transform: translateY(0.08em) rotate(-2deg); } 100% { opacity: 1; transform: translateY(0) rotate(0); } }
@keyframes ta-skate { from { opacity: 0; transform: translateX(-0.9em) skewX(-14deg); } to { opacity: 1; transform: translateX(0) skewX(0); } }
@keyframes ta-spread { from { opacity: 0; letter-spacing: -0.25em; filter: blur(2px); } to { opacity: 1; letter-spacing: 0.05em; filter: blur(0); } }
@keyframes ta-sharpen { from { opacity: 0.2; filter: blur(10px); } to { opacity: 1; filter: blur(0); } }
@keyframes ta-floatup { from { opacity: 0; transform: translateY(36px); } to { opacity: 1; transform: translateY(0); } }
@keyframes ta-panorama { from { clip-path: inset(0 100% 0 0); transform: translateX(-12px); } to { clip-path: inset(0 0 0 0); transform: translateX(0); } }
@keyframes ta-appear { from { opacity: 0; } to { opacity: 1; } }
@keyframes ta-springpop { 0% { opacity: 0; transform: scale(0.4); } 65% { opacity: 1; transform: scale(1.12); } 100% { opacity: 1; transform: scale(1); } }
@keyframes ta-wipeclean { from { clip-path: inset(0 0 0 100%); opacity: 0.4; } to { clip-path: inset(0 0 0 0); opacity: 1; } }
@keyframes ta-blurfade { 0% { opacity: 0; filter: blur(8px); } 35% { opacity: 1; filter: blur(0); } 75% { opacity: 1; filter: blur(0); } 100% { opacity: 0; filter: blur(8px); } }
@keyframes ta-chain { 0% { opacity: 0; transform: scale(0); } 70% { opacity: 1; transform: scale(1.25); } 100% { opacity: 1; transform: scale(1); } }
@keyframes ta-unfold { from { opacity: 0; transform: scaleX(0.2); filter: blur(4px); } to { opacity: 1; transform: scaleX(1); filter: blur(0); } }
@keyframes ta-blockgen { 0% { opacity: 0; background-color: #8b5cf6; color: transparent; } 60% { opacity: 1; background-color: #8b5cf6; color: transparent; } 100% { opacity: 1; } }
`;
