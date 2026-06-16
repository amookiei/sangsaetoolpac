import { useMemo, useState } from 'react';
import { useStore } from '../../state/store';
import { renderSvg } from '../../utils/renderSvg';
import { renderPng, renderPngCombined } from '../../utils/renderPng';
import { renderGif } from '../../utils/renderGif';
import { layoutSection } from '../../utils/layout';
import { downloadBlob, fmtBytes, MAX_SECTION_BYTES, safeFilename } from '../../utils/files';
import { resolveSection, VIEW_LANGS } from '../../data/viewLang';
import { useT } from '../../i18n';
import type { Project, Section } from '../../state/types';

const hasAnim = (sec: Section) => sec.blocks.some((b) => b.kind !== 'image' && b.animation);

type Format = 'png' | 'svg' | 'gif';

/** 등록 플랫폼별 추출 규격 */
const DL_PLATFORMS = [
  { id: 'naver', name: '네이버 스마트 스토어', width: 860, desc: '가로 860px, G마켓 및 옥션 호환', gif: true },
  { id: 'coupang', name: '쿠팡', width: 780, desc: '가로 780px, GIF 사용 불가', gif: false },
  { id: 'toss', name: '토스', width: 1080, desc: '가로 1080px, 올웨이즈, 당근 호환', gif: true },
  { id: 'wadiz', name: '와디즈', width: 1000, desc: '가로 1000px, 펀딩 상세 기준', gif: true },
] as const;
type DlPlatformId = (typeof DL_PLATFORMS)[number]['id'];

