import { useRef, useState } from 'react';
import { useStore } from '../../state/store';
import { BUILTIN_FONTS } from '../../data/fonts';
import { PLATFORM_WIDTH } from '../../data/categories';
import { readFileAsDataUrl, imageSize } from '../../utils/files';
import { SectionPreview } from '../editor/SectionPreview';
import { AnimPicker } from '../editor/AnimPicker';
import type { Block, Project } from '../../state/types';

const HIGHLIGHTS = ['#fff176', '#a5f3c4', '#bcd7ff', '#ffc9e0', '#e6d4ff', '#1a1a2e'];

/** 5단계: Canva 스타일 디자인 에디터 — 폰트·색·배경·이미지·타이포 모션 편집 */
export function Step5Editor({ project }: { project: Project }) {
  const { updateProject, updateSection, customFonts, addCustomFont } = useStore();
  const [secIdx, setSecIdx] = useState(0);
  const [selBlock, setSelBlock] = useState<string | null>(null);
  const imgInput = useRef<HTMLInputElement>(null);
  const fontInput = useRef<HTMLInputElement>(null);

  const width = PLATFORM_WIDTH[project.platform];
  const sec = project.sections[Math.min(secIdx, project.sections.length - 1)];
  if (!sec) {
    return (
      <div className="card" style={{ textAlign: 'center', padding: 48 }}>
        4단계에서 먼저 기획안을 생성해 주세요.
      </div>
    );
  }
  const block = sec.blocks.find((b) => b.id === selBlock) ?? null;
  const allFonts = [
    ...BUILTIN_FONTS.map((f) => ({ family: f.family, label: f.label })),
    ...customFonts.map((f) => ({ family: f.family, label: `${f.family} (업로드)` })),
  ];

  const patchBlock = (patch: Partial<Block>) => {
    if (!block) return;
    updateSection(project.id, sec.id, {
      blocks: sec.blocks.map((b) => (b.id === block.id ? { ...b, ...patch } : b)),
    });
  };

  const applyFontToAll = (family: string) => {
    updateProject(project.id, {
      globalFont: family,
      sections: project.sections.map((s) => ({
        ...s,
        blocks: s.blocks.map((b) => ({ ...b, font: family })),
      })),
    });
  };

  const uploadFont = async (f: File) => {
    const family = f.name.replace(/\.(ttf|otf|woff2?)$/i, '');
    const dataUrl = await readFileAsDataUrl(f);
    const face = new FontFace(family, `url(${dataUrl})`);
    try {
      document.fonts.add(await face.load());
      addCustomFont({ id: Math.random().toString(36).slice(2), family, dataUrl });
      if (block) patchBlock({ font: family });
    } catch {
      alert('폰트 파일을 읽을 수 없습니다. (ttf/otf/woff 지원)');
    }
  };

  const uploadImage = async (f: File) => {
    const dataUrl = await readFileAsDataUrl(f);
    const { w, h } = await imageSize(dataUrl);
    patchBlock({ imageDataUrl: dataUrl, imgW: w, imgH: h });
  };

  const addBlock = (kind: Block['kind']) => {
    const nb: Block = {
      id: Math.random().toString(36).slice(2, 10),
      kind,
      text: kind === 'heading' ? '새 제목' : kind === 'body' ? '새 본문 텍스트' : '',
      imageDesc: kind === 'image' ? '[이미지] 직접 업로드하거나 6단계에서 AI 생성' : '',
      imageDataUrl: null,
      imgW: 0,
      imgH: 0,
      font: project.globalFont,
      fontSize: kind === 'heading' ? 32 : 20,
      color: '#222222',
      highlight: null,
      align: 'center',
      bold: kind === 'heading',
      animation: null,
    };
    updateSection(project.id, sec.id, { blocks: [...sec.blocks, nb] });
    setSelBlock(nb.id);
  };

  const scale = Math.min(1, 620 / width);

  return (
    <>
      <div className="wz-head">
        <h2>5. 디자인 에디터</h2>
        <span className="hint">블록을 클릭해 폰트·색·배경·모션을 조정하세요 (기준 폭 {width}px)</span>
      </div>
      <div className="editor">
        <aside className="ed-secs">
          {project.sections.map((s, i) => (
            <button
              key={s.id}
              className={`ed-sec-item ${i === secIdx ? 'on' : ''}`}
              onClick={() => {
                setSecIdx(i);
                setSelBlock(null);
              }}
            >
              {i + 1}. {s.name}
            </button>
          ))}
          <div style={{ marginTop: 12, display: 'grid', gap: 6 }}>
            <button className="btn ghost sm" onClick={() => addBlock('heading')}>+ 제목 블록</button>
            <button className="btn ghost sm" onClick={() => addBlock('body')}>+ 본문 블록</button>
            <button className="btn ghost sm" onClick={() => addBlock('image')}>+ 이미지 블록</button>
          </div>
        </aside>

        <div className="ed-canvas-wrap" onClick={() => setSelBlock(null)}>
          <div className="ed-canvas" style={{ width: width * scale }}>
            <div style={{ zoom: scale }}>
              <SectionPreview
                section={sec}
                width={width}
                selectedBlock={selBlock}
                onSelectBlock={setSelBlock}
              />
            </div>
          </div>
        </div>

        <aside className="ed-inspector card" style={{ padding: 18 }}>
          <strong style={{ fontSize: 14 }}>섹션: {sec.name}</strong>
          <label className="label">섹션 배경색</label>
          <input
            type="color"
            value={sec.bg}
            onChange={(e) => updateSection(project.id, sec.id, { bg: e.target.value })}
          />

          <label className="label">전체 폰트 한 번에 적용</label>
          <select className="input" value={project.globalFont} onChange={(e) => applyFontToAll(e.target.value)}>
            {allFonts.map((f) => (
              <option key={f.family} value={f.family}>{f.label}</option>
            ))}
          </select>
          <button className="btn subtle sm" style={{ marginTop: 8 }} onClick={() => fontInput.current?.click()}>
            + 폰트 파일 업로드 (ttf/otf/woff)
          </button>
          <input
            hidden
            type="file"
            accept=".ttf,.otf,.woff,.woff2"
            ref={fontInput}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) uploadFont(f);
              e.target.value = '';
            }}
          />

          <hr style={{ border: 'none', borderTop: '1px solid var(--line)', margin: '18px 0' }} />

          {!block && <p className="hint">캔버스에서 블록을 클릭하면 세부 설정이 열립니다.</p>}

          {block && block.kind !== 'image' && (
            <>
              <strong style={{ fontSize: 13 }}>텍스트 블록</strong>
              <label className="label">내용</label>
              <textarea
                className="input"
                value={block.text}
                onChange={(e) => patchBlock({ text: e.target.value })}
              />
              <label className="label">폰트</label>
              <select className="input" value={block.font} onChange={(e) => patchBlock({ font: e.target.value })}>
                {allFonts.map((f) => (
                  <option key={f.family} value={f.family}>{f.label}</option>
                ))}
              </select>
              <label className="label">크기 · {block.fontSize}px</label>
              <input
                type="range"
                min={12}
                max={72}
                value={block.fontSize}
                style={{ width: '100%' }}
                onChange={(e) => patchBlock({ fontSize: +e.target.value })}
              />
              <div style={{ display: 'flex', gap: 8, marginTop: 10, alignItems: 'center' }}>
                <label className="label" style={{ margin: 0 }}>글자색</label>
                <input type="color" value={block.color} onChange={(e) => patchBlock({ color: e.target.value })} />
                <button
                  className={`chip selectable sm ${block.bold ? 'on' : ''}`}
                  onClick={() => patchBlock({ bold: !block.bold })}
                >
                  B
                </button>
                {(['left', 'center', 'right'] as const).map((a) => (
                  <button
                    key={a}
                    className={`chip selectable ${block.align === a ? 'on' : ''}`}
                    onClick={() => patchBlock({ align: a })}
                  >
                    {a === 'left' ? '좌' : a === 'center' ? '중' : '우'}
                  </button>
                ))}
              </div>
              <label className="label">폰트 배경 (형광펜)</label>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                <button className={`chip selectable ${!block.highlight ? 'on' : ''}`} onClick={() => patchBlock({ highlight: null })}>
                  없음
                </button>
                {HIGHLIGHTS.map((h) => (
                  <button
                    key={h}
                    onClick={() => patchBlock({ highlight: h })}
                    style={{
                      width: 26, height: 26, borderRadius: 8, background: h, cursor: 'pointer',
                      border: block.highlight === h ? '2.5px solid var(--violet)' : '1.5px solid var(--line)',
                    }}
                  />
                ))}
              </div>
              <label className="label">타이포 애니메이션 (와디즈 GIF 스타일)</label>
              <AnimPicker value={block.animation} onChange={(id) => patchBlock({ animation: id })} />
            </>
          )}

          {block && block.kind === 'image' && (
            <>
              <strong style={{ fontSize: 13 }}>이미지 블록</strong>
              <p className="img-desc" style={{ marginTop: 10 }}>{block.imageDesc}</p>
              <button className="btn" style={{ marginTop: 10, width: '100%' }} onClick={() => imgInput.current?.click()}>
                이미지 업로드
              </button>
              <input
                hidden
                type="file"
                accept="image/*"
                ref={imgInput}
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) uploadImage(f);
                  e.target.value = '';
                }}
              />
              {block.imageDataUrl && (
                <button
                  className="btn subtle sm"
                  style={{ marginTop: 8 }}
                  onClick={() => patchBlock({ imageDataUrl: null, imgW: 0, imgH: 0 })}
                >
                  이미지 제거
                </button>
              )}
              <p className="hint" style={{ marginTop: 10 }}>
                비워두면 6단계에서 파란 묘사를 프롬프트로 AI 이미지를 생성할 수 있어요.
              </p>
            </>
          )}

          {block && (
            <button
              className="btn danger sm"
              style={{ marginTop: 16 }}
              onClick={() => {
                updateSection(project.id, sec.id, { blocks: sec.blocks.filter((b) => b.id !== block.id) });
                setSelBlock(null);
              }}
            >
              블록 삭제
            </button>
          )}
        </aside>
      </div>
    </>
  );
}
