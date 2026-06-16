import { useState } from 'react';
import { useStore } from '../../state/store';
import { buildSections, generateSections } from '../../data/draftGenerator';
import { generateAiSections } from '../../utils/aiCopy';
import { splitDraft } from '../../utils/splitDraft';
import { guideOf } from '../../data/styleGuide';
import type { Block, Project } from '../../state/types';

type DraftRole = 'heading' | 'body' | 'number';

/** 4단계: 상세 기획안 — 외부 기획안 붙여넣기 → 문단별 쪼개기(0원)가 기본, AI/템플릿은 옵션 */
export function Step4Draft({ project }: { project: Project }) {
  const { updateProject, updateSection, ai } = useStore();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [paste, setPaste] = useState('');

  const splitToPages = () => {
    setErr('');
    const chunks = splitDraft(paste);
    if (chunks.length === 0) {
      setErr('붙여넣은 내용이 없어요 — 기획안 텍스트를 먼저 붙여넣어 주세요.');
      return;
    }
    if (project.sections.length > 0 && !confirm(`기존 기획안을 ${chunks.length}개 문단으로 대체할까요?`)) {
      return;
    }
    const structure = chunks.map((c) => ({ name: c.name, purpose: '외부 기획안에서 분할' }));
    const sections = buildSections(
      { ...project, structure },
      chunks.map((c) => ({ heading: c.heading, body: c.body, imageDesc: c.imageDesc })),
    );
    updateProject(project.id, { structure, sections });
  };

  const generate = async (useAi: boolean) => {
    setErr('');
    if (!useAi) {
      updateProject(project.id, { sections: generateSections(project) });
      return;
    }
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

  const guide = guideOf(project);
  const roleOf = (b: Block): DraftRole =>
    b.numberShape ? 'number' : b.kind === 'heading' || b.styleId === 'heading' ? 'heading' : 'body';
  const setRole = (sid: string, bid: string, role: DraftRole) => {
    if (role === 'heading') {
      patchBlock(sid, bid, {
        kind: 'heading', styleId: 'heading', numberShape: null,
        font: guide.headingFont, fontSize: guide.headingSize, color: guide.headingColor, bold: guide.headingBold,
      });
    } else if (role === 'number') {
      patchBlock(sid, bid, {
        kind: 'heading', numberShape: guide.numberShape, numberShapeColor: guide.numberShapeColor,
        fontSize: guide.numberSize, color: guide.numberColor, bold: true,
      });
    } else {
      const bs = guide.bodyStyles[0];
      patchBlock(sid, bid, {
        kind: 'body', styleId: bs.id, numberShape: null,
        font: bs.font, fontSize: bs.size, color: bs.color, bold: false,
      });
    }
  };

  return (
    <>
      <div className="wz-head">
        <h2>4. 상세페이지 기획안</h2>
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <strong>외부 기획안 붙여넣기</strong>
          <span className="badge">API 비용 0원 · 추천</span>
        </div>
        <p className="hint">
          ChatGPT 등 외부에서 작성한 기획안을 그대로 붙여넣으세요. <b>빈 줄(엔터 2번)</b>이 페이지
          구분 기준이고, 문단 첫 줄(30자 이하)은 헤드라인이 됩니다. <b>"[이미지] ..."</b> 줄은{' '}
          <span style={{ color: 'var(--blue-desc)', fontWeight: 700 }}>파란 이미지 묘사</span>로
          자동 분리돼요.
        </p>
        <textarea
          className="input"
          style={{ minHeight: 160 }}
          placeholder={'인트로 후킹멘트\n부연 설명 문장…\n[이미지] 제품 메인컷\n\n특징 1 제목\n특징 설명…\n\n특징 2 제목\n…'}
          value={paste}
          onChange={(e) => setPaste(e.target.value)}
        />
        <div style={{ display: 'flex', gap: 10, marginTop: 12, alignItems: 'center', flexWrap: 'wrap' }}>
          <button className="btn" disabled={!paste.trim()} onClick={splitToPages}>
            ✂ 문단별로 쪼개서 페이지 만들기
          </button>
          {paste.trim() && (
            <span className="hint">{splitDraft(paste).length}개 페이지로 나뉩니다</span>
          )}
          <span style={{ flex: 1 }} />
          <button className="btn subtle sm" disabled={busy} onClick={() => generate(true)}>
            {busy ? '생성 중…' : '✨ AI 생성 (비용 발생)'}
          </button>
          <button className="btn subtle sm" disabled={busy} onClick={() => generate(false)}>
            템플릿 생성 (0원)
          </button>
        </div>
      </div>

      {err && <p className="hint" style={{ color: '#b3412e', marginBottom: 12 }}>{err}</p>}
      <p className="hint" style={{ marginBottom: 18 }}>
        검정 글씨는 실제 들어갈 멘트,{' '}
        <span style={{ color: 'var(--blue-desc)', fontWeight: 700 }}>파란 글씨는 그 자리에 들어갈 이미지 묘사</span>입니다. 모두 직접 수정할 수 있어요.
      </p>

      {project.sections.length === 0 && !busy && (
        <div className="card" style={{ textAlign: 'center', padding: 40 }}>
          <p style={{ fontWeight: 700, marginBottom: 0 }}>
            아직 페이지가 없습니다 — 위에 기획안을 붙여넣고 ✂ 쪼개기를 눌러보세요.
          </p>
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
              <div key={b.id} style={{ display: 'flex', gap: 8, marginTop: 8, alignItems: 'flex-start' }}>
                <select
                  className="input"
                  style={{ width: 76, padding: '6px 6px', fontSize: 12.5, flexShrink: 0 }}
                  value={roleOf(b)}
                  onChange={(e) => setRole(sec.id, b.id, e.target.value as DraftRole)}
                  title="제목 / 본문 / 숫자 미리 나누기"
                >
                  <option value="heading">제목</option>
                  <option value="body">본문</option>
                  <option value="number">숫자</option>
                </select>
                <textarea
                  className="input"
                  style={{
                    flex: 1,
                    fontWeight: roleOf(b) === 'heading' ? 800 : 400,
                    fontSize: roleOf(b) === 'heading' ? 17 : 14,
                    minHeight: roleOf(b) === 'number' ? 40 : roleOf(b) === 'heading' ? 48 : 64,
                  }}
                  value={b.text}
                  onChange={(e) => patchBlock(sec.id, b.id, { text: e.target.value })}
                />
              </div>
            ),
          )}
        </div>
      ))}
    </>
  );
}
