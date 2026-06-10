-- 상세 스튜디오 — Supabase 스키마
-- 사용법: Supabase 대시보드 → SQL Editor → 이 파일 전체 붙여넣고 Run
-- 마지막 줄의 admin@example.com 을 실제 관리자 이메일로 바꾸세요!

-- 프로젝트 (앱 데이터 모델 전체를 JSONB로 저장)
create table if not exists projects (
  id text primary key,                -- 앱에서 생성한 짧은 id 그대로 사용
  owner uuid not null references auth.users(id) on delete cascade,
  name text not null,
  data jsonb not null,
  updated_at timestamptz default now()
);

-- 스타일 학습 레퍼런스 (관리자가 업로드, 모든 사용자가 읽음)
create table if not exists refs (
  id text primary key,
  platform text not null check (platform in ('smartstore','wadiz')),
  category text not null check (category in ('food','tech','life','beauty','serviceai')),
  name text not null,
  data_url text not null,             -- v1: dataURL 직접 저장 (대량화되면 Storage로 이전)
  mime text,
  note text default '',
  created_at timestamptz default now()
);

-- 행 단위 보안 (RLS)
alter table projects enable row level security;
alter table refs enable row level security;

-- 프로젝트: 본인 것만 읽기/쓰기
drop policy if exists "projects_own" on projects;
create policy "projects_own" on projects
  for all to authenticated
  using (owner = auth.uid())
  with check (owner = auth.uid());

-- 레퍼런스: 로그인 사용자는 읽기, 관리자 이메일만 쓰기
drop policy if exists "refs_read" on refs;
create policy "refs_read" on refs
  for select to authenticated using (true);

drop policy if exists "refs_admin_write" on refs;
create policy "refs_admin_write" on refs
  for all to authenticated
  using (auth.jwt() ->> 'email' = 'admin@example.com')      -- ★ 관리자 이메일로 교체
  with check (auth.jwt() ->> 'email' = 'admin@example.com'); -- ★ 관리자 이메일로 교체
