import { useState } from 'react';
import type { NumberShape, StyleGuide } from '../../state/types';
import { BUILTIN_FONTS } from '../../data/fonts';

const SHAPE_LABEL: Record<NumberShape, string> = {
  circle: '⬤ 동그라미',
  triangle: '▲ 세모',
  square: '■ 네모',
  underline: '__ 밑줄만',
};

/** 디자인 스타일 정립 모달 — 제목 / 내용 / 숫자 / 배경색 / 그라데이션 5개 섹션 */
export function StyleGuideModal({
  initial,
  fontOptions,
  onApply,
  onClose,
}: {
  initial: StyleGuide;
  fontOptions: { family: string; label: string }[];
  onApply: (g: StyleGuide) => void;
  onClose: () => void;
}) {
  const [g, setG] = useState<StyleGuide>(initial);
  const patch = (p: Partial<StyleGuide>) => setG((prev) => ({ ...prev, ...p }));
  const fonts = fontOptions.length
    ? fontOptions
    : BUILTIN_FONTS.map((f) => ({ family: f.family, label: f.label }));

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal card" onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <strong style={{ fontSize: 17 }}>🎨 디자인 스타일 정립</strong>
          <span className="hint">한 번 정해두면 모든 섹션에 일괄 적용됩니다</span>
        </div>

        <div className="sg-grid">
          {/* ── 제목 ── */}
          <div className="sg-section">
            <div className="sg-title">제목</div>
            <label className="label">폰트</label>
            <select className="input" value={g.headingFont} onChange={(e) => patch({ headingFont: e.target.value })}>
              {fonts.map((f) => (
                <option key={f.family} value={f.family}>{f.label}</option>
              ))}
            </select>
            <label className="label">크기 · {g.headingSize}px</label>
            <input
              type="range" min={18} max={200} value={g.headingSize}
              style={{ width: '100%' }}
              onChange={(e) => patch({ headingSize: +e.target.value })}
            />
            <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginTop: 8 }}>
              <label className="label" style={{ margin: 0 }}>폰트 컬러</label>
              <input type="color" value={g.headingColor} onChange={(e) => patch({ headingColor: e.target.value })} />
              <button
                className={`chip selectable ${g.headingBold ? 'on' : ''}`}
                onClick={() => patch({ headingBold: !g.headingBold })}
              >
                굵게
              </button>
            </div>
          </div>

          {/* ── 내용 ── */}
          <div className="sg-section">
            <div className="sg-title">내용</div>
            <label className="label">폰트</label>
            <select className="input" value={g.bodyFont} onChange={(e) => patch({ bodyFont: e.target.value })}>
              {fonts.map((f) => (
                <option key={f.family} value={f.family}>{f.label}</option>
              ))}
            </select>
            <label className="label">크기 · {g.bodySize}px</label>
            <input
              type="range" min={12} max={48} value={g.bodySize}
              style={{ width: '100%' }}
              onChange={(e) => patch({ bodySize: +e.target.value })}
            />
            <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginTop: 8 }}>
              <label className="label" style={{ margin: 0 }}>폰트 컬러</label>
              <input type="color" value={g.bodyColor} onChange={(e) => patch({ bodyColor: e.target.value })} />
            </div>
          </div>

          {/* ── 숫자 ── */}
          <div className="sg-section">
            <div className="sg-title">숫자 (POINT 01, 00% 등)</div>
            <label className="label">배경 모양</label>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {(Object.keys(SHAPE_LABEL) as NumberShape[]).map((s) => (
                <button
                  key={s}
                  className={`chip selectable ${g.numberShape === s ? 'on' : ''}`}
                  onClick={() => patch({ numberShape: s })}
                >
                  {SHAPE_LABEL[s]}
                </button>
              ))}
            </div>
            <label className="label">크기 · {g.numberSize}px</label>
            <input
              type="range" min={14} max={96} value={g.numberSize}
              style={{ width: '100%' }}
              onChange={(e) => patch({ numberSize: +e.target.value })}
            />
            <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginTop: 8, flexWrap: 'wrap' }}>
              <label className="label" style={{ margin: 0 }}>폰트 컬러</label>
              <input type="color" value={g.numberColor} onChange={(e) => patch({ numberColor: e.target.value })} />
              <label className="label" style={{ margin: 0 }}>배경 도형 컬러</label>
              <input type="color" value={g.numberShapeColor} onChange={(e) => patch({ numberShapeColor: e.target.value })} />
            </div>
          </div>

          {/* ── 배경색 ── */}
          <div className="sg-section">
            <div className="sg-title">배경색</div>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginTop: 8 }}>
              <label className="label" style={{ margin: 0 }}>섹션 배경</label>
              <input type="color" value={g.pageBg} onChange={(e) => patch({ pageBg: e.target.value })} />
              <label className="label" style={{ margin: 0 }}>카드 배경</label>
              <input type="color" value={g.cardBg} onChange={(e) => patch({ cardBg: e.target.value })} />
            </div>
            <label className="label">강조 색 & 형광펜</label>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              <input type="color" value={g.emphasisColor} onChange={(e) => patch({ emphasisColor: e.target.value })} />
              <input
                type="color"
                value={g.emphasisHighlight ?? '#fff176'}
                onChange={(e) => patch({ emphasisHighlight: e.target.value })}
              />
              <button className="chip selectable" onClick={() => patch({ emphasisHighlight: null })}>
                형광펜 없음
              </button>
            </div>
          </div>

          {/* ── 그라데이션 ── */}
          <div className="sg-section">
            <div className="sg-title">그라데이션</div>
            <label style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 13, fontWeight: 600, marginTop: 8 }}>
              <input
                type="checkbox"
                checked={g.gradEnabled}
                onChange={(e) => patch({ gradEnabled: e.target.checked })}
              />
              섹션 배경에 그라데이션 사용
            </label>
            {g.gradEnabled && (
              <>
                <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginTop: 8 }}>
                  <label className="label" style={{ margin: 0 }}>색상 2</label>
                  <input type="color" value={g.gradColor2} onChange={(e) => patch({ gradColor2: e.target.value })} />
                </div>
                <label className="label">방향 · {g.gradAngle}°</label>
                <input
                  type="range" min={0} max={360} step={15} value={g.gradAngle}
                  style={{ width: '100%' }}
                  onChange={(e) => patch({ gradAngle: +e.target.value })}
                />
              </>
            )}
          </div>

          {/* ── 미리보기 ── */}
          <div className="sg-section">
            <div className="sg-title">미리보기</div>
            <div
              style={{
                background: g.gradEnabled
                  ? `linear-gradient(${g.gradAngle}deg, ${g.pageBg}, ${g.gradColor2})`
                  : g.pageBg,
                borderRadius: 12, padding: 16, border: '1px solid var(--line)', textAlign: 'center',
              }}
            >
              <NumberPreview g={g} />
              <div style={{ fontFamily: `"${g.headingFont}"`, fontWeight: g.headingBold ? 800 : 400, fontSize: Math.min(g.headingSize, 26), color: g.headingColor, marginTop: 8 }}>
                제목이 이렇게 보여요
              </div>
              <div style={{ fontFamily: `"${g.bodyFont}"`, fontSize: Math.min(g.bodySize, 15), color: g.bodyColor, marginTop: 6 }}>
                내용 문구는 이런 톤으로 들어갑니다.{' '}
                <span style={{ color: g.emphasisColor, background: g.emphasisHighlight ?? undefined, fontWeight: 700, padding: '0 3px' }}>
                  강조
                </span>
              </div>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 20 }}>
          <button className="btn subtle" onClick={onClose}>닫기</button>
          <button className="btn" onClick={() => onApply(g)}>저장하고 전체 섹션에 적용</button>
        </div>
      </div>
    </div>
  );
}

function NumberPreview({ g }: { g: StyleGuide }) {
  const fs = Math.min(g.numberSize, 22);
  const base: React.CSSProperties = {
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    fontWeight: 800, fontSize: fs, color: g.numberColor,
  };
  if (g.numberShape === 'circle') {
    return <span style={{ ...base, width: fs * 2.2, height: fs * 2.2, borderRadius: '50%', background: g.numberShapeColor }}>01</span>;
  }
  if (g.numberShape === 'square') {
    return <span style={{ ...base, padding: `${fs * 0.35}px ${fs * 0.6}px`, borderRadius: 8, background: g.numberShapeColor }}>01</span>;
  }
  if (g.numberShape === 'triangle') {
    return (
      <span style={{ ...base, width: fs * 3, height: fs * 2.6, background: g.numberShapeColor, clipPath: 'polygon(50% 0, 0 100%, 100% 100%)', alignItems: 'flex-end', paddingBottom: fs * 0.25 }}>
        01
      </span>
    );
  }
  return <span style={{ ...base, borderBottom: `4px solid ${g.numberShapeColor}`, paddingBottom: 3 }}>01</span>;
}
