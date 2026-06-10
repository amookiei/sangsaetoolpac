import { useState } from 'react';
import type { StyleGuide } from '../../state/types';
import { BUILTIN_FONTS } from '../../data/fonts';

/** 디자인 스타일 정립 모달 — 제목/본문/강조/숫자/배경 스타일을 정의하고 전체 적용 */
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
          <div>
            <div className="sg-title">제목 (강조 문구)</div>
            <label className="label">폰트</label>
            <select className="input" value={g.headingFont} onChange={(e) => patch({ headingFont: e.target.value })}>
              {fonts.map((f) => (
                <option key={f.family} value={f.family}>{f.label}</option>
              ))}
            </select>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginTop: 10 }}>
              <label className="label" style={{ margin: 0 }}>색상</label>
              <input type="color" value={g.headingColor} onChange={(e) => patch({ headingColor: e.target.value })} />
              <button
                className={`chip selectable ${g.headingBold ? 'on' : ''}`}
                onClick={() => patch({ headingBold: !g.headingBold })}
              >
                굵게
              </button>
            </div>
          </div>

          <div>
            <div className="sg-title">설명 문구 (본문)</div>
            <label className="label">폰트</label>
            <select className="input" value={g.bodyFont} onChange={(e) => patch({ bodyFont: e.target.value })}>
              {fonts.map((f) => (
                <option key={f.family} value={f.family}>{f.label}</option>
              ))}
            </select>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginTop: 10 }}>
              <label className="label" style={{ margin: 0 }}>색상</label>
              <input type="color" value={g.bodyColor} onChange={(e) => patch({ bodyColor: e.target.value })} />
              <label className="label" style={{ margin: 0 }}>크기 {g.bodySize}px</label>
              <input
                type="range" min={14} max={32} value={g.bodySize}
                onChange={(e) => patch({ bodySize: +e.target.value })}
              />
            </div>
          </div>

          <div>
            <div className="sg-title">강조 색 & 형광펜</div>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginTop: 8 }}>
              <label className="label" style={{ margin: 0 }}>강조 색</label>
              <input type="color" value={g.emphasisColor} onChange={(e) => patch({ emphasisColor: e.target.value })} />
              <label className="label" style={{ margin: 0 }}>형광펜</label>
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

          <div>
            <div className="sg-title">숫자 스타일 (00%, POINT 01 등)</div>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginTop: 8 }}>
              <label className="label" style={{ margin: 0 }}>숫자 강조 색</label>
              <input type="color" value={g.numberColor} onChange={(e) => patch({ numberColor: e.target.value })} />
            </div>
          </div>

          <div>
            <div className="sg-title">배경</div>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginTop: 8 }}>
              <label className="label" style={{ margin: 0 }}>섹션 배경</label>
              <input type="color" value={g.pageBg} onChange={(e) => patch({ pageBg: e.target.value })} />
              <label className="label" style={{ margin: 0 }}>카드 배경</label>
              <input type="color" value={g.cardBg} onChange={(e) => patch({ cardBg: e.target.value })} />
            </div>
          </div>

          <div>
            <div className="sg-title">미리보기</div>
            <div style={{ background: g.pageBg, borderRadius: 12, padding: 16, border: '1px solid var(--line)' }}>
              <div style={{ fontFamily: `"${g.headingFont}"`, fontWeight: g.headingBold ? 800 : 400, fontSize: 22, color: g.headingColor }}>
                제목이 이렇게 보여요
              </div>
              <div style={{ fontFamily: `"${g.headingFont}"`, fontSize: 16, marginTop: 6 }}>
                <span style={{ color: g.emphasisColor, background: g.emphasisHighlight ?? undefined, padding: '0 4px', fontWeight: 700 }}>
                  강조 문구
                </span>{' '}
                <span style={{ color: g.numberColor, fontWeight: 800 }}>00%</span>
              </div>
              <div style={{ fontFamily: `"${g.bodyFont}"`, fontSize: Math.min(g.bodySize, 16), color: g.bodyColor, marginTop: 6 }}>
                설명 문구는 이런 톤으로 들어갑니다.
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
