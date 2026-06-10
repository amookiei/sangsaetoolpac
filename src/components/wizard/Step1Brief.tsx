import { useRef } from 'react';
import { useStore } from '../../state/store';
import { extractKeywords } from '../../data/draftGenerator';
import { readFileAsDataUrl, readFileAsText, fmtBytes } from '../../utils/files';
import type { OmniAsset, OmniRole, Project } from '../../state/types';

const uid = () => Math.random().toString(36).slice(2, 10);

const ROLE_LABEL: Record<OmniRole, string> = {
  product: '제품',
  package: '패키지',
  character: '캐릭터',
  model: '인물/모델',
  logo: '로고',
};

/** 1단계: 기획안 업로드 + 옴니버스(일관성 자산) 등록 + 제품 특징 학습 */
export function Step1Brief({ project }: { project: Project }) {
  const updateProject = useStore((s) => s.updateProject);
  const briefInput = useRef<HTMLInputElement>(null);
  const omniInputs = useRef<Record<string, HTMLInputElement | null>>({});

  const onBriefFiles = async (files: FileList | null) => {
    if (!files) return;
    const metas = [...project.briefFiles];
    let text = project.briefText;
    for (const f of Array.from(files)) {
      metas.push({ name: f.name, size: f.size });
      // 텍스트 계열 파일은 본문을 자동으로 읽어온다 (ppt/pdf는 핵심 내용을 직접 붙여넣기)
      if (/\.(txt|md|csv)$/i.test(f.name) || f.type.startsWith('text/')) {
        text += (text ? '\n\n' : '') + (await readFileAsText(f));
      }
    }
    updateProject(project.id, { briefFiles: metas, briefText: text });
  };

  const addOmni = () => {
    const o: OmniAsset = { id: uid(), name: '', role: 'product', dataUrl: null, description: '' };
    updateProject(project.id, { omni: [...project.omni, o] });
  };
  const patchOmni = (id: string, patch: Partial<OmniAsset>) =>
    updateProject(project.id, {
      omni: project.omni.map((o) => (o.id === id ? { ...o, ...patch } : o)),
    });

  const learn = () => {
    const source = [
      project.briefText,
      ...project.omni.map((o) => `${o.name} ${o.description}`),
    ].join('\n');
    updateProject(project.id, { keywords: extractKeywords(source) });
  };

  return (
    <>
      <div className="wz-head">
        <h2>1. 기획안 & 옴니버스</h2>
        <span className="badge">제품 특징 학습</span>
      </div>

      <div className="card">
        <strong>러프 기획안 업로드</strong>
        <p className="hint">
          PPT·PDF·TXT 등 기획안 파일을 올려주세요. PPT/PDF는 아래 입력란에 핵심 내용을
          붙여넣으면 키워드 학습 정확도가 올라갑니다.
        </p>
        <div className="upload-zone" onClick={() => briefInput.current?.click()}>
          + 기획안 파일 업로드 (ppt, pdf, txt, md)
        </div>
        <input
          hidden
          multiple
          type="file"
          accept=".ppt,.pptx,.pdf,.txt,.md,.csv,.docx"
          ref={briefInput}
          onChange={(e) => {
            onBriefFiles(e.target.files);
            e.target.value = '';
          }}
        />
        {project.briefFiles.length > 0 && (
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 12 }}>
            {project.briefFiles.map((f, i) => (
              <span key={i} className="chip">
                📄 {f.name} <span style={{ opacity: 0.6 }}>{fmtBytes(f.size)}</span>
              </span>
            ))}
          </div>
        )}
        <label className="label">기획안 핵심 내용 (붙여넣기)</label>
        <textarea
          className="input"
          style={{ minHeight: 140 }}
          placeholder="제품 소개, 타깃, 핵심 특징, 차별점 등 기획안의 핵심 텍스트를 붙여넣어 주세요."
          value={project.briefText}
          onChange={(e) => updateProject(project.id, { briefText: e.target.value })}
        />
      </div>

      <div className="card" style={{ marginTop: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <strong>옴니버스 자산</strong>
          <span className="hint">제품·패키지·캐릭터·인물이 모든 컷에서 일관되게 나오도록 하는 기준 자산</span>
        </div>
        <p className="hint">
          여기 등록한 이미지와 설명은 AI 이미지 생성 시 항상 프롬프트에 함께 전달되어
          (미드저니 옴니레퍼런스 방식) 동일한 외형을 유지합니다.
        </p>
        <div className="omni-grid" style={{ marginTop: 8 }}>
          {project.omni.map((o) => (
            <div key={o.id} className="omni-card">
              {o.dataUrl ? (
                <img className="omni-img" src={o.dataUrl} alt={o.name} />
              ) : (
                <div
                  className="upload-zone"
                  style={{ padding: 16, fontSize: 13 }}
                  onClick={() => omniInputs.current[o.id]?.click()}
                >
                  + 기준 이미지
                </div>
              )}
              <input
                hidden
                type="file"
                accept="image/*"
                ref={(el) => {
                  omniInputs.current[o.id] = el;
                }}
                onChange={async (e) => {
                  const f = e.target.files?.[0];
                  if (f) patchOmni(o.id, { dataUrl: await readFileAsDataUrl(f) });
                  e.target.value = '';
                }}
              />
              <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
                <select
                  className="input"
                  style={{ width: 110, padding: '7px 8px', fontSize: 13 }}
                  value={o.role}
                  onChange={(e) => patchOmni(o.id, { role: e.target.value as OmniRole })}
                >
                  {(Object.keys(ROLE_LABEL) as OmniRole[]).map((r) => (
                    <option key={r} value={r}>{ROLE_LABEL[r]}</option>
                  ))}
                </select>
                <input
                  className="input"
                  style={{ padding: '7px 10px', fontSize: 13 }}
                  placeholder="이름"
                  value={o.name}
                  onChange={(e) => patchOmni(o.id, { name: e.target.value })}
                />
              </div>
              <textarea
                className="input"
                style={{ marginTop: 6, minHeight: 56, fontSize: 13 }}
                placeholder="일관성 설명 — 예) 크라프트지 파우치, 초록 라벨, 손글씨 로고"
                value={o.description}
                onChange={(e) => patchOmni(o.id, { description: e.target.value })}
              />
              {o.dataUrl && (
                <button
                  className="btn subtle sm"
                  style={{ marginTop: 6 }}
                  onClick={() => omniInputs.current[o.id]?.click()}
                >
                  이미지 변경
                </button>
              )}
              <button
                className="btn danger sm"
                style={{ marginTop: 6, marginLeft: 6 }}
                onClick={() =>
                  updateProject(project.id, { omni: project.omni.filter((x) => x.id !== o.id) })
                }
              >
                삭제
              </button>
            </div>
          ))}
          <button className="upload-zone" style={{ minHeight: 120 }} onClick={addOmni}>
            + 옴니버스 자산 추가
          </button>
        </div>
      </div>

      <div className="card" style={{ marginTop: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button className="btn" onClick={learn} disabled={!project.briefText && project.omni.length === 0}>
            ✨ 제품 특징 학습하기
          </button>
          <span className="hint">기획안과 옴니버스 설명에서 핵심 키워드를 추출해 이후 단계에 반영합니다.</span>
        </div>
        {project.keywords.length > 0 && (
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 14 }}>
            {project.keywords.map((k) => (
              <span key={k} className="chip">#{k}</span>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
