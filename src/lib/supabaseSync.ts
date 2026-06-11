import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { useStore } from '../state/store';
import type { Project, RefAsset } from '../state/types';

/**
 * Supabase 클라우드 연동 — 환경변수가 설정되면 자동 활성화.
 *   VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY : 필수
 *   VITE_ADMIN_EMAIL : 이 이메일로 로그인하면 관리자 모드
 * 미설정 시 로컬 모드(IndexedDB + adminadmin 계정)로 동작한다.
 * 스키마: supabase/schema.sql 참고.
 */
const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anon = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const supabase: SupabaseClient | null = url && anon ? createClient(url, anon) : null;
export const isCloud = () => supabase !== null;

export async function cloudLogin(
  email: string,
  pw: string,
): Promise<{ userId: string; isAdmin: boolean } | null> {
  if (!supabase) return null;
  const { data, error } = await supabase.auth.signInWithPassword({ email, password: pw });
  if (error || !data.user) return null;
  const adminEmail = (import.meta.env.VITE_ADMIN_EMAIL as string | undefined) ?? '';
  return {
    userId: data.user.email ?? data.user.id,
    isAdmin: !!adminEmail && data.user.email === adminEmail,
  };
}

export async function cloudLogout() {
  await supabase?.auth.signOut();
}

interface RefRow {
  id: string;
  platform: RefAsset['platform'];
  category: RefAsset['category'];
  name: string;
  data_url: string;
  mime: string | null;
  note: string | null;
  created_at: string;
}

async function pullAll(): Promise<{ projects: Project[]; refs: RefAsset[] }> {
  const [p, r] = await Promise.all([
    supabase!.from('projects').select('data'),
    supabase!.from('refs').select('*'),
  ]);
  if (p.error) throw new Error(`projects 조회 실패: ${p.error.message}`);
  if (r.error) throw new Error(`refs 조회 실패: ${r.error.message}`);
  return {
    projects: (p.data ?? []).map((row) => row.data as Project),
    refs: ((r.data ?? []) as RefRow[]).map((row) => ({
      id: row.id,
      platform: row.platform,
      category: row.category,
      name: row.name,
      dataUrl: row.data_url,
      mime: row.mime ?? '',
      note: row.note ?? '',
      createdAt: Date.parse(row.created_at),
    })),
  };
}

// ─── 변경분 push (디바운스) ───
const dirtyProjects = new Set<string>();
const deletedProjects = new Set<string>();
let refsDirty = false;
let prevRefIds: string[] = [];
let timer: ReturnType<typeof setTimeout> | null = null;
let started = false;

function schedule() {
  if (timer) clearTimeout(timer);
  timer = setTimeout(() => void flush(), 1500);
}

async function flush() {
  if (!supabase) return;
  const s = useStore.getState();
  const { data: u } = await supabase.auth.getUser();
  const owner = u.user?.id;
  if (!owner) return;

  for (const id of [...dirtyProjects]) {
    const p = s.projects.find((x) => x.id === id);
    if (!p) continue;
    const { error } = await supabase
      .from('projects')
      .upsert({ id: p.id, owner, name: p.name, data: p, updated_at: new Date().toISOString() });
    if (!error) dirtyProjects.delete(id);
    else console.warn('프로젝트 동기화 실패:', error.message);
  }
  for (const id of [...deletedProjects]) {
    const { error } = await supabase.from('projects').delete().eq('id', id);
    if (!error) deletedProjects.delete(id);
  }

  if (refsDirty && s.isAdmin) {
    for (const ref of s.refs) {
      await supabase.from('refs').upsert({
        id: ref.id,
        platform: ref.platform,
        category: ref.category,
        name: ref.name,
        data_url: ref.dataUrl,
        mime: ref.mime,
        note: ref.note,
      });
    }
    const currentIds = s.refs.map((x) => x.id);
    for (const oldId of prevRefIds) {
      if (!currentIds.includes(oldId)) await supabase.from('refs').delete().eq('id', oldId);
    }
    prevRefIds = currentIds;
    refsDirty = false;
  }
}

function startCloudPush() {
  if (!supabase || started) return;
  started = true;
  prevRefIds = useStore.getState().refs.map((r) => r.id);
  useStore.subscribe((s, prev) => {
    if (s.projects !== prev.projects) {
      for (const p of s.projects) {
        const old = prev.projects.find((o) => o.id === p.id);
        if (old !== p) dirtyProjects.add(p.id);
      }
      for (const o of prev.projects) {
        if (!s.projects.some((p) => p.id === o.id)) {
          deletedProjects.add(o.id);
          dirtyProjects.delete(o.id);
        }
      }
      schedule();
    }
    if (s.refs !== prev.refs) {
      refsDirty = true;
      schedule();
    }
  });
}

/** 중간 저장 — 디바운스를 기다리지 않고 즉시 클라우드에 push */
export async function flushCloudNow() {
  if (!supabase) return;
  const s = useStore.getState();
  for (const p of s.projects) dirtyProjects.add(p.id);
  if (s.isAdmin) refsDirty = true;
  await flush();
}

/** 로그인 직후 호출 — 클라우드 데이터 pull + 로컬 전용 데이터 push + 실시간 push 시작 */
export async function initialSync() {
  if (!supabase) return;
  const cloud = await pullAll();
  const s = useStore.getState();
  const localOnlyProjects = s.projects.filter((l) => !cloud.projects.some((c) => c.id === l.id));
  const localOnlyRefs = s.refs.filter((l) => !cloud.refs.some((c) => c.id === l.id));
  s.hydrateCloud(
    [...cloud.projects, ...localOnlyProjects],
    [...cloud.refs, ...localOnlyRefs],
  );
  startCloudPush();
  for (const p of localOnlyProjects) dirtyProjects.add(p.id);
  if (localOnlyRefs.length) refsDirty = true;
  if (localOnlyProjects.length || localOnlyRefs.length) schedule();
}
