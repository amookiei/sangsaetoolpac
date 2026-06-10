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
        <strong>생성 엔진 설정</strong>
        <p className="hint">
          💡 추천: 초반 테스트는 <b>무료 테스트 모드</b>(비용 0원, 무드 플레이스홀더)로 흐름을 잡고,
          실제 생성은 <b>Gemini 나노바나나</b>(gemini-2.5-flash-image)부터 시작하세요 — Google AI
          Studio 무료 키로 테스트 가능하고, 옴니버스 레퍼런스 이미지 입력을 지원해 제품 일관성에
          유리합니다. GPT(gpt-image-1)는 무료 티어가 없어 비용이 발생합니다. 자세한 비교는{' '}
          <code>docs/AI_IMAGE_API.md</code> 참고.
        </p>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginTop: 8 }}>
          <button
            className={`chip selectable ${ai.freeMode ? 'on' : ''}`}
            onClick={() => setAi({ freeMode: true })}
          >
            무료 테스트 모드 (0원)
          </button>
          <button
            className={`chip selectable ${!ai.freeMode && ai.provider === 'gemini' ? 'on' : ''}`}
            onClick={() => setAi({ freeMode: false, provider: 'gemini' })}
          >
            Gemini 나노바나나 (추천)
          </button>
          <button
            className={`chip selectable ${!ai.freeMode && ai.provider === 'openai' ? 'on' : ''}`}
            onClick={() => setAi({ freeMode: false, provider: 'openai' })}
          >
            OpenAI gpt-image-1
          </button>
        </div>
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
        {!ai.freeMode && ai.provider === 'openai' && (
          <>
            <label className="label">OpenAI API 키</label>
            <input
              className="input"
              type="password"
              placeholder="sk-..."
              value={ai.openaiKey}
              onChange={(e) => setAi({ openaiKey: e.target.value })}
            />
            <p className="hint">⚠ 브라우저 직접 호출은 CORS 정책으로 막힐 수 있습니다 — 서버 프록시 가이드: docs/AI_IMAGE_API.md</p>
          </>
        )}
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
