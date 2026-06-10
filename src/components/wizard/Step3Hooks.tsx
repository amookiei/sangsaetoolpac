import { useEffect, useState } from 'react';
import { useStore } from '../../state/store';
import { generateHooks, HOOK_STYLE_LABELS } from '../../data/draftGenerator';
import { generateAiHooks } from '../../utils/aiCopy';
import { effectiveGeminiKey } from '../../utils/aiImage';
import type { Project } from '../../state/types';

/** 3단계: 후킹멘트 3가지 스타일 제안 (Gemini 키 있으면 AI, 없으면 템플릿) + 직접 입력 */
export function Step3Hooks({ project }: { project: Project }) {
  const { updateProject, ai } = useStore();
  const [seed, setSeed] = useState(0);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [custom, setCustom] = useState(
    project.hookSelected && !project.hookOptions.includes(project.hookSelected)
      ? project.hookSelected
      : '',
  );
  const key = effectiveGeminiKey(ai);

  const regen = async () => {
    setErr('');
    if (key) {
      setBusy(true);
      try {
        const hooks = await generateAiHooks(project, key);
        updateProject(project.id, { hookOptions: hooks });
        return;
      } catch (e) {
        setErr(`AI 생성 실패 — 템플릿으로 대체했어요. (${e instanceof Error ? e.message : ''})`);
      } finally {
        setBusy(false);
      }
    }
    const next = seed + 1;
    setSeed(next);
    updateProject(project.id, { hookOptions: generateHooks(project, next) });
  };

  useEffect(() => {
    if (project.hookOptions.length > 0) return;
    const t = setTimeout(() => {
      if (key) void regen();
      else updateProject(project.id, { hookOptions: generateHooks(project, 0) });
    }, 0);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <>
      <div className="wz-head">
        <h2>3. 후킹멘트 선택</h2>
        <button className="btn ghost sm" disabled={busy} onClick={regen}>
          {busy ? '생성 중…' : key ? '✨ AI로 다시 제안받기' : '↻ 다시 제안받기'}
        </button>
        {!key && (
          <span className="hint">
            Gemini 키를 연결하면(6단계 또는 VITE_GEMINI_KEY) 기획안을 읽고 AI가 제안합니다
          </span>
        )}
      </div>
      {err && <p className="hint" style={{ color: '#b3412e', marginBottom: 12 }}>{err}</p>}
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