/** 7단계: 다운로드 — 파일 형식 / 등록 플랫폼 / 페이지 선택 / 해상도 / 한 장 내보내기 */
export function Step7Export({ project }: { project: Project }) {
  const t = useT();
  const { viewLang, setViewLang } = useStore();
  const [format, setFormat] = useState<Format>('png');
  const [platformId, setPlatformId] = useState<DlPlatformId>(
    project.platform === 'wadiz' ? 'wadiz' : 'naver',
  );
  const [selected, setSelected] = useState<Set<string>>(
    () => new Set(project.sections.map((s) => s.id)),
  );
  const [singleImage, setSingleImage] = useState(false);
  const [scale, setScale] = useState(1);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState('');
  const [sizes, setSizes] = useState<Record<string, number>>({});

  const platform = DL_PLATFORMS.find((p) => p.id === platformId)!;
  const width = platform.width;
  const selSections = project.sections.filter((s) => selected.has(s.id));
  const allSelected = selected.size === project.sections.length && project.sections.length > 0;

  const resolve = (s: Section) => resolveSection(s, viewLang);

  // 다운로드 정보: 총 페이지 수와 픽셀 크기
  const totalDims = useMemo(() => {
    try {
      const h = selSections.reduce((a, s) => a + Math.ceil(layoutSection(resolve(s), width).height), 0);
      return { w: Math.round(width * (format === 'png' ? scale : 1)), h: Math.round(h * (format === 'png' ? scale : 1)) };
    } catch {
      return { w: width, h: 0 };
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selSections, width, scale, format, viewLang]);

  const toggleAll = () =>
    setSelected(allSelected ? new Set() : new Set(project.sections.map((s) => s.id)));
  const toggle = (id: string) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelected(next);
  };

  const langSuffix = viewLang === 'ko' ? '' : `_${viewLang}`;
  const fname = (idx: number, sec: Section, ext: string) =>
    `${String(idx + 1).padStart(2, '0')}_${safeFilename(sec.name)}_${platform.id}${langSuffix}.${ext}`;

  const noteSize = (id: string, n: number) => setSizes((s) => ({ ...s, [id]: n }));

  const download = async () => {
    if (selSections.length === 0) return;
    setBusy(true);
    setStatus('');
    try {
      if (format === 'png' && singleImage) {
        setStatus('한 장 이미지 합성 중…');
        const blob = await renderPngCombined(selSections.map(resolve), width, scale);
        noteSize('combined', blob.size);
        downloadBlob(blob, `${safeFilename(project.name)}_${platform.id}${langSuffix}_전체.png`);
        setStatus(blob.size > MAX_SECTION_BYTES ? `⚠ ${fmtBytes(blob.size)} — 10MB 초과` : `완료 · ${fmtBytes(blob.size)}`);
        return;
      }
      for (let i = 0; i < project.sections.length; i++) {
        const sec = project.sections[i];
        if (!selected.has(sec.id)) continue;
        const rsec = resolve(sec);
        if (format === 'svg') {
          const svg = renderSvg(rsec, width, true);
          const blob = new Blob([svg], { type: 'image/svg+xml' });
          noteSize(sec.id, blob.size);
          downloadBlob(blob, fname(i, sec, 'svg'));
        } else if (format === 'png') {
          setStatus(`PNG 생성 중 (${sec.name})…`);
          const blob = await renderPng(rsec, width, scale);
          noteSize(sec.id, blob.size);
          downloadBlob(blob, fname(i, sec, 'png'));
        } else {
          if (!hasAnim(sec)) continue;
          const blob = await renderGif(rsec, width, {
            fps: 15,
            onProgress: (r) => setStatus(`GIF 인코딩 (${sec.name}) ${Math.round(r * 100)}%`),
          });
          noteSize(sec.id, blob.size);
          downloadBlob(blob, fname(i, sec, 'gif'));
        }
        await new Promise((r) => setTimeout(r, 350)); // 다운로드 큐 여유
      }
      setStatus('완료');
    } catch (e) {
      setStatus(`오류: ${e instanceof Error ? e.message : '추출 실패'}`);
    } finally {
      setBusy(false);
    }
  };

  const gifCount = selSections.filter(hasAnim).length;
  const oversize = Object.values(sizes).some((n) => n > MAX_SECTION_BYTES);

  return (
    <>
      <div className="wz-head">
        <h2>7. {t('다운로드')}</h2>
        <span className="badge">{platform.name} · {width}px</span>
      </div>

      <div className="dl-layout">
        <div className="card dl-panel">
          <label className="label" style={{ marginTop: 0 }}>언어</label>
          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
            {VIEW_LANGS.map((l) => (
              <button
                key={l.code}
                className={`chip selectable ${viewLang === l.code ? 'on' : ''}`}
                onClick={() => setViewLang(l.code)}
              >
                {l.label}
              </button>
            ))}
          </div>
          <p className="hint" style={{ marginTop: 4 }}>
            {viewLang === 'ko'
              ? '원문(한국어)으로 추출'
              : `${viewLang.toUpperCase()} 번역본으로 추출 — 5단계에서 번역해 두면 그 언어로 나옵니다`}
          </p>

          <label className="label">{t('파일 형식')}</label>
          <select
            className="input"
            value={format}
            onChange={(e) => {
              const f = e.target.value as Format;
              setFormat(f);
              if (f !== 'png') setSingleImage(false);
            }}
          >
            <option value="png">PNG</option>
            <option value="svg">SVG (피그마 편집용)</option>
            <option value="gif" disabled={!platform.gif}>
              GIF (타이포 모션{platform.gif ? '' : ' — 이 플랫폼 사용 불가'})
            </option>
          </select>

          <label className="label">{t('등록 플랫폼')}</label>
          <select
            className="input"
            value={platformId}
            onChange={(e) => {
              const id = e.target.value as DlPlatformId;
              setPlatformId(id);
              const p = DL_PLATFORMS.find((x) => x.id === id)!;
              if (!p.gif && format === 'gif') setFormat('png');
            }}
          >
            {DL_PLATFORMS.map((p) => (
              <option key={p.id} value={p.id}>{t(p.name)} — {t(p.desc)}</option>
            ))}
          </select>

          <label className="label">{t('페이지 선택')}</label>
          <div className="dl-pages">
            <label className="dl-page-row" style={{ fontWeight: 800 }}>
              <input type="checkbox" checked={allSelected} onChange={toggleAll} />
              {t('모든 페이지 선택')}
            </label>
            {project.sections.map((s, i) => (
              <label key={s.id} className="dl-page-row">
                <input type="checkbox" checked={selected.has(s.id)} onChange={() => toggle(s.id)} />
                <span style={{ flex: 1 }}>{i + 1}. {s.name}</span>
                {hasAnim(s) && <span className="badge">GIF</span>}
              </label>
            ))}
          </div>

          {format === 'png' && (
            <>
              <label className="dl-page-row" style={{ border: 'none', padding: '12px 2px 0' }}>
                <input
                  type="checkbox"
                  checked={singleImage}
                  onChange={(e) => setSingleImage(e.target.checked)}
                />
                {t('한 장의 이미지로 내보내기')}
              </label>

              <label className="label">
                {t('출력 해상도')} <span style={{ float: 'right' }}>{scale}×</span>
              </label>
              <input
                type="range"
                min={1}
                max={4}
                step={1}
                value={scale}
                style={{ width: '100%' }}
                onChange={(e) => setScale(+e.target.value)}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between' }} className="hint">
                <span>1×</span><span>4×</span>
              </div>
            </>
          )}

          <div className="dl-info">
            ⓘ {t('다운로드 정보')}
            <br />• {selSections.length}{t('페이지')}{format === 'gif' ? ` (GIF 가능 ${gifCount})` : ''}
            <br />• {totalDims.w} × {totalDims.h} px
            {oversize && <><br />• <span className="size-over">⚠ 10MB 초과 파일 있음</span></>}
          </div>

          <button
            className="btn"
            style={{ width: '100%', marginTop: 16, padding: 13 }}
            disabled={busy || selSections.length === 0 || (format === 'gif' && gifCount === 0)}
            onClick={download}
          >
            {busy ? status || '처리 중…' : t('다운로드')}
          </button>
          {!busy && status && <p className="hint" style={{ marginTop: 8 }}>{status}</p>}
          {format === 'gif' && gifCount === 0 && (
            <p className="hint" style={{ marginTop: 8 }}>
              GIF는 타이포 애니메이션이 설정된 섹션만 추출됩니다 — 5단계에서 설정하세요.
            </p>
          )}
        </div>

        <div className="dl-list">
          {project.sections.map((sec, i) => {
            const size = sizes[sec.id];
            return (
              <div key={sec.id} className="export-row" style={{ opacity: selected.has(sec.id) ? 1 : 0.45 }}>
                <span className="badge">{i + 1}</span>
                <span className="name">{sec.name}</span>
                {hasAnim(sec) && <span className="badge">타이포 모션</span>}
                {size !== undefined && (
                  <span className={size > MAX_SECTION_BYTES ? 'size-over' : 'size-ok'}>
                    {fmtBytes(size)} {size > MAX_SECTION_BYTES ? '· 10MB 초과!' : '✓'}
                  </span>
                )}
              </div>
            );
          })}
          {project.sections.length === 0 && (
            <div className="card">먼저 4~5단계에서 상세페이지를 만들어 주세요.</div>
          )}
          <p className="hint">
            SVG는 텍스트·도형·이미지가 레이어로 유지되어 피그마에서 바로 수정할 수 있어요 (동일
            폰트 설치 필요). 플랫폼 규격에 맞춰 가로폭이 자동 조정됩니다.
          </p>
        </div>
      </div>
    </>
  );
}
