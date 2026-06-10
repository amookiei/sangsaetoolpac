import { useEffect, useState } from 'react';
import { useStore } from '../../state/store';
import { generateHooks, HOOK_STYLE_LABELS } from '../../data/draftGenerator';
import type { Project } from '../../state/types';

/** 3단계: 후킹멘트 3가지 스타일 제안 + 직접 입력 */
export function Step3Hooks({ project }: { project: Project }) {
  const updateProject = useStore((s) => s.updateProject);
  const [seed, setSeed] = useState(0);
  const [custom, setCustom] = useState(
    project.hookSelected && !project.hookOptions.includes(project.hookSelected)
      ? project.hookSelected
      : '',
  );

  useEffect(() => {
    if (project.hookOptions.length === 0) {
      updateProject(project.id, { hookOptions: generateHooks(project, 0) });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const regen = () => {
    const next = seed + 1;
    setSeed(next);
    updateProject(project.id, { hookOptions: generateHooks(project, next) });
  };

  return (
    <>
      <div className="wz-head">
        <h2>3. 후킹멘트 선택</h2>
        <button className="btn ghost sm" onClick={regen}>↻ 다시 제안받기</button>
      </div>
      <p className="hint" style={{ marginBottom: 18 }}>
        1단계에서 학습한 키워드{project.keywords.length > 0 && ` (#${project.keywords.slice(0, 3).join(' #')})`}
        를 바탕으로 3가지 스타일을 제안합니다. 모두 마음에 들지 않으면 아래에 직접 입력하세요.
      </p>

      <div className="grid cols3">
        {project.hookOptions.map((h, i) => (
          <div
            key={i}
            className={`hook-card ${project.hookSelected === h ? 'on' : ''}`}
            onClick={() => updateProject(project.id, { hookSelected: h })}
          >
            <div className="hook-style">{HOOK_STYLE_LABELS[i]}</div>
            <div className="hook-text">{h}</div>
          </div>
        ))}
      </div>

      <div className="card" style={{ marginTop: 18 }}>
        <strong>직접 입력 / 레퍼런스 멘트</strong>
        <div style={{ display: 'flex', gap: 10, marginTop: 10 }}>
          <input
            className="input"
            placeholder="예) 한 숟갈이면 충분한 아침, 아침한줌"
            value={custom}
            onChange={(e) => setCustom(e.target.value)}
          />
          <button
            className="btn"
            disabled={!custom.trim()}
            onClick={() => updateProject(project.id, { hookSelected: custom.trim() })}
          >
            이 멘트 사용
          </button>
        </div>
        {project.hookSelected && (
          <p className="hint" style={{ marginTop: 12 }}>
            ✅ 선택된 후킹멘트: <strong style={{ color: 'var(--violet-deep)' }}>{project.hookSelected}</strong>
          </p>
        )}
      </div>
    </>
  );
}
