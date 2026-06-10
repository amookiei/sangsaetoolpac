/** 기본 제공 무료 한글 웹폰트 (index.html에서 로드) + 사용자 업로드 폰트 */
export interface FontDef {
  family: string;
  label: string;
  weightForHeading: number;
}

export const BUILTIN_FONTS: FontDef[] = [
  { family: 'Pretendard Variable', label: '프리텐다드', weightForHeading: 800 },
  { family: 'Noto Sans KR', label: '본고딕 (Noto Sans KR)', weightForHeading: 900 },
  { family: 'Nanum Gothic', label: '나눔고딕', weightForHeading: 800 },
  { family: 'Nanum Myeongjo', label: '나눔명조', weightForHeading: 800 },
  { family: 'Black Han Sans', label: '검은고딕 (Black Han Sans)', weightForHeading: 400 },
  { family: 'Do Hyeon', label: '도현체', weightForHeading: 400 },
  { family: 'Jua', label: '주아체', weightForHeading: 400 },
  { family: 'Gowun Dodum', label: '고운돋움', weightForHeading: 400 },
  { family: 'Gowun Batang', label: '고운바탕', weightForHeading: 700 },
  { family: 'IBM Plex Sans KR', label: 'IBM Plex Sans KR', weightForHeading: 700 },
  { family: 'Song Myung', label: '송명체', weightForHeading: 400 },
];

export const DEFAULT_FONT = 'Pretendard Variable';
