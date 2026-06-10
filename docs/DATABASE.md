# 외부 DB 연동 가이드 (Supabase 권장)

현재 앱은 **IndexedDB(브라우저 내장 DB)** 에 모든 데이터를 저장합니다.
(`src/state/idbStorage.ts`) — 설치 없이 바로 쓸 수 있지만, 기기 간 공유가 안 되고
브라우저 데이터를 지우면 사라집니다. 팀과 함께 쓰려면 외부 DB가 필요합니다.

## 왜 Supabase인가

| 항목 | Supabase | Firebase | 직접 구축(Postgres+API) |
|---|---|---|---|
| 무료 티어 | DB 500MB + 스토리지 1GB | 있음 | 서버비 발생 |
| 인증(Auth) | 내장 (이메일/비번) | 내장 | 직접 구현 |
| 이미지 스토리지 | 내장 (Storage) | 내장 | 직접 구현 |
| SQL | ✅ Postgres | ❌ NoSQL | ✅ |
| 프론트만으로 연동 | ✅ (RLS로 보안) | ✅ | ❌ 서버 필요 |

레퍼런스/프로젝트 데이터가 관계형(플랫폼×카테고리 버킷)이라 SQL이 자연스럽고,
무료로 시작할 수 있어 **Supabase를 권장**합니다.

## 1. 프로젝트 생성

1. <https://supabase.com> 가입 → New Project
2. Project Settings → API에서 `Project URL`과 `anon public key` 복사
3. 이 저장소 루트에 `.env.local` 생성:

```bash
VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
```

## 2. 테이블 스키마 (SQL Editor에 붙여넣기)

```sql
-- 관리자/사용자 계정은 Supabase Auth 사용 (아래 4번 참고)

-- 스타일 학습 레퍼런스
create table refs (
  id uuid primary key default gen_random_uuid(),
  platform text not null check (platform in ('smartstore','wadiz')),
  category text not null check (category in ('food','tech','life','beauty','serviceai')),
  name text not null,
  storage_path text not null,   -- Storage 버킷 내 파일 경로
  note text default '',
  created_by uuid references auth.users(id),
  created_at timestamptz default now()
);

-- 프로젝트 (구조/섹션/블록은 JSONB로 — 프론트 데이터 모델 그대로 저장)
create table projects (
  id uuid primary key default gen_random_uuid(),
  owner uuid references auth.users(id) not null,
  name text not null,
  platform text not null,
  category text not null,
  step int default 1,
  data jsonb not null default '{}',  -- briefText, keywords, omni, structure, hooks, sections
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 업로드 폰트
create table custom_fonts (
  id uuid primary key default gen_random_uuid(),
  owner uuid references auth.users(id) not null,
  family text not null,
  storage_path text not null,
  created_at timestamptz default now()
);

-- RLS (행 단위 보안) — 본인 데이터만 접근
alter table refs enable row level security;
alter table projects enable row level security;
alter table custom_fonts enable row level security;

create policy "refs: 로그인 사용자는 읽기" on refs for select to authenticated using (true);
create policy "refs: 관리자만 쓰기" on refs for all to authenticated
  using (auth.jwt() ->> 'email' = 'admin@example.com');  -- 관리자 이메일로 교체

create policy "projects: 본인만" on projects for all to authenticated
  using (owner = auth.uid()) with check (owner = auth.uid());
create policy "fonts: 본인만" on custom_fonts for all to authenticated
  using (owner = auth.uid()) with check (owner = auth.uid());
```

## 3. Storage 버킷

Storage → New bucket:

- `refs` (비공개) — 레퍼런스 SVG/PNG
- `assets` (비공개) — 옴니버스 이미지, 생성 이미지
- `fonts` (비공개) — 업로드 폰트

이미지는 dataURL이 아니라 Storage에 올리고 경로만 DB에 저장하세요
(JSONB에 dataURL을 넣으면 행 크기 제한과 비용 문제가 생깁니다).

## 4. 로그인 교체

현재 `src/state/store.ts`의 `login()`은 로컬 검증(adminadmin/adminadmin)입니다.
Supabase Auth로 교체:

```bash
npm install @supabase/supabase-js
```

```ts
// src/state/supabase.ts
import { createClient } from '@supabase/supabase-js';
export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY,
);

// store.ts의 login을 다음으로 교체
const { data, error } = await supabase.auth.signInWithPassword({ email, password });
```

관리자 구분은 Auth 대시보드에서 관리자 계정을 만들고, 위 RLS처럼 이메일(또는
`app_metadata.role`)로 판별하면 됩니다. **adminadmin 계정은 개발용이므로 배포 전
반드시 제거하세요.**

## 5. 저장소 어댑터 교체 지점

`src/state/store.ts`의 zustand `persist`가 `idbStorage`를 사용합니다.
같은 인터페이스(`getItem/setItem/removeItem`)로 Supabase 어댑터를 만들어
교체하거나, 단계별 저장 시점(`updateProject`)에 `projects` 테이블로 upsert하는
방식 둘 다 가능합니다. 후자가 충돌 관리에 유리합니다.

## 6. 스타일 "학습" 고도화 로드맵

현재는 레퍼런스 저장 + 메모를 프롬프트에 주입하는 방식입니다. 다음 단계:

1. **임베딩 검색**: 레퍼런스 이미지를 멀티모달 임베딩(예: Gemini embedding)으로
   벡터화 → Supabase `pgvector` 확장에 저장 → 기획안과 유사한 레퍼런스를 자동 선별해
   프롬프트에 첨부
2. **스타일 추출 파이프라인**: Edge Function에서 레퍼런스를 비전 모델로 분석해
   색상 팔레트/레이아웃 패턴/타이포 스타일을 JSON으로 추출, 구조 추천에 반영
