import { useStore } from '../../state/store';
import { defaultGradient, paintToCss } from '../../data/paint';
import type { Paint } from '../../state/types';

/**
 * 단색/그라데이션 채움 피커 + 저장 팔레트.
 * 모든 컬러 설정에서 공용으로 쓰는 인라인 위젯.
 */
export function PaintPicker({
  value,
  onChange,
  allowGradient = true,
  label,
}: {
  value: Paint;
  onChange: (p: Paint) => void;
  allowGradient?: boolean;
  label?: string;
}) {
  const palette = useStore((s) => s.palette);
  const savePaletteColor = useStore((s) => s.savePaletteColor);
  const removePaletteColor = useStore((s) => s.removePaletteColor);

  const isGrad = value.type === 'gradient';
  const baseColor = value.type === 'solid' ? value.color : value.stops[0]?.color ?? '#000000';

  const applySwatch = (c: string) => {
    if (value.type === 'solid') onChange({ type: 'solid', color: c });
    else onChange({ ...value, stops: value.stops.map((s, i) => (i === 0 ? { ...s, color: c } : s)) });
  };

  return (
    <div className="paint-picker">
      {label && <label className="label" style={{ marginTop: 0 }}>{label}</label>}
      {allowGradient && (
        <div style={{ display: 'flex', gap: 4, marginBottom: 6 }}>
          <button
            className={`chip selectable ${!isGrad ? 'on' : ''}`}
            onClick={() => onChange({ type: 'solid', color: baseColor })}
          >
            단색
          </button>
          <button
            className={`chip selectable ${isGrad ? 'on' : ''}`}
            onClick={() => onChange(isGrad ? value : defaultGradient(baseColor))}
          >
            그라데이션
          </button>
        </div>
      )}

      {value.type === 'solid' && (
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <input type="color" value={value.color} onChange={(e) => onChange({ type: 'solid', color: e.target.value })} />
          <input
            className="input"
            style={{ width: 96, padding: '6px 8px', fontSize: 12.5 }}
            value={value.color}
            onChange={(e) => onChange({ type: 'solid', color: e.target.value })}
          />
        </div>
      )}

      {value.type === 'gradient' && (
        <>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            {value.stops.map((s, i) => (
              <input
                key={i}
                type="color"
                title={`색 ${i + 1}`}
                value={s.color}
                onChange={(e) =>
                  onChange({ ...value, stops: value.stops.map((x, j) => (j === i ? { ...x, color: e.target.value } : x)) })
                }
              />
            ))}
            <span
              style={{ flex: 1, height: 22, borderRadius: 6, border: '1px solid var(--line)', background: paintToCss(value) }}
            />
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 6 }}>
            <span className="hint" style={{ width: 64 }}>각도 {value.angle}°</span>
            <input
              type="range" min={0} max={360} step={15} value={value.angle} style={{ flex: 1 }}
              onChange={(e) => onChange({ ...value, angle: +e.target.value })}
            />
          </div>
        </>
      )}

      {/* 저장 팔레트 */}
      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', alignItems: 'center', marginTop: 8 }}>
        {palette.map((c) => (
          <button
            key={c}
            title={`${c} (적용 · 우클릭 삭제)`}
            onClick={() => applySwatch(c)}
            onContextMenu={(e) => {
              e.preventDefault();
              removePaletteColor(c);
            }}
            style={{ width: 20, height: 20, borderRadius: 5, background: c, cursor: 'pointer', border: '1.5px solid var(--line)' }}
          />
        ))}
        <button className="icon-btn" title="현재 색 팔레트에 저장" onClick={() => savePaletteColor(baseColor)}>
          +
        </button>
      </div>
    </div>
  );
}
