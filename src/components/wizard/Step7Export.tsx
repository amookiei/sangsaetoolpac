import { useState } from 'react';
import { PLATFORM_WIDTH } from '../../data/categories';
import { renderSvg } from '../../utils/renderSvg';
import { renderPng } from '../../utils/renderPng';
import { downloadBlob, fmtBytes, MAX_SECTION_BYTES, safeFilename } from '../../utils/files';
import type { Project, Section } from '../../state/types';

/**
 * 7단계: 섹션별 SVG(피그마 편집용) / PNG 추출.
 * 상세페이지는 장당 최대 10MB 제한이 있어 섹션 단위로 따로 추출한다.
 */
export function Step7Export({ project }: { project: Project }) {
  const width = PLATFORM_WIDTH[project.platform];
  const [animated, setAnimated] = useState(true);
  const [sizes, setSizes] = useState<Record<string, number>>({});
  const [busy, setBusy] = useState(false);

  const note = (id: string, bytes: number) => setSizes((s) => ({ ...s, [id]: bytes }));

  const exportSvg = (sec: Section, idx: number) => {
    const svg = renderSvg(sec, width, animated);
    const blob = new Blob([svg], { type: 'image/svg+xml' });
    note(sec.id, blob.size);
    downloadBlob(blob, `${String(idx + 1).padStart(2, '0')}_${safeFilename(sec.name)}.svg`);
  };

  const exportPng = async (sec: Section, idx: number) => {
    const blob = await renderPng(sec, width);
    note(sec.id, blob.size);
    downloadBlob(blob, `${String(idx + 1).padStart(2, '0')}_${safeFilename(sec.name)}.png`);
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
          타이포 애니메이션을 SVG에 포함 (브라우저에서 GIF처럼 재생 — 피그마에서는 정적 텍스트로 편집 가능)
        </label>
        <p className="hint" style={{ marginBottom: 0 }}>
          SVG는 텍스트·도형·이미지가 레이어로 살아있어 피그마에 드래그하면 바로 수정할 수
          있습니다. 폰트는 피그마에 동일 폰트가 설치되어 있어야 동일하게 표시돼요. PNG는 2배
          해상도로 추출됩니다.
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

      {project.sections.map((sec, i) => {
        const size = sizes[sec.id];
        return (
          <div key={sec.id} className="export-row">
            <span className="badge">{i + 1}</span>
            <span className="name">{sec.name}</span>
            {size !== undefined && (
              <span className={size > MAX_SECTION_BYTES ? 'size-over' : 'size-ok'}>
                {fmtBytes(size)} {size > MAX_SECTION_BYTES ? '· 10MB 초과! 이미지 용량을 줄여주세요' : '· 10MB 이내 ✓'}
              </span>
            )}
            <button className="btn subtle sm" onClick={() => exportSvg(sec, i)}>SVG</button>
            <button className="btn subtle sm" onClick={() => exportPng(sec, i)}>PNG</button>
          </div>
        );
      })}

      {project.sections.length === 0 && (
        <div className="card">먼저 4~5단계에서 상세페이지를 만들어 주세요.</div>
      )}
    </>
  );
}
