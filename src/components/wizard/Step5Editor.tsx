import { useRef, useState } from 'react';
import { useStore } from '../../state/store';
import { BUILTIN_FONTS } from '../../data/fonts';
import { PLATFORM_WIDTH } from '../../data/categories';
import { applyStyleGuide, guideOf } from '../../data/styleGuide';
import { TEMPLATE_GROUPS, TEXT_TEMPLATES, instantiate } from '../../data/textTemplates';
import { readFileAsDataUrl, imageSize } from '../../utils/files';
import { addRun, clearRuns, clampRuns, isRangeBold } from '../../utils/richText';
import { bodyStyleOf } from '../../data/styleGuide';
import { translateSectionFree, type TransLang } from '../../utils/freeTranslate';
import { resolveSection, untranslatedCount, VIEW_LANGS } from '../../data/viewLang';
import { useT } from '../../i18n';
import { CLIP_ANIMS, effectiveUnit } from '../../data/typoAnimations';
import { SectionPreview } from '../editor/SectionPreview';
import { AnimPicker } from '../editor/AnimPicker';
import { StyleGuideModal } from '../editor/StyleGuideModal';
import type { Block, Project } from '../../state/types';

const HIGHLIGHTS = ['#fff176', '#a5f3c4', '#bcd7ff', '#ffc9e0', '#e6d4ff', '#1a1a2e'];
const CARD_BGS = ['#f6f7f9', '#fff4ec', '#fdf3f8', '#eef4ff', '#ff6b52', '#1a1a2e'];

const uid = () => Math.random().toString(36).slice(2, 10);

