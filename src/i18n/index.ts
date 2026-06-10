import { useStore, type Lang } from '../state/store';

/**
 * UI 다국어 (한/영/일/중).
 * 한국어 원문을 키로 사용 — 사전에 없는 문자열은 한국어로 폴백.
 * 생성되는 콘텐츠(카피·구조 템플릿)는 한국 커머스 플랫폼 대상이라 한국어 유지,
 * 필요 시 에디터의 'AI 본문 번역'으로 콘텐츠 자체를 번역할 수 있다.
 */
export const LANGS: { code: Lang; label: string }[] = [
  { code: 'ko', label: '한국어' },
  { code: 'en', label: 'English' },
  { code: 'ja', label: '日本語' },
  { code: 'zh', label: '中文' },
];

type Tr = { en: string; ja: string; zh: string };
const D: Record<string, Tr> = {
  // 공통
  '로그인': { en: 'Log in', ja: 'ログイン', zh: '登录' },
  '로그아웃': { en: 'Log out', ja: 'ログアウト', zh: '退出登录' },
  '아이디': { en: 'Username', ja: 'ID', zh: '账号' },
  '비밀번호': { en: 'Password', ja: 'パスワード', zh: '密码' },
  '홈': { en: 'Home', ja: 'ホーム', zh: '首页' },
  '스타일 학습 (관리자)': { en: 'Style Training (Admin)', ja: 'スタイル学習（管理者）', zh: '风格学习（管理员）' },
  '삭제': { en: 'Delete', ja: '削除', zh: '删除' },
  '닫기': { en: 'Close', ja: '閉じる', zh: '关闭' },
  '확인': { en: 'Confirm', ja: '確認', zh: '确认' },
  '상세 스튜디오': { en: 'Sangse Studio', ja: '詳細スタジオ', zh: '详情页工作室' },
  '아이디 또는 비밀번호가 올바르지 않습니다.': { en: 'Incorrect username or password.', ja: 'IDまたはパスワードが正しくありません。', zh: '账号或密码不正确。' },
  '레퍼런스를 학습해 상세페이지를 단계별로 만들어 드려요': { en: 'Learn from references and build product pages step by step', ja: 'リファレンスを学習し、商品ページを段階的に作成します', zh: '学习参考案例，逐步生成商品详情页' },

  // 대시보드
  '오늘은 어떤 상세페이지를 만들까요?': { en: 'What product page shall we make today?', ja: '今日はどんな商品ページを作りますか？', zh: '今天要制作什么样的详情页？' },
  '기획안을 넣으면 구조 설계부터 후킹멘트, 디자인, SVG/PNG 추출까지 7단계로 완성됩니다.': { en: 'Drop in your brief — structure, hooks, design, and SVG/PNG export in 7 steps.', ja: '企画案を入れると、構成設計からフックコピー、デザイン、SVG/PNG出力まで7ステップで完成。', zh: '导入策划案后，从结构设计到吸睛文案、设计、SVG/PNG导出，7步完成。' },
  '새 프로젝트 만들기': { en: 'New project', ja: '新規プロジェクト', zh: '新建项目' },
  '제품/서비스 이름': { en: 'Product / service name', ja: '製品・サービス名', zh: '产品/服务名称' },
  '플랫폼': { en: 'Platform', ja: 'プラットフォーム', zh: '平台' },
  '카테고리': { en: 'Category', ja: 'カテゴリー', zh: '类目' },
  '+ 만들기 시작': { en: '+ Start creating', ja: '+ 作成開始', zh: '+ 开始创建' },
  '내 프로젝트': { en: 'My projects', ja: 'マイプロジェクト', zh: '我的项目' },
  '아직 프로젝트가 없어요. 위에서 첫 프로젝트를 만들어 보세요!': { en: 'No projects yet — create your first one above!', ja: 'まだプロジェクトがありません。上から作成してみましょう！', zh: '还没有项目，从上方创建第一个吧！' },
  '단계': { en: 'steps', ja: 'ステップ', zh: '步骤' },
  '학습': { en: 'trained', ja: '学習', zh: '已学习' },

  // 플랫폼·카테고리
  '스마트스토어': { en: 'SmartStore', ja: 'スマートストア', zh: 'SmartStore' },
  '와디즈': { en: 'Wadiz', ja: 'Wadiz', zh: 'Wadiz' },
  '푸드': { en: 'Food', ja: 'フード', zh: '食品' },
  '테크': { en: 'Tech', ja: 'テック', zh: '科技' },
  '라이프': { en: 'Life', ja: 'ライフ', zh: '生活' },
  '뷰티': { en: 'Beauty', ja: 'ビューティー', zh: '美妆' },
  '서비스·AI': { en: 'Service · AI', ja: 'サービス・AI', zh: '服务·AI' },

  // 위저드
  '기획안 & 옴니버스': { en: 'Brief & Omniverse', ja: '企画案＆オムニバース', zh: '策划案＆全域资产' },
  '자료 업로드 · 제품 학습': { en: 'Upload · learn product', ja: '資料アップ・製品学習', zh: '上传资料·产品学习' },
  '구조 설계': { en: 'Structure', ja: '構成設計', zh: '结构设计' },
  '플랫폼별 흐름 구성': { en: 'Platform flow', ja: 'プラットフォーム別フロー', zh: '平台流程' },
  '후킹멘트': { en: 'Hook copy', ja: 'フックコピー', zh: '吸睛文案' },
  '3가지 스타일 제안': { en: '3 style options', ja: '3スタイル提案', zh: '3种风格方案' },
  '상세 기획안': { en: 'Page draft', ja: '詳細企画案', zh: '详细策划案' },
  '카피 + 이미지 묘사': { en: 'Copy + image notes', ja: 'コピー＋画像説明', zh: '文案+图片描述' },
  '디자인 에디터': { en: 'Design editor', ja: 'デザインエディター', zh: '设计编辑器' },
  '폰트 · 이미지 · 모션': { en: 'Fonts · images · motion', ja: 'フォント・画像・モーション', zh: '字体·图片·动效' },
  'AI 이미지 생성': { en: 'AI image gen', ja: 'AI画像生成', zh: 'AI图片生成' },
  '빈 이미지 채우기': { en: 'Fill empty images', ja: '空画像を生成', zh: '填充空白图片' },
  '추출': { en: 'Export', ja: '出力', zh: '导出' },
  'SVG / PNG 내보내기': { en: 'SVG / PNG export', ja: 'SVG / PNG出力', zh: 'SVG / PNG导出' },
  '← 이전 단계': { en: '← Previous', ja: '← 前へ', zh: '← 上一步' },
  '다음 단계 →': { en: 'Next →', ja: '次へ →', zh: '下一步 →' },

  // 에디터
  '디자인 스타일 정립': { en: 'Define design style', ja: 'デザインスタイル設定', zh: '确立设计风格' },
  '섹션': { en: 'Sections', ja: 'セクション', zh: '版块' },
  '텍스트': { en: 'Text', ja: 'テキスト', zh: '文本' },
  '폰트': { en: 'Font', ja: 'フォント', zh: '字体' },
  '글자색': { en: 'Color', ja: '文字色', zh: '字色' },
  '섹션 배경색': { en: 'Section background', ja: 'セクション背景色', zh: '版块背景色' },
  '전체 폰트 한 번에 적용': { en: 'Apply font to all', ja: '全体フォント一括適用', zh: '全局应用字体' },
  '블록 삭제': { en: 'Delete block', ja: 'ブロック削除', zh: '删除块' },
  '본문 번역': { en: 'Translate content', ja: '本文翻訳', zh: '翻译正文' },

  // 다운로드 패널
  '다운로드': { en: 'Download', ja: 'ダウンロード', zh: '下载' },
  '파일 형식': { en: 'File format', ja: 'ファイル形式', zh: '文件格式' },
  '등록 플랫폼': { en: 'Target platform', ja: '掲載プラットフォーム', zh: '上架平台' },
  '페이지 선택': { en: 'Select pages', ja: 'ページ選択', zh: '选择页面' },
  '모든 페이지 선택': { en: 'Select all pages', ja: 'すべてのページを選択', zh: '全选页面' },
  '한 장의 이미지로 내보내기': { en: 'Export as a single image', ja: '1枚の画像として出力', zh: '导出为一张长图' },
  '출력 해상도': { en: 'Output resolution', ja: '出力解像度', zh: '输出分辨率' },
  '다운로드 정보': { en: 'Download info', ja: 'ダウンロード情報', zh: '下载信息' },
  '페이지': { en: 'pages', ja: 'ページ', zh: '页' },
  '가로 860px, G마켓 및 옥션 호환': { en: '860px wide · Gmarket & Auction compatible', ja: '横860px・Gマーケット/オークション対応', zh: '宽860px，兼容Gmarket和Auction' },
  '가로 780px, GIF 사용 불가': { en: '780px wide · GIF not supported', ja: '横780px・GIF使用不可', zh: '宽780px，不支持GIF' },
  '가로 1080px, 올웨이즈, 당근 호환': { en: '1080px wide · Always & Karrot compatible', ja: '横1080px・オールウェイズ/タングン対応', zh: '宽1080px，兼容Always和Karrot' },
  '가로 1000px, 펀딩 상세 기준': { en: '1000px wide · funding page standard', ja: '横1000px・ファンディング詳細基準', zh: '宽1000px，众筹详情页标准' },
  '네이버 스마트 스토어': { en: 'Naver SmartStore', ja: 'NAVERスマートストア', zh: 'Naver SmartStore' },
  '쿠팡': { en: 'Coupang', ja: 'クーパン', zh: 'Coupang' },
  '토스': { en: 'Toss', ja: 'トス', zh: 'Toss' },
};

export function useT() {
  const lang = useStore((s) => s.lang);
  return (ko: string): string => (lang === 'ko' ? ko : (D[ko]?.[lang] ?? ko));
}
