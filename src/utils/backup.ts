import { useStore } from '../state/store';
import { downloadBlob } from './files';
import type { CustomFont, Project, RefAsset } from '../state/types';

/**
 * 데이터 백업/복원 — 브라우저 저장소(IndexedDB)는 주소(origin)별로 분리되어
 * 프리뷰 URL ↔ 프로덕션 URL 간에 데이터가 공유되지 않는다.
 * JSON 파일로 내보내 다른 주소/기기에서 가져오면 그대로 이어서 작업할 수 있다.
 */
interface BackupFile {
  app: 'sangsae-studio';
  version: 1;
  exportedAt: string;
  projects: Project[];
  refs: RefAsset[];
  customFonts: CustomFont[];
}

export function exportBackup() {
  const s = useStore.getState();
  const data: BackupFile = {
    app: 'sangsae-studio',
    version: 1,
    exportedAt: new Date().toISOString(),
    projects: s.projects,
    refs: s.refs,
    customFonts: s.customFonts,
  };
  const blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
  const date = new Date().toISOString().slice(0, 10);
  downloadBlob(blob, `상세스튜디오_백업_${date}.json`);
  return blob.size;
}

/** 백업 파일을 현재 데이터와 병합 (같은 id는 백업 파일 우선) — 가져온 개수 반환 */
export async function importBackup(file: File): Promise<{ projects: number; refs: number }> {
  const text = await file.text();
  let data: BackupFile;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error('JSON 파일을 읽을 수 없습니다.');
  }
  if (data.app !== 'sangsae-studio' || !Array.isArray(data.projects)) {
    throw new Error('상세 스튜디오 백업 파일이 아닙니다.');
  }
  const s = useStore.getState();
  const mergeById = <T extends { id: string }>(incoming: T[], current: T[]): T[] => [
    ...incoming,
    ...current.filter((c) => !incoming.some((i) => i.id === c.id)),
  ];
  useStore.setState({
    projects: mergeById(data.projects, s.projects),
    refs: mergeById(data.refs ?? [], s.refs),
    customFonts: mergeById(data.customFonts ?? [], s.customFonts),
  });
  return { projects: data.projects.length, refs: (data.refs ?? []).length };
}
