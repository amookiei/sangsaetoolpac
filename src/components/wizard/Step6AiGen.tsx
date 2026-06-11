import { useState } from 'react';
import { useStore } from '../../state/store';
import { generateImage, buildPrompt } from '../../utils/aiImage';
import { imageSize } from '../../utils/files';
import type { Project } from '../../state/types';

/** 6단계: 비어 있는 이미지 블록을 AI로 채우기 (옴니버스 일관성 적용) */
export function Step6AiGen({ project }: { project: Project }) {
  const { updateSection, ai, setAi } = useStore();
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState('');

  const empties = project.sections.flatMap((s) =>
    s.blocks.filter((b) => b.kind === 'image' && !b.imageDataUrl).map((b) => ({ sec: s, block: b })),
  );

  const gen = async (secId: string, blockId: string, desc: string) => {
    setBusy(blockId);
    setErr('');
    try {
      const dataUrl = await generateImage(desc, project.omni, project.platform, project.category, ai);
      const { w, h } = await imageSize(dataUrl);
      const sec = project.sections.find((s) => s.id === secId)!;
      updateSection(project.id, secId, {
        blocks: sec.blocks.map((b) =>
          b.id === blockId ? { ...b, imageDataUrl: dataUrl, imgW: w, imgH: h } : b,
        ),
      });
    } catch (e) {
      setErr(e instanceof Error ? e.message : '생성 실패');
    } finally {
      setBusy(null);
    }
  };

  return (
    <>
      <div className="wz-head">
        <h2>6. AI 이미지 생성</h2>
        <span className="badge">옴니버스 일관성 자동 적용</span>
      </div>

      <div className="card">
        <strong>이미지 생성 엔진</strong>
        <p className="hint">
          기본 엔진은 <b>GPT(gpt-image-1)</b>입니다 — Vercel 환경변수 <code>OPENAI_API_KEY</code>를
          설정하면 키 입력 없이 서버 프록시로 안전하게 호출됩니다. 비용 없이 흐름만 확인하려면
          무료 테스트 모드(플레이스홀더)를 사용하세요. 비교: <code>docs/AI_IMAGE_API.md</code>
        </p>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginTop: 8 }}>
          <button
            className={`chip selectable ${!ai.freeMode && ai.provider === 'openai' ? 'on' : ''}`}
            onClick={() => setAi({ freeMode: false, provider: 'openai' })}
          >
            GPT gpt-image-1 (기본)
          </button>
          <button
            className={`chip selectable ${!ai.freeMode && ai.provider === 'gemini' ? 'on' : ''}`}
            onClick={() => setAi({ freeMode: false, provider: 'gemini' })}
          >
            Gemini 나노바나나
          </button>
          <button
            className={`chip selectable ${ai.freeMode ? 'on' : ''}`}
            onClick={() => setAi({ freeMode: true })}
          >
            무료 테스트 모드 (0원)
          </button>
        </div>
        {!ai.freeMode && ai.provider === 'openai' && (
          <>
            <label className="label">OpenAI API 키 (선택 — 서버 환경변수 OPENAI_API_KEY 권장)</label>
            <input
              className="input"
              type="password"
              placeholder="sk-... (비워두면 Vercel 프록시 /api/openai-image 사용)"
              value={ai.openaiKey}
              onChange={(e) => setAi({ openaiKey: e.target.value })}
            />
          </>
        )}
        {!ai.freeMode && ai.provider === 'gemini' && (
          <>
            <label className="label">Gemini API 키 (aistudio.google.com에서 무료 발급)</label>
            <input
              className="input"
              type="password"
              placeholder="AIza..."
              value={ai.geminiKey}
              onChange={(e) => setAi({ geminiKey: e.target.value })}
            />
          </>
        )}
      </div>

      <div className="card" style={{ marginTop: 12 }}>
        <strong>카피·번역 엔진 (Claude)</strong>
        <p className="hint">
          3단계 후킹멘트, 4단계 기획안, 본문 번역은 <b>Claude(claude-opus-4-8)</b>가 작성합니다.
          우선순위: 아래 입력 키 → Vercel 환경변수 <code>ANTHROPIC_API_KEY</code>(권장, 키 노출
          없음) → Gemini 폴백 → 템플릿.
        </p>
        <label className="label">Claude API 키 (선택 — 서버 환경변수 권장)</label>
        <input
          className="input"
          type="password"
          placeholder="sk-ant-... (비워두면 Vercel 프록시 /api/claude 사용)"
          value={ai.claudeKey ?? ''}
          onChange={(e) => setAi({ claudeKey: e.target.value })}
        />
      </div>

      {err && (
        <div className="card" style={{ marginTop: 12, borderLeft: '4px solid #dc2626' }}>
          <span style={{ color: '#dc2626', fontWeight: 700, fontSize: 13 }}>{err}</span>
        </div>
      )}

      <div className="section-title">비어 있는 이미지 ({empties.length}개)</div>
      {empties.length === 0 && (
        <div className="card">🎉 모든 이미지가 채워졌어요. 7단계에서 추출을 진행하세요.</div>
      )}
      {empties.map(({ sec, block }) => (
        <div key={block.id} className="export-row" style={{ alignItems: 'flex-start' }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 800, fontSize: 13, marginBottom: 6 }}>{sec.name}</div>
            <div className="img-desc">{block.imageDesc}</div>
            <details style={{ marginTop: 8 }}>
              <summary className="hint" style={{ cursor: 'pointer' }}>전송될 프롬프트 미리보기</summary>
              <pre className="hint" style={{ whiteSpace: 'pre-wrap', background: 'var(--bg)', padding: 10, borderRadius: 8 }}>
                {buildPrompt(block.imageDesc, project.omni, project.platform, project.category)}
              </pre>
            </details>
          </div>
          <button
            className="btn"
            disabled={busy !== null}
            onClick={() => gen(sec.id, block.id, block.imageDesc)}
          >
            {busy === block.id ? '생성 중…' : '✨ 생성'}
          </button>
        </div>
      ))}

      <p className="hint" style={{ marginTop: 14 }}>
        GIF가 필요한 인트로 타이포는 5단계의 타이포 애니메이션 프리셋으로 제작되고, 추출 단계에서
        애니메이션 SVG로 내보낼 수 있어요.
      </p>
    </>
  );
}
