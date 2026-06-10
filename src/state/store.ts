import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { idbStorage } from './idbStorage';
import { DEFAULT_FONT } from '../data/fonts';
import { STRUCTURES } from '../data/structures';
import type {
  Account, AiConfig, Category, CustomFont, Platform, Project, RefAsset, Section,
} from './types';

const uid = () => Math.random().toString(36).slice(2, 10);

/**
 * 로그인 계정 — 현재는 로컬 검증(관리자: adminadmin / adminadmin).
 * 운영 배포 시 Supabase Auth로 교체 → docs/DATABASE.md 가이드 참고.
 */
const ADMIN_ID = 'adminadmin';
const ADMIN_PW = 'adminadmin';

export type View = 'login' | 'dashboard' | 'admin' | 'wizard';
export type Lang = 'ko' | 'en' | 'ja' | 'zh';

interface AppState {
  // auth
  loggedIn: boolean;
  isAdmin: boolean;
  userId: string;
  login: (id: string, pw: string) => boolean;
  logout: () => void;
  /** Supabase 클라우드 로그인 성공 시 호출 */
  setAuth: (auth: { userId: string; isAdmin: boolean }) => void;
  /** 클라우드 pull 결과로 로컬 데이터 교체 */
  hydrateCloud: (projects: Project[], refs: RefAsset[]) => void;

  // routing
  view: View;
  setView: (v: View) => void;

  // UI 언어 (한/영/일/중)
  lang: Lang;
  setLang: (l: Lang) => void;

  // 계정 관리 (관리자가 생성, Gemini 키 사전 설정)
  accounts: Account[];
  addAccount: (a: Account) => void;
  updateAccount: (id: string, patch: Partial<Account>) => void;
  removeAccount: (id: string) => void;

  // 관리자 스타일 학습 데이터
  refs: RefAsset[];
  addRef: (r: Omit<RefAsset, 'id' | 'createdAt'>) => void;
  removeRef: (id: string) => void;
  updateRefNote: (id: string, note: string) => void;

  // 프로젝트
  projects: Project[];
  currentId: string | null;
  createProject: (name: string, platform: Platform, category: Category) => void;
  openProject: (id: string) => void;
  deleteProject: (id: string) => void;
  updateProject: (id: string, patch: Partial<Project>) => void;
  updateSection: (pid: string, sid: string, patch: Partial<Section>) => void;

  // 폰트 / AI 설정
  customFonts: CustomFont[];
  addCustomFont: (f: CustomFont) => void;
  ai: AiConfig;
  setAi: (patch: Partial<AiConfig>) => void;
}

export const useStore = create<AppState>()(
  persist(
    (set, get) => ({
      loggedIn: false,
      isAdmin: false,
      userId: '',
      login: (id, pw) => {
        if (id === ADMIN_ID && pw === ADMIN_PW) {
          set({ loggedIn: true, isAdmin: true, userId: id, view: 'dashboard' });
          return true;
        }
        const acct = get().accounts.find((a) => a.id === id && a.pw === pw);
        if (acct) {
          set({
            loggedIn: true,
            isAdmin: false,
            userId: id,
            view: 'dashboard',
            // 계정에 사전 설정된 Gemini 키 자동 적용
            ai: acct.geminiKey ? { ...get().ai, geminiKey: acct.geminiKey } : get().ai,
          });
          return true;
        }
        return false;
      },
      logout: () => set({ loggedIn: false, isAdmin: false, userId: '', view: 'login' }),
      setAuth: ({ userId, isAdmin }) =>
        set({ loggedIn: true, isAdmin, userId, view: 'dashboard' }),
      hydrateCloud: (projects, refs) => set({ projects, refs }),

      view: 'login',
      setView: (view) => set({ view }),

      lang: 'ko',
      setLang: (lang) => set({ lang }),

      accounts: [],
      addAccount: (a) => set({ accounts: [...get().accounts, a] }),
      updateAccount: (id, patch) =>
        set({ accounts: get().accounts.map((a) => (a.id === id ? { ...a, ...patch } : a)) }),
      removeAccount: (id) => set({ accounts: get().accounts.filter((a) => a.id !== id) }),

      refs: [],
      addRef: (r) => set({ refs: [...get().refs, { ...r, id: uid(), createdAt: Date.now() }] }),
      removeRef: (id) => set({ refs: get().refs.filter((r) => r.id !== id) }),
      updateRefNote: (id, note) =>
        set({ refs: get().refs.map((r) => (r.id === id ? { ...r, note } : r)) }),

      projects: [],
      currentId: null,
      createProject: (name, platform, category) => {
        const p: Project = {
          id: uid(),
          name,
          platform,
          category,
          createdAt: Date.now(),
          step: 1,
          briefText: '',
          briefFiles: [],
          keywords: [],
          omni: [],
          structure: STRUCTURES[platform][category].map((s) => ({ ...s })),
          hookOptions: [],
          hookSelected: '',
          sections: [],
          globalFont: DEFAULT_FONT,
        };
        set({ projects: [p, ...get().projects], currentId: p.id, view: 'wizard' });
      },
      openProject: (id) => set({ currentId: id, view: 'wizard' }),
      deleteProject: (id) =>
        set({
          projects: get().projects.filter((p) => p.id !== id),
          currentId: get().currentId === id ? null : get().currentId,
        }),
      updateProject: (id, patch) =>
        set({ projects: get().projects.map((p) => (p.id === id ? { ...p, ...patch } : p)) }),
      updateSection: (pid, sid, patch) =>
        set({
          projects: get().projects.map((p) =>
            p.id === pid
              ? { ...p, sections: p.sections.map((s) => (s.id === sid ? { ...s, ...patch } : s)) }
              : p,
          ),
        }),

      customFonts: [],
      addCustomFont: (f) => set({ customFonts: [...get().customFonts, f] }),
      ai: { provider: 'gemini', geminiKey: '', openaiKey: '', freeMode: true },
      setAi: (patch) => set({ ai: { ...get().ai, ...patch } }),
    }),
    {
      name: 'sangsae-studio-v1',
      storage: createJSONStorage(() => idbStorage),
      partialize: (s) => ({
        refs: s.refs,
        projects: s.projects,
        customFonts: s.customFonts,
        ai: s.ai,
        lang: s.lang,
        accounts: s.accounts,
      }),
    },
  ),
);

export const useCurrentProject = () =>
  useStore((s) => s.projects.find((p) => p.id === s.currentId) ?? null);
