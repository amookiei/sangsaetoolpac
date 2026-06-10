# 상세 스튜디오 (sangsaetoolpac)

레퍼런스를 학습해 **스마트스토어 / 와디즈 상세페이지**를 7단계로 만들어 주는
Canva 스타일 디자인 툴.

## 실행

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # 프로덕션 빌드
```

**로그인(개발용)**: 아이디 `adminadmin` / 비밀번호 `adminadmin`
→ 관리자 권한으로 "스타일 학습" 메뉴가 열립니다.
운영 배포 시 Supabase Auth로 교체하세요 → [docs/DATABASE.md](docs/DATABASE.md)

## 제작 7단계

| 단계 | 내용 |
|---|---|
| 1. 기획안 & 옴니버스 | PPT/PDF/TXT 기획안 업로드 + 옴니버스 자산(제품·패키지·캐릭터·인물) 등록 → 제품 특징(키워드) 학습 |
| 2. 구조 설계 | 플랫폼×카테고리 표준 흐름 자동 제안 (스마트스토어: 인트로→리뷰→메인→특징→인증→배송 / 와디즈: 타이포 인트로→문제제기→해결→특징→비교→메이커 스토리→리워드→FAQ) — 수정·재정렬 가능 |
| 3. 후킹멘트 | 직설형/호기심형/감성형 3종 제안 + 직접 입력 |
| 4. 상세 기획안 | 섹션별 카피 자동 작성, 이미지 들어갈 자리는 **파란 글씨 묘사**로 표시 |
| 5. 디자인 에디터 | 이미지 업로드, 폰트(기본 11종 + ttf/otf/woff 업로드, 전체 일괄 적용), 폰트 배경(형광펜), 와디즈식 **타이포 애니메이션 프리셋 20종** |
| 6. AI 이미지 생성 | 빈 이미지 블록을 맥락 프롬프트로 생성. 무료 테스트 모드(0원) / Gemini 나노바나나(추천) / OpenAI — 옴니버스 자산이 프롬프트·레퍼런스로 자동 첨부되어 일관성 유지 |
| 7. 추출 | 섹션별 **피그마 편집 가능한 SVG** / 고해상 PNG 추출, 장당 10MB 용량 체크, 타이포 애니메이션 SVG 포함 옵션 |

## 관리자 스타일 학습

상단 "스타일 학습 (관리자)" → 스마트스토어/와디즈 × 푸드·테크·라이프·뷰티·서비스AI
5개 카테고리 버킷에 레퍼런스 SVG/PNG 업로드 + 스타일 메모. 구조 추천과 AI 프롬프트에
반영됩니다. (임베딩 검색 기반 고도화 로드맵: docs/DATABASE.md 6장)

## 외부 연동 (환경변수)

`.env.example` 참고. 모두 선택사항 — 없으면 로컬 모드로 동작합니다.

| 변수 | 용도 | 발급처 |
|---|---|---|
| `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` | 외부 DB + 이메일 로그인 (클라우드 모드) | supabase.com → Settings → API |
| `VITE_ADMIN_EMAIL` | 클라우드 모드 관리자 이메일 | — |
| `VITE_GEMINI_KEY` | AI 이미지 생성·본문 번역 기본 키 | aistudio.google.com (무료) |
| `OPENAI_API_KEY` | gpt-image-1 서버 프록시(`/api/openai-image`) | platform.openai.com (유료) |

Supabase 테이블 생성: `supabase/schema.sql`을 SQL Editor에서 실행 → 상세 절차는
[docs/DATABASE.md](docs/DATABASE.md) 체크리스트 참고.

## 배포 (Vercel)

`vercel.json`이 포함되어 있어 별도 설정 없이 배포됩니다.

1. <https://vercel.com> → **Add New → Project** → GitHub에서 `sangsaetoolpac` 저장소 Import
2. Framework가 **Vite**로 자동 인식됨 (Build: `npm run build`, Output: `dist`) → **Deploy**
3. 이후 `main`에 머지될 때마다 자동 배포, PR 브랜치는 Preview URL 생성

추후 Supabase 연동 시 Vercel 대시보드 → Settings → Environment Variables에
`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`를 추가하세요.
Gemini/OpenAI 키는 앱 안에서 입력하므로 환경변수가 필요 없습니다.

## 문서

- [docs/DATABASE.md](docs/DATABASE.md) — 외부 DB(Supabase) 연동: 스키마 SQL, Storage, Auth 교체, RLS
- [docs/AI_IMAGE_API.md](docs/AI_IMAGE_API.md) — 나노바나나 vs GPT 비교·추천, 비용, 프록시 예시

## 기술 구성

- React 19 + TypeScript + Vite, zustand(상태) + IndexedDB(영속)
- 추출: 공용 레이아웃 엔진(`src/utils/layout.ts`) → SVG 직렬화(피그마 호환) & 캔버스 PNG(2x)
- 타이포 애니메이션: CSS 키프레임 20종 (`src/data/typoAnimations.ts`) — 미리보기와 SVG 추출 공용
