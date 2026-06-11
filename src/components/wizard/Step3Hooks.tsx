import { useEffect, useState } from 'react';
import { useStore } from '../../state/store';
import { generateHooks, HOOK_STYLE_LABELS } from '../../data/draftGenerator';
import { generateAiHooks } from '../../utils/aiCopy';
import type { Project } from '../../state/types';

/** 3단계: 후킹멘트 3가지 스타일 제안 — AI(Claude→Gemini) 우선, 실패 시 템플릿 폴백 */
export function Step3Hooks({ project }: { project: Project }) {
  const { updateProject, ai } = useStore();
  const [seed, setSeed] = useState(0);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const [custom, setCustom] = useState(
    project.hookSelected && !project.hookOptions.includes(project.hookSelected)
      ? project.hookSelected
      : '',
  );

  const regen = async () => {
    setNotice('');
    setBusy(true);
    try {
      const hooks = await generateAiHooks(project, ai);
      updateProject(project.id, { hookOptions: hooks });
    } catch (e) {
      const next = seed + 1;
      setSeed(next);
      updateProject(project.id, { hookOptions: generateHooks(project, next) });
      setNotice(`템플릿으로 제안했어요 — ${e instanceof Error ? e.message : 'AI 사용 불가'}`);
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    if (project.hookOptions.length > 0) return;
    const t = setTimeout(() => void regen(), 0);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <>
      <div className="wz-head">
        <h2>3. 후킹멘트 선택</h2>
        <button className="btn ghost sm" disabled={busy} onClick={regen}>
          {busy ? '생성 중…' : '✨ 다시 제안받기'}
        </button>
        <span className="hint">기획안을 읽고 Claude가 작성합니다 (미연결 시 템플릿)</span>
      </div>
      {notice && <p className="hint" style={{ color: '#b3412e', marginBottom: 12 }}>{notice}</p>}
      <p className="hint" style={{ marginBottom: 18 }}>
        1단계에서 학습한 키워드{project.keywords.length > 0 && ` (#${project.keywords.slice(0, 3).join(' #')})`}
        와 기획안을 바탕으로 3가지 스타일을 제안합니다. 모두 마음에 들지 않으면 아래에 직접 입력하세요.
      </p>

      <div className="grid cols3">
        {busy && project.hookOptions.length === 0 && (
          <div className="card" style={{ gridColumn: '1 / -1', textAlign: 'center' }}>
            ✨ 기획안을 읽고 후킹멘트를 작성하는 중…
          </div>
        )}
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
            ✅ 선택된 후킹멘트: <strong style={{ color: 'var(--accent-deep)' }}>{project.hookSelected}</strong>
          </p>
        )}
      </div>
    </>
  );
}
