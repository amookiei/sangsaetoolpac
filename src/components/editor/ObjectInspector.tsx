import type { FloatObject } from '../../state/types';
import { solid } from '../../data/paint';
import { PaintPicker } from './PaintPicker';

/** 선택한 자유 오브젝트의 Layout/Appearance/Fill/Stroke/Effects 편집 */
export function ObjectInspector({
  obj,
  onChange,
  onDelete,
  onUploadImage,
}: {
  obj: FloatObject;
  onChange: (patch: Partial<FloatObject>) => void;
  onDelete: () => void;
  onUploadImage: () => void;
}) {
  const num = (v: number) => Math.round(v);
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <strong style={{ fontSize: 13 }}>
          {obj.kind === 'image' ? '이미지' : obj.kind === 'ellipse' ? '타원' : '사각형'} 오브젝트
        </strong>
        <span style={{ flex: 1 }} />
        <button className="icon-btn" title={obj.locked ? '잠금 해제' : '잠금'} onClick={() => onChange({ locked: !obj.locked })}>
          {obj.locked ? '🔒' : '🔓'}
        </button>
      </div>

      <div className="sg-title" style={{ marginTop: 12 }}>Layout</div>
      <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
        <label className="obj-field">W
          <input className="input" type="number" value={num(obj.w)} onChange={(e) => onChange({ w: Math.max(4, +e.target.value) })} />
        </label>
        <label className="obj-field">H
          <input className="input" type="number" value={num(obj.h)} onChange={(e) => onChange({ h: Math.max(4, +e.target.value) })} />
        </label>
      </div>
      <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
        <label className="obj-field">X
          <input className="input" type="number" value={num(obj.x)} onChange={(e) => onChange({ x: +e.target.value })} />
        </label>
        <label className="obj-field">Y
          <input className="input" type="number" value={num(obj.y)} onChange={(e) => onChange({ y: +e.target.value })} />
        </label>
      </div>
      <label className="label">각도 · {obj.rotation}°</label>
      <input type="range" min={0} max={360} step={1} value={((obj.rotation % 360) + 360) % 360} style={{ width: '100%' }}
        onChange={(e) => onChange({ rotation: +e.target.value })} />
      {obj.kind === 'rect' && (
        <>
          <label className="label">모서리 둥글기 · {obj.radius ?? 0}px</label>
          <input type="range" min={0} max={120} value={obj.radius ?? 0} style={{ width: '100%' }}
            onChange={(e) => onChange({ radius: +e.target.value })} />
        </>
      )}

      <div className="sg-title" style={{ marginTop: 14 }}>Appearance</div>
      <label className="label">불투명도 · {Math.round(obj.opacity * 100)}%</label>
      <input type="range" min={5} max={100} value={Math.round(obj.opacity * 100)} style={{ width: '100%' }}
        onChange={(e) => onChange({ opacity: +e.target.value / 100 })} />

      {obj.kind === 'image' ? (
        <button className="btn subtle sm" style={{ marginTop: 10 }} onClick={onUploadImage}>이미지 교체</button>
      ) : (
        <>
          <div className="sg-title" style={{ marginTop: 14 }}>Fill</div>
          <PaintPicker value={obj.fill ?? solid('#d97757')} onChange={(p) => onChange({ fill: p })} />
        </>
      )}

      <div className="sg-title" style={{ marginTop: 14 }}>Stroke</div>
      {obj.stroke ? (
        <>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 6 }}>
            <label className="obj-field" style={{ width: 90 }}>두께
              <input className="input" type="number" min={0} value={obj.stroke.width}
                onChange={(e) => onChange({ stroke: { ...obj.stroke!, width: Math.max(0, +e.target.value) } })} />
            </label>
            <select className="input" style={{ flex: 1, padding: '6px 8px', fontSize: 12.5 }}
              value={obj.stroke.position}
              onChange={(e) => onChange({ stroke: { ...obj.stroke!, position: e.target.value as 'inside' | 'center' | 'outside' } })}>
              <option value="inside">Inside</option>
              <option value="center">Center</option>
              <option value="outside">Outside</option>
            </select>
            <button className="icon-btn" title="테두리 제거" onClick={() => onChange({ stroke: null })}>✕</button>
          </div>
          <PaintPicker value={obj.stroke.paint} onChange={(p) => onChange({ stroke: { ...obj.stroke!, paint: p } })} />
        </>
      ) : (
        <button className="btn subtle sm" style={{ marginTop: 6 }}
          onClick={() => onChange({ stroke: { paint: solid('#000000'), width: 1, position: 'inside' } })}>
          + 테두리 추가
        </button>
      )}

      <div className="sg-title" style={{ marginTop: 14 }}>Effects (그림자)</div>
      {obj.shadow ? (
        <>
          <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
            <label className="obj-field">X
              <input className="input" type="number" value={obj.shadow.x} onChange={(e) => onChange({ shadow: { ...obj.shadow!, x: +e.target.value } })} />
            </label>
            <label className="obj-field">Y
              <input className="input" type="number" value={obj.shadow.y} onChange={(e) => onChange({ shadow: { ...obj.shadow!, y: +e.target.value } })} />
            </label>
            <label className="obj-field">흐림
              <input className="input" type="number" min={0} value={obj.shadow.blur} onChange={(e) => onChange({ shadow: { ...obj.shadow!, blur: Math.max(0, +e.target.value) } })} />
            </label>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 6 }}>
            <input type="color" value={obj.shadow.color.slice(0, 7)} onChange={(e) => onChange({ shadow: { ...obj.shadow!, color: e.target.value } })} />
            <button className="icon-btn" title="그림자 제거" onClick={() => onChange({ shadow: null })}>✕</button>
          </div>
        </>
      ) : (
        <button className="btn subtle sm" style={{ marginTop: 6 }}
          onClick={() => onChange({ shadow: { x: 0, y: 6, blur: 16, color: 'rgba(0,0,0,0.25)' } })}>
          + 그림자 추가
        </button>
      )}

      <button className="btn danger sm" style={{ marginTop: 16 }} onClick={onDelete}>오브젝트 삭제</button>
    </div>
  );
}