/** 5단계: Canva 스타일 디자인 에디터 — 스타일 정립·텍스트 템플릿·폰트·모션 편집 */
export function Step5Editor({ project }: { project: Project }) {
  const { updateProject, updateSection, customFonts, addCustomFont, viewLang, setViewLang } = useStore();
  const t = useT();
  const [secIdx, setSecIdx] = useState(0);
  const [selBlock, setSelBlock] = useState<string | null>(null);
  const [tab, setTab] = useState<'sections' | 'templates' | 'layers'>('sections');
  const layerImgInput = useRef<HTMLInputElement>(null);
  const pendingLayerId = useRef<string | null>(null);
  const [showGuide, setShowGuide] = useState(false);
  const [selRange, setSelRange] = useState<{ start: number; end: number } | null>(null);
  const [runColor, setRunColor] = useState('#d97757');
  const [runHl, setRunHl] = useState('#fff176');
  const [transBusy, setTransBusy] = useState('');
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [overIdx, setOverIdx] = useState<number | null>(null);
  const imgInput = useRef<HTMLInputElement>(null);
  const fontInput = useRef<HTMLInputElement>(null);
  const contentTaRef = useRef<HTMLTextAreaElement>(null);

  const width = PLATFORM_WIDTH[project.platform];
  const guide = guideOf(project);
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

  const patchBlockById = (bid: string, patch: Partial<Block>) =>
    updateSection(project.id, sec.id, {
      blocks: sec.blocks.map((b) => (b.id === bid ? { ...b, ...patch } : b)),
    });
  const patchBlock = (patch: Partial<Block>) => {
    if (block) patchBlockById(block.id, patch);
  };

  /** 섹션 복사 — 새 id로 깊은 복제 후 바로 뒤에 삽입 (구조 리스트도 동기화) */
  const duplicateSection = (idx: number) => {
    const src = project.sections[idx];
    const copy = {
      ...src,
      id: uid(),
      name: `${src.name} 복사본`,
      blocks: src.blocks.map((b) => ({ ...b, id: uid(), runs: b.runs?.map((r) => ({ ...r })) })),
      bgLayers: src.bgLayers?.map((L) => ({ ...L, id: uid() })),
    };
    const sections = [...project.sections];
    sections.splice(idx + 1, 0, copy);
    const structure =
      project.structure.length === project.sections.length
        ? (() => {
            const st = [...project.structure];
            st.splice(idx + 1, 0, { ...st[idx], name: copy.name });
            return st;
          })()
        : project.structure;
    updateProject(project.id, { sections, structure });
    setSecIdx(idx + 1);
  };

  /** 섹션 이름 바꾸기 */
  const renameSection = (idx: number) => {
    const s = project.sections[idx];
    const name = prompt('섹션 이름', s.name)?.trim();
    if (!name || name === s.name) return;
    const sections = project.sections.map((x, i) => (i === idx ? { ...x, name } : x));
    const structure =
      project.structure.length === project.sections.length
        ? project.structure.map((x, i) => (i === idx ? { ...x, name } : x))
        : project.structure;
    updateProject(project.id, { sections, structure });
  };

  /** 섹션 삭제 */
  const removeSection = (idx: number) => {
    const s = project.sections[idx];
    if (!confirm(`'${s.name}' 섹션을 삭제할까요?`)) return;
    const sections = project.sections.filter((_, i) => i !== idx);
    const structure =
      project.structure.length === project.sections.length
        ? project.structure.filter((_, i) => i !== idx)
        : project.structure;
    updateProject(project.id, { sections, structure });
    setSecIdx((cur) => Math.max(0, Math.min(cur > idx ? cur - 1 : cur, sections.length - 1)));
    setSelBlock(null);
  };

  /** 섹션 드래그 순서 변경 */
  const moveSection = (from: number, to: number) => {
    if (from === to) return;
    const next = [...project.sections];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    updateProject(project.id, { sections: next });
    setSecIdx(to);
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

  const addBlock = (kind: Block['kind'], asNumber = false) => {
    const nb: Block = {
      id: uid(),
      kind,
      text: asNumber ? '01' : kind === 'heading' ? '새 제목' : kind === 'body' ? '새 본문 텍스트' : '',
      imageDesc: kind === 'image' ? '[이미지] 직접 업로드하거나 6단계에서 AI 생성' : '',
      imageDataUrl: null,
      imgW: 0,
      imgH: 0,
      font: project.globalFont,
      fontSize: asNumber ? guide.numberSize : kind === 'heading' ? 32 : 20,
      color: asNumber ? guide.numberColor : '#222222',
      highlight: null,
      align: 'center',
      bold: kind === 'heading' || asNumber,
      animation: null,
      numberShape: asNumber ? guide.numberShape : null,
      numberShapeColor: asNumber ? guide.numberShapeColor : undefined,
      cardBg: null,
    };
    updateSection(project.id, sec.id, { blocks: [...sec.blocks, nb] });
    setSelBlock(nb.id);
  };

  const insertTemplate = (tplId: string) => {
    const tpl = TEXT_TEMPLATES.find((t) => t.id === tplId);
    if (!tpl) return;
    const blocks = instantiate(tpl, project.globalFont, guide);
    updateSection(project.id, sec.id, { blocks: [...sec.blocks, ...blocks] });
    setSelBlock(blocks[blocks.length - 1].id);
  };

  /** 무료 번역 — 선택 섹션들을 현재 보기 언어로 번역해 translations에 저장 (비파괴) */
  const translatePages = async (targetSections: typeof project.sections, lang: TransLang) => {
    const ids = new Set(targetSections.map((s) => s.id));
    let updated = project.sections;
    const total = targetSections.length;
    let i = 0;
    for (const s of project.sections) {
      if (!ids.has(s.id)) continue;
      i += 1;
      setTransBusy(`번역 중… (${i}/${total})`);
      try {
        const translated = await translateSectionFree(s, lang);
        updated = updated.map((x) => (x.id === s.id ? translated : x));
        updateProject(project.id, { sections: updated });
      } catch {
        /* 섹션 실패 시 다음으로 */
      }
    }
    setTransBusy('');
  };

  const scale = Math.min(1, 620 / width);
  const previewSection = resolveSection(sec, viewLang);
  const untranslated = untranslatedCount(sec, viewLang);

  return (
    <>
      <div className="wz-head">
        <h2>5. {t('디자인 에디터')}</h2>
        <button className="btn ghost sm" onClick={() => setShowGuide(true)}>
          🎨 {t('디자인 스타일 정립')}
        </button>
        <span style={{ display: 'inline-flex', gap: 4, alignItems: 'center' }}>
          <span className="hint" style={{ marginRight: 2 }}>🌐 보기</span>
          {VIEW_LANGS.map((l) => (
            <button
              key={l.code}
              className={`chip selectable ${viewLang === l.code ? 'on' : ''}`}
              onClick={() => setViewLang(l.code)}
            >
              {l.label}
            </button>
          ))}
        </span>
        {viewLang !== 'ko' && (
          <span style={{ display: 'inline-flex', gap: 6, alignItems: 'center' }}>
            <button
              className="btn subtle sm"
              disabled={!!transBusy}
              onClick={() => translatePages([sec], viewLang as TransLang)}
            >
              이 페이지 번역
            </button>
            <button
              className="btn subtle sm"
              disabled={!!transBusy}
              onClick={() => translatePages(project.sections, viewLang as TransLang)}
            >
              전체 번역
            </button>
            {transBusy && <span className="hint">{transBusy}</span>}
          </span>
        )}
        <span className="hint">
          {viewLang === 'ko'
            ? `블록을 클릭해 세부 조정 (기준 폭 ${width}px)`
            : '무료 번역(0원) · 원문은 그대로, 추출 시 이 언어로 나옵니다'}
        </span>
      </div>

      {showGuide && (
        <StyleGuideModal
          initial={guide}
          fontOptions={allFonts}
          onClose={() => setShowGuide(false)}
          onApply={(g) => {
            updateProject(project.id, applyStyleGuide(project, g));
            setShowGuide(false);
          }}
        />
      )}

      <div className="editor">
        <aside className="ed-secs">
          <div style={{ display: 'flex', gap: 4, marginBottom: 10 }}>
            <button
              className={`chip selectable ${tab === 'sections' ? 'on' : ''}`}
              onClick={() => setTab('sections')}
            >
              섹션
            </button>
            <button
              className={`chip selectable ${tab === 'templates' ? 'on' : ''}`}
              onClick={() => setTab('templates')}
            >
              T 텍스트
            </button>
            <button
              className={`chip selectable ${tab === 'layers' ? 'on' : ''}`}
              onClick={() => setTab('layers')}
            >
              레이어
            </button>
          </div>

          {tab === 'sections' && (
            <>
              <p className="hint" style={{ margin: '0 0 6px' }}>꾹 눌러 드래그하면 순서가 바뀝니다</p>
              {project.sections.map((s, i) => (
                <div
                  key={s.id}
                  draggable
                  role="button"
                  className={`ed-sec-item ${i === secIdx ? 'on' : ''} ${dragIdx === i ? 'dragging' : ''} ${overIdx === i && dragIdx !== null && dragIdx !== i ? 'drag-over' : ''}`}
                  onClick={() => {
                    setSecIdx(i);
                    setSelBlock(null);
                  }}
                  onDragStart={() => setDragIdx(i)}
                  onDragOver={(e) => {
                    e.preventDefault();
                    setOverIdx(i);
                  }}
                  onDragLeave={() => setOverIdx((o) => (o === i ? null : o))}
                  onDrop={(e) => {
                    e.preventDefault();
                    if (dragIdx !== null) moveSection(dragIdx, i);
                    setDragIdx(null);
                    setOverIdx(null);
                  }}
                  onDragEnd={() => {
                    setDragIdx(null);
                    setOverIdx(null);
                  }}
                >
                  <span className="sec-name">⠿ {i + 1}. {s.name}</span>
                  <span className="sec-actions">
                    <button
                      className="icon-btn"
                      title="섹션 복사"
                      onClick={(e) => {
                        e.stopPropagation();
                        duplicateSection(i);
                      }}
                    >
                      ⧉
                    </button>
                    <button
                      className="icon-btn"
                      title="이름 바꾸기"
                      onClick={(e) => {
                        e.stopPropagation();
                        renameSection(i);
                      }}
                    >
                      ✎
                    </button>
                    <button
                      className="icon-btn"
                      title="섹션 삭제"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeSection(i);
                      }}
                    >
                      ✕
                    </button>
                  </span>
                </div>
              ))}
              <div style={{ marginTop: 12, display: 'grid', gap: 6 }}>
                <button className="btn ghost sm" onClick={() => addBlock('heading')}>+ 제목 블록</button>
                <button className="btn ghost sm" onClick={() => addBlock('body')}>+ 본문 블록</button>
                <button className="btn ghost sm" onClick={() => addBlock('image')}>+ 이미지 블록</button>
                <button className="btn ghost sm" onClick={() => addBlock('heading', true)}>+ 숫자 뱃지 블록</button>
              </div>
            </>
          )}

          {tab === 'templates' && (
            <div className="tpl-list">
              <p className="hint" style={{ marginTop: 0 }}>
                클릭하면 현재 섹션 「{sec.name}」 끝에 추가됩니다.
              </p>
              {TEMPLATE_GROUPS.map((g) => (
                <div key={g}>
                  <div className="anim-group-label">{g}</div>
                  {TEXT_TEMPLATES.filter((t) => t.group === g).map((t) => (
                    <button key={t.id} className="tpl-item" onClick={() => insertTemplate(t.id)}>
                      <span className="tpl-label">{t.label}</span>
                      <span className="tpl-preview">{t.preview}</span>
                    </button>
                  ))}
                </div>
              ))}
            </div>
          )}

          {tab === 'layers' && (
            <div className="tpl-list">
              <p className="hint" style={{ marginTop: 0 }}>
                레이어 1은 블록 콘텐츠, 레이어 2부터는 그 아래에 깔리는 배경 레이어입니다.
                (현재 섹션 「{sec.name}」)
              </p>

              {/* 레이어 1 — 블록 콘텐츠 */}
              <div className="layer-card">
                <div className="layer-head">
                  <strong style={{ fontSize: 12.5 }}>레이어 1 · 블록 콘텐츠</strong>
                  <span style={{ flex: 1 }} />
                  <button
                    className="icon-btn"
                    title={sec.contentLocked ? '잠금 해제' : '잠금 (캔버스에서 편집 불가)'}
                    onClick={() => updateSection(project.id, sec.id, { contentLocked: !sec.contentLocked })}
                  >
                    {sec.contentLocked ? '🔒' : '🔓'}
                  </button>
                </div>
                <div className="layer-op">
                  <span className="hint">불투명도 {Math.round((sec.contentOpacity ?? 1) * 100)}%</span>
                  <input
                    type="range" min={10} max={100} value={Math.round((sec.contentOpacity ?? 1) * 100)}
                    onChange={(e) => updateSection(project.id, sec.id, { contentOpacity: +e.target.value / 100 })}
                  />
                </div>
              </div>

              {/* 레이어 2+ */}
              {(sec.bgLayers ?? []).map((L, i) => {
                const patchLayer = (patch: Partial<typeof L>) =>
                  updateSection(project.id, sec.id, {
                    bgLayers: (sec.bgLayers ?? []).map((x) => (x.id === L.id ? { ...x, ...patch } : x)),
                  });
                return (
                  <div key={L.id} className="layer-card" style={{ opacity: L.hidden ? 0.5 : 1 }}>
                    <div className="layer-head">
                      <button
                        className="icon-btn"
                        title={L.hidden ? '보이기' : '숨기기'}
                        onClick={() => patchLayer({ hidden: !L.hidden })}
                      >
                        {L.hidden ? '🚫' : '👁'}
                      </button>
                      <strong style={{ fontSize: 12.5 }}>레이어 {i + 2}</strong>
                      {L.imageDataUrl && (
                        <img src={L.imageDataUrl} style={{ width: 30, height: 20, objectFit: 'cover', borderRadius: 4 }} />
                      )}
                      <span style={{ flex: 1 }} />
                      <button
                        className="icon-btn"
                        title={L.locked ? '잠금 해제' : '잠금'}
                        onClick={() => patchLayer({ locked: !L.locked })}
                      >
                        {L.locked ? '🔒' : '🔓'}
                      </button>
                      <button
                        className="icon-btn"
                        title="레이어 삭제"
                        disabled={L.locked}
                        onClick={() =>
                          updateSection(project.id, sec.id, {
                            bgLayers: (sec.bgLayers ?? []).filter((x) => x.id !== L.id),
                          })
                        }
                      >
                        ✕
                      </button>
                    </div>
                    <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginTop: 6 }}>
                      <button
                        className="btn subtle sm"
                        disabled={L.locked}
                        onClick={() => {
                          pendingLayerId.current = L.id;
                          layerImgInput.current?.click();
                        }}
                      >
                        이미지
                      </button>
                      <input
                        type="color"
                        disabled={L.locked}
                        value={L.color ?? '#f5ede2'}
                        onChange={(e) => patchLayer({ color: e.target.value, imageDataUrl: null })}
                      />
                      {L.imageDataUrl && (
                        <button className="btn subtle sm" disabled={L.locked} onClick={() => patchLayer({ imageDataUrl: null })}>
                          이미지 제거
                        </button>
                      )}
                    </div>
                    <div className="layer-op">
                      <span className="hint">불투명도 {Math.round(L.opacity * 100)}%</span>
                      <input
                        type="range" min={5} max={100} value={Math.round(L.opacity * 100)}
                        disabled={L.locked}
                        onChange={(e) => patchLayer({ opacity: +e.target.value / 100 })}
                      />
                    </div>
                  </div>
                );
              })}

              <button
                className="btn ghost sm"
                style={{ width: '100%', marginTop: 6 }}
                onClick={() =>
                  updateSection(project.id, sec.id, {
                    bgLayers: [
                      { id: uid(), name: '', imageDataUrl: null, color: '#f5ede2', opacity: 1, locked: false, hidden: false },
                      ...(sec.bgLayers ?? []),
                    ],
                  })
                }
              >
                + 레이어 추가
              </button>
              <input
                hidden
                type="file"
                accept="image/*"
                ref={layerImgInput}
                onChange={async (e) => {
                  const f = e.target.files?.[0];
                  e.target.value = '';
                  const lid = pendingLayerId.current;
                  if (!f || !lid) return;
                  const dataUrl = await readFileAsDataUrl(f);
                  updateSection(project.id, sec.id, {
                    bgLayers: (sec.bgLayers ?? []).map((x) =>
                      x.id === lid ? { ...x, imageDataUrl: dataUrl } : x,
                    ),
                  });
                }}
              />
            </div>
          )}
        </aside>

        <div className="ed-canvas-wrap" onClick={() => setSelBlock(null)}>
          <div>
            <div className="panel-caption">
              {viewLang === 'ko'
                ? '프리뷰창 — 글자를 드래그하면 작업창에 선택이 표시됩니다'
                : `프리뷰창 — ${viewLang.toUpperCase()} 번역 보기${untranslated > 0 ? ` (미번역 ${untranslated}개는 원문 표시)` : ''}`}
            </div>
            <div className="ed-canvas" style={{ width: width * scale }}>
            <div style={{ zoom: scale }}>
              <SectionPreview
                section={previewSection}
                width={width}
                selectedBlock={selBlock}
                onSelectBlock={setSelBlock}
                zoom={scale}
                onResizeBlock={(bid, h) => patchBlockById(bid, { heightPx: h })}
                onResizeTop={(bid, p) => patchBlockById(bid, { padTop: p || null })}
                onReorderBlocks={(fromId, toId, pos) => {
                  const blocks = [...sec.blocks];
                  const fromIdx = blocks.findIndex((b) => b.id === fromId);
                  if (fromIdx < 0) return;
                  const [moved] = blocks.splice(fromIdx, 1);
                  let toIdx = blocks.findIndex((b) => b.id === toId);
                  if (toIdx < 0) {
                    blocks.splice(fromIdx, 0, moved);
                  } else {
                    if (pos === 'after') toIdx += 1;
                    blocks.splice(toIdx, 0, moved);
                  }
                  updateSection(project.id, sec.id, { blocks });
                }}
                onTextSelect={
                  viewLang === 'ko'
                    ? (blockId, start, end) => {
                        setSelBlock(blockId);
                        setSelRange({ start, end });
                        // 프리뷰창 드래그 범위를 우측 작업창 텍스트에도 선택 표시
                        requestAnimationFrame(() => {
                          const ta = contentTaRef.current;
                          if (ta) {
                            ta.focus({ preventScroll: true });
                            ta.setSelectionRange(start, end);
                          }
                        });
                      }
                    : undefined
                }
              />
            </div>
          </div>
          </div>
        </div>

        <aside className="ed-inspector card" style={{ padding: 18 }}>
          <div className="panel-caption" style={{ marginTop: 0 }}>작업창</div>
          <strong style={{ fontSize: 14 }}>섹션: {sec.name}</strong>
          <label className="label">섹션 배경</label>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <input
              type="color"
              value={sec.bg}
              onChange={(e) => updateSection(project.id, sec.id, { bg: e.target.value })}
            />
            <label style={{ display: 'flex', gap: 5, alignItems: 'center', fontSize: 13, fontWeight: 600 }}>
              <input
                type="checkbox"
                checked={!!sec.bgGrad}
                onChange={(e) =>
                  updateSection(project.id, sec.id, {
                    bgGrad: e.target.checked ? { color2: '#fde7d8', angle: 180 } : null,
                  })
                }
              />
              그라디언트
            </label>
            {sec.bgGrad && (
              <input
                type="color"
                value={sec.bgGrad.color2}
                onChange={(e) =>
                  updateSection(project.id, sec.id, { bgGrad: { ...sec.bgGrad!, color2: e.target.value } })
                }
              />
            )}
          </div>
          {sec.bgGrad && (
            <>
              <label className="label">그라디언트 방향 · {sec.bgGrad.angle}°</label>
              <input
                type="range"
                min={0}
                max={360}
                step={15}
                value={sec.bgGrad.angle}
                style={{ width: '100%' }}
                onChange={(e) =>
                  updateSection(project.id, sec.id, { bgGrad: { ...sec.bgGrad!, angle: +e.target.value } })
                }
              />
            </>
          )}
          {guide.gradients.length > 0 && (
            <>
              <label className="label">저장된 그라데이션 (스타일 정립에서 관리)</label>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {guide.gradients.map((gr, i) => (
                  <button
                    key={gr.id}
                    title={`${i + 1}번 그라데이션 적용`}
                    onClick={() =>
                      updateSection(project.id, sec.id, {
                        bg: gr.color1,
                        bgGrad: { color2: gr.color2, angle: gr.angle },
                      })
                    }
                    style={{
                      width: 44, height: 26, borderRadius: 7, cursor: 'pointer',
                      border: '1.5px solid var(--line)',
                      background: `linear-gradient(${gr.angle}deg, ${gr.color1}, ${gr.color2})`,
                    }}
                  />
                ))}
              </div>
            </>
          )}

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
              {viewLang === 'ko' ? (
                <>
                  <label className="label">내용</label>
                  <textarea
                    ref={contentTaRef}
                    className="input"
                    value={block.text}
                    onChange={(e) =>
                      patchBlock({ text: e.target.value, runs: clampRuns(block.runs, e.target.value.length) })
                    }
                    onSelect={(e) => {
                      const el = e.currentTarget;
                      setSelRange({ start: el.selectionStart, end: el.selectionEnd });
                    }}
                  />
                </>
              ) : (
                <>
                  <label className="label">내용 ({viewLang.toUpperCase()} 번역 — 직접 수정 가능)</label>
                  <textarea
                    className="input"
                    placeholder={block.text}
                    value={block.translations?.[viewLang] ?? ''}
                    onChange={(e) =>
                      patchBlock({ translations: { ...block.translations, [viewLang]: e.target.value } })
                    }
                  />
                  <p className="hint" style={{ marginTop: 4 }}>원문(한국어): {block.text}</p>
                </>
              )}
              {viewLang === 'ko' && (
              <>
              <label className="label">부분 스타일 — 작업창(캔버스)이나 위 입력창에서 글자를 드래그한 뒤 적용</label>
              {(() => {
                const hasSel = !!selRange && selRange.start !== selRange.end;
                const allBold = hasSel && isRangeBold(block, selRange!.start, selRange!.end);
                return (
                  <>
                    <div className="run-row">
                      <span className="run-label">굵게</span>
                      <button
                        className={`btn subtle sm ${allBold ? 'on' : ''}`}
                        disabled={!hasSel}
                        onClick={() =>
                          selRange &&
                          patchBlock({ runs: addRun(block.runs, { ...selRange, bold: !allBold }) })
                        }
                      >
                        {allBold ? 'B 굵게 해제' : 'B 굵게'}
                      </button>
                    </div>
                    <div className="run-row">
                      <span className="run-label">글자색</span>
                      <input type="color" value={runColor} onChange={(e) => setRunColor(e.target.value)} />
                      <button
                        className="btn subtle sm"
                        disabled={!hasSel}
                        onClick={() =>
                          selRange && patchBlock({ runs: addRun(block.runs, { ...selRange, color: runColor }) })
                        }
                      >
                        적용
                      </button>
                    </div>
                    <div className="run-row">
                      <span className="run-label">형광펜</span>
                      <input type="color" value={runHl} onChange={(e) => setRunHl(e.target.value)} />
                      <button
                        className="btn subtle sm"
                        disabled={!hasSel}
                        onClick={() =>
                          selRange && patchBlock({ runs: addRun(block.runs, { ...selRange, highlight: runHl }) })
                        }
                      >
                        적용
                      </button>
                      <button
                        className="btn subtle sm"
                        disabled={!hasSel || !block.runs?.length}
                        onClick={() =>
                          selRange && patchBlock({ runs: clearRuns(block.runs, selRange.start, selRange.end) })
                        }
                      >
                        스타일 지우기
                      </button>
                    </div>
                    {hasSel && (
                      <p className="hint" style={{ marginTop: 6 }}>
                        선택됨: “{block.text.slice(selRange!.start, selRange!.end)}”
                      </p>
                    )}
                  </>
                );
              })()}
              <button
                className="btn ghost sm"
                style={{ marginTop: 8 }}
                onClick={() =>
                  patchBlock({
                    color: guide.emphasisColor,
                    highlight: guide.emphasisHighlight,
                    bold: true,
                  })
                }
              >
                ✨ 강조 스타일 적용
              </button>
              </>
              )}
              <label className="label">블록 특성 (스타일 정립과 연동)</label>
              <select
                className="input"
                value={block.styleId ?? (block.kind === 'heading' ? 'heading' : guide.bodyStyles[0].id)}
                onChange={(e) => {
                  const v = e.target.value;
                  if (v === 'heading') {
                    patchBlock({
                      kind: 'heading',
                      styleId: 'heading',
                      font: guide.headingFont,
                      fontSize: guide.headingSize,
                      color: guide.headingColor,
                      bold: guide.headingBold,
                    });
                  } else {
                    const st = bodyStyleOf(guide, v);
                    patchBlock({
                      kind: 'body',
                      styleId: st.id,
                      font: st.font,
                      fontSize: st.size,
                      color: st.color,
                      bold: false,
                    });
                  }
                }}
              >
                <option value="heading">제목</option>
                {guide.bodyStyles.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
              <label className="label">폰트</label>
              <select className="input" value={block.font} onChange={(e) => patchBlock({ font: e.target.value })}>
                {allFonts.map((f) => (
                  <option key={f.family} value={f.family}>{f.label}</option>
                ))}
              </select>
              <label className="label">크기 · {block.fontSize}px (최대 200px)</label>
              <input
                type="range"
                min={12}
                max={200}
                value={block.fontSize}
                style={{ width: '100%' }}
                onChange={(e) => patchBlock({ fontSize: +e.target.value })}
              />
              <div style={{ display: 'flex', gap: 8, marginTop: 10, alignItems: 'center' }}>
                <label className="label" style={{ margin: 0 }}>글자색</label>
                <input type="color" value={block.color} onChange={(e) => patchBlock({ color: e.target.value })} />
                <button
                  className={`chip selectable ${block.bold ? 'on' : ''}`}
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
              {(block.highlight || block.runs?.some((r) => r.highlight)) && (
                <>
                  <label className="label">형광펜 라운딩 · {block.hlRadius ?? 4}px</label>
                  <input
                    type="range" min={0} max={24} value={block.hlRadius ?? 4}
                    style={{ width: '100%' }}
                    onChange={(e) => patchBlock({ hlRadius: +e.target.value })}
                  />
                  <label className="label">형광펜 넓이(좌우) · {block.hlPad ?? 8}px</label>
                  <input
                    type="range" min={0} max={24} value={block.hlPad ?? 8}
                    style={{ width: '100%' }}
                    onChange={(e) => patchBlock({ hlPad: +e.target.value })}
                  />
                </>
              )}
              <label className="label">카드 배경 (블록 전체 박스)</label>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                <button className={`chip selectable ${!block.cardBg ? 'on' : ''}`} onClick={() => patchBlock({ cardBg: null })}>
                  없음
                </button>
                {CARD_BGS.map((h) => (
                  <button
                    key={h}
                    onClick={() => patchBlock({ cardBg: h })}
                    style={{
                      width: 26, height: 26, borderRadius: 8, background: h, cursor: 'pointer',
                      border: block.cardBg === h ? '2.5px solid var(--violet)' : '1.5px solid var(--line)',
                    }}
                  />
                ))}
              </div>
              <label className="label">숫자 뱃지 모양</label>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                <button className={`chip selectable ${!block.numberShape ? 'on' : ''}`} onClick={() => patchBlock({ numberShape: null })}>
                  없음
                </button>
                {(['circle', 'triangle', 'square', 'underline'] as const).map((s) => (
                  <button
                    key={s}
                    className={`chip selectable ${block.numberShape === s ? 'on' : ''}`}
                    onClick={() => patchBlock({ numberShape: s, numberShapeColor: block.numberShapeColor ?? guide.numberShapeColor })}
                  >
                    {s === 'circle' ? '⬤' : s === 'triangle' ? '▲' : s === 'square' ? '■' : '밑줄'}
                  </button>
                ))}
                {block.numberShape && (
                  <input
                    type="color"
                    title="도형 색"
                    value={block.numberShapeColor ?? guide.numberShapeColor}
                    onChange={(e) => patchBlock({ numberShapeColor: e.target.value })}
                  />
                )}
              </div>
              <label className="label">타이포 애니메이션 (와디즈 GIF 스타일)</label>
              <AnimPicker value={block.animation} onChange={(id) => patchBlock({ animation: id })} />
              {block.animation && (
                <>
                  <label className="label">애니메이션 단위</label>
                  <div style={{ display: 'flex', gap: 6 }}>
                    {CLIP_ANIMS.has(block.animation) ? (
                      <span className="hint">이 프리셋은 줄별로만 재생됩니다</span>
                    ) : (
                      (['char', 'line'] as const).map((u) => (
                        <button
                          key={u}
                          className={`chip selectable ${effectiveUnit(block.animation, block.animUnit) === u ? 'on' : ''}`}
                          onClick={() => patchBlock({ animUnit: u })}
                        >
                          {u === 'char' ? '글자별 (위에서부터)' : '줄별 (순서대로)'}
                        </button>
                      ))
                    )}
                  </div>
                  <label className="label">속도 · {(block.animSpeed ?? 1).toFixed(2)}×</label>
                  <input
                    type="range"
                    min={0.25}
                    max={3}
                    step={0.25}
                    value={block.animSpeed ?? 1}
                    style={{ width: '100%' }}
                    onChange={(e) => patchBlock({ animSpeed: +e.target.value })}
                  />
                </>
              )}
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
              <label className="label">이미지 애니메이션</label>
              <AnimPicker
                blockOnly
                value={block.animation}
                onChange={(id) => patchBlock({ animation: id })}
              />
              {block.animation && (
                <>
                  <label className="label">속도 · {(block.animSpeed ?? 1).toFixed(2)}×</label>
                  <input
                    type="range"
                    min={0.25}
                    max={3}
                    step={0.25}
                    value={block.animSpeed ?? 1}
                    style={{ width: '100%' }}
                    onChange={(e) => patchBlock({ animSpeed: +e.target.value })}
                  />
                </>
              )}
            </>
          )}

          {block && (
            <>
              <label className="label">
                블록 높이 {block.heightPx ? `· ${block.heightPx}px` : '· 자동'} / 위 여백 {block.padTop ? `${block.padTop}px` : '0'}
              </label>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                <input
                  className="input"
                  style={{ width: 96, padding: '7px 10px' }}
                  type="number"
                  min={40}
                  step={10}
                  placeholder="높이"
                  title="블록 높이 (px)"
                  value={block.heightPx ?? ''}
                  onChange={(e) =>
                    patchBlock({ heightPx: e.target.value ? Math.max(40, +e.target.value) : null })
                  }
                />
                <input
                  className="input"
                  style={{ width: 96, padding: '7px 10px' }}
                  type="number"
                  min={0}
                  step={10}
                  placeholder="위 여백"
                  title="블록 위 여백 (px)"
                  value={block.padTop ?? ''}
                  onChange={(e) =>
                    patchBlock({ padTop: e.target.value ? Math.max(0, +e.target.value) : null })
                  }
                />
                <button className="btn subtle sm" onClick={() => patchBlock({ heightPx: null, padTop: null })}>
                  초기화
                </button>
              </div>
              <p className="hint" style={{ marginTop: 6 }}>
                캔버스에서 선택한 블록의 위/아래 주황 핸들을 드래그해도 됩니다.
                위 핸들 = 상단 여백, 아래 핸들 = 블록 높이(상단 고정).
              </p>
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
            </>
          )}
        </aside>
      </div>
    </>
  );
}
