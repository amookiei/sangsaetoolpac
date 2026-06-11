import { useState } from 'react';
import { useStore } from '../../state/store';
import { generateSections } from '../../data/draftGenerator';
import { generateAiSections } from '../../utils/aiCopy';
import type { Block, Project } from '../../state/types';

/** 4단계: 구조별 상세 기획안 — AI(Claude→Gemini) 우선, 실패 시 템플릿 폴백 */
export function Step4Draft({ project }: { project: Project }) {
  const { updateProject, updateSection, ai } = useStore();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  const generate = async () => {
    setErr('');
    setBusy(true);
    try {
      const sections = await generateAiSections(project, ai);
      updateProject(project.id, { sections });
    } catch (e) {
      updateProject(project.id, { sections: generateSections(project) });
      setErr(`템플릿으로 생성했어요 — ${e instanceof Error ? e.message : 'AI 사용 불가'}`);
    } finally {
      setBusy(false);
    }
  };

  const patchBlock = (sid: string, bid: string, patch: Partial<Block>) => {
    const sec = project.sections.find((s) => s.id === sid)!;
    updateSection(project.id, sid, {
      blocks: sec.blocks.map((b) => (b.id === bid ? { ...b, ...patch } : b)),
    });
  };

  return (
    <>
      <div className="wz-head">
        <h2>4. 상세페이지 기획안</h2>
        <button className="btn ghost sm" disabled={busy} onClick={generate}>
          {busy
            ? '✨ 기획안을 읽고 작성 중…'
            : project.sections.length === 0
              ? '✨ AI 기획안 생성'
              : '✨ AI로 전체 다시 생성'}
        </button>
        <span className="hint">기획안을 읽고 Claude가 작성합니다 (미연결 시 템플릿)</span>
      </div>
      {err && <p className="hint" style={{ color: '#b3412e', marginBottom: 12 }}>{err}</p>}
      <p className="hint" style={{ marginBottom: 18 }}>
        선택한 후킹멘트와 구조를 바탕으로 섹션별 카피를 작성했습니다. 검정 글씨는 실제 들어갈
        멘트, <span style={{ color: 'var(--blue-desc)', fontWeight: 700 }}>파란 글씨는 그 자리에 들어갈 이미지 묘사</span>입니다. 모두 직접 수정할 수 있어요.
      </p>

      {project.sections.length === 0 && (
        <div className="card" style={{ textAlign: 'center', padding: 48 }}>
          {busy ? (
            <p style={{ fontWeight: 700 }}>✨ 기획안과 키워드를 읽고 섹션별 카피를 작성하는 중…</p>
          ) : (
            <>
              <p style={{ fontWeight: 700 }}>아직 기획안이 없습니다.</p>
              <button className="btn" onClick={generate}>
                ✨ 후킹멘트 기반으로 기획안 생성하기
              </button>
            </>
          )}
        </div>
      )}

      {project.sections.map((sec, i) => (
        <div key={sec.id} className="card draft-sec">
          <div className="draft-sec-head">
            <span className="badge">{i + 1}</span>
            <h3>{sec.name}</h3>
            <span className="hint">{sec.purpose}</span>
          </div>
          {sec.blocks.map((b) =>
            b.kind === 'image' ? (
              <textarea
                key={b.id}
                className="img-desc"
                style={{ marginTop: 8 }}
                value={b.imageDesc}
                onChange={(e) => patchBlock(sec.id, b.id, { imageDesc: e.target.value })}
              />
            ) : (
              <textarea
                key={b.id}
                className="input"
                style={{
                  marginTop: 8,
                  fontWeight: b.kind === 'heading' ? 800 : 400,
                  fontSize: b.kind === 'heading' ? 17 : 14,
                  minHeight: b.kind === 'heading' ? 48 : 64,
                }}
                value={b.text}
                onChange={(e) => patchBlock(sec.id, b.id, { text: e.target.value })}
              />
            ),
          )}
        </div>
      ))}
    </>
  );
}
