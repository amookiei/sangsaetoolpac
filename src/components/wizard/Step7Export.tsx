import { useState } from 'react';
import { PLATFORM_WIDTH } from '../../data/categories';
import { renderSvg } from '../../utils/renderSvg';
import { renderPng } from '../../utils/renderPng';
import { renderGif } from '../../utils/renderGif';
import { downloadBlob, fmtBytes, MAX_SECTION_BYTES, safeFilename } from '../../utils/files';
import type { Project, Section } from '../../state/types';

const hasAnim = (sec: Section) => sec.blocks.some((b) => b.kind !== 'image' && b.animation);

/**
 * 7단계: 섹션별 SVG(피그마 편집용) / PNG / GIF(타이포 모션) 추출.
 * 상세페이지는 장당 최대 10MB 제한이 있어 섹션 단위로 따로 추출한다.
 */
export function Step7Export({ project }: { project: Project }) {
  const width = PLATFORM_WIDTH[project.platform];
  const [animated, setAnimated] = useState(true);
  const [sizes, setSizes] = useState<Record<string, number>>({});
  const [busy, setBusy] = useState(false);
  const [gifProgress, setGifProgress] = useState<Record<string, number>>({});
  const [err, setErr] = useState('');

  const note = (id: string, bytes: number) => setSizes((s) => ({ ...s, [id]: bytes }));
  const fname = (idx: number, sec: Section, ext: string) =>
    `${String(idx + 1).padStart(2, '0')}_${safeFilename(sec.name)}.${ext}`;

  const exportSvg = (sec: Section, idx: number) => {
    const svg = renderSvg(sec, width, animated);
    const blob = new Blob([svg], { type: 'image/svg+xml' });
    note(sec.id, blob.size);
    downloadBlob(blob, fname(idx, sec, 'svg'));
  };

  const exportPng = async (sec: Section, idx: number) => {
    const blob = await renderPng(sec, width);
    note(sec.id, blob.size);
    downloadBlob(blob, fname(idx, sec, 'png'));
  };

  const exportGif = async (sec: Section, idx: number) => {
    setErr('');
    setBusy(true);
    try {
      const blob = await renderGif(sec, width, {
        fps: 15,
        onProgress: (r) => setGifProgress((g) => ({ ...g, [sec.id]: r })),
      });
      note(sec.id, blob.size);
      downloadBlob(blob, fname(idx, sec, 'gif'));
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'GIF 생성 실패');
    } finally {
      setGifProgress((g) => ({ ...g, [sec.id]: 0 }));
      setBusy(false);
    }
  };

  const exportAll = async (kind: 'svg' | 'png') => {
    setBusy(true);
    try {
      for (let i = 0; i < project.sections.length; i++) {
        if (kind === 'svg') exportSvg(project.sections[i], i);
        else await exportPng(project.sections[i], i);
        await new Promise((r) => setTimeout(r, 350)); // 브라우저 다운로드 큐 여유
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <div className="wz-head">
        <h2>7. 추출</h2>
        <span className="badge">기준 폭 {width}px · 장당 10MB 제한</span>
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <label style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 14, fontWeight: 600 }}>
          <input type="checkbox" checked={animated} onChange={(e) => setAnimated(e.target.checked)} />
          타이포 애니메이션을 SVG에 포함 (브라우저에서 재생 — 피그마에서는 정적 텍스트로 편집 가능)
        </label>
        <p className="hint" style={{ marginBottom: 0 }}>
          <b>SVG</b>: 텍스트·도형·이미지가 레이어로 살아있어 피그마에 드래그하면 바로 수정 가능
          (동일 폰트 설치 필요). <b>PNG</b>: 2배 해상도. <b>GIF</b>: 타이포 애니메이션이 실제
          움직이는 GIF — 와디즈 인트로용 (애니메이션이 설정된 섹션만).
        </p>
        <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
          <button className="btn" disabled={busy} onClick={() => exportAll('svg')}>
            ⬇ 전체 SVG 추출
          </button>
          <button className="btn ghost" disabled={busy} onClick={() => exportAll('png')}>
            ⬇ 전체 PNG 추출
          </button>
        </div>
      </div>

      {err && (
        <div className="card" style={{ marginBottom: 12, borderLeft: '4px solid #dc2626' }}>
          <span style={{ color: '#dc2626', fontWeight: 700, fontSize: 13 }}>{err}</span>
        </div>
      )}

      {project.sections.map((sec, i) => {
        const size = sizes[sec.id];
        const prog = gifProgress[sec.id] ?? 0;
        const animOk = hasAnim(sec);
        return (
          <div key={sec.id} className="export-row">
            <span className="badge">{i + 1}</span>
            <span className="name">{sec.name}</span>
            {size !== undefined && (
              <span className={size > MAX_SECTION_BYTES ? 'size-over' : 'size-ok'}>
                {fmtBytes(size)} {size > MAX_SECTION_BYTES ? '· 10MB 초과! 이미지 용량을 줄여주세요' : '· 10MB 이내 ✓'}
              </span>
            )}
            <button className="btn subtle sm" disabled={busy} onClick={() => exportSvg(sec, i)}>SVG</button>
            <button className="btn subtle sm" disabled={busy} onClick={() => exportPng(sec, i)}>PNG</button>
            <button
              className="btn subtle sm"
              disabled={busy || !animOk}
              title={animOk ? '타이포 애니메이션 GIF로 추출' : '5단계에서 타이포 애니메이션을 먼저 설정하세요'}
              onClick={() => exportGif(sec, i)}
            >
              {prog > 0 ? `GIF ${Math.round(prog * 100)}%` : 'GIF'}
            </button>
          </div>
        );
      })}

      {project.sections.length === 0 && (
        <div className="card">먼저 4~5단계에서 상세페이지를 만들어 주세요.</div>
      )}
    </>
  );
}
