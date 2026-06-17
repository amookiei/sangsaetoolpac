import { useRef, useState } from 'react';
import type { FloatObject } from '../../state/types';
import { paintToCss } from '../../data/paint';

type Handle = 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w';
const HANDLES: { h: Handle; sx: number; sy: number }[] = [
  { h: 'nw', sx: -1, sy: -1 }, { h: 'n', sx: 0, sy: -1 }, { h: 'ne', sx: 1, sy: -1 },
  { h: 'e', sx: 1, sy: 0 }, { h: 'se', sx: 1, sy: 1 }, { h: 's', sx: 0, sy: 1 },
  { h: 'sw', sx: -1, sy: 1 }, { h: 'w', sx: -1, sy: 0 },
];

/**
 * 자유 배치 오브젝트 오버레이 — 콘텐츠 위에서 이동/리사이즈/회전/선택(마퀴).
 * 좌표는 섹션 로컬(px). 부모가 CSS zoom 으로 축소하므로 화면 delta는 zoom 으로 나눈다.
 */
export function ObjectLayer({
  objects,
  width,
  height,
  zoom,
  selectedIds,
  interactive,
  onSelect,
  onChange,
  onMove,
  onMarquee,
}: {
  objects: FloatObject[];
  width: number;
  height: number;
  zoom: number;
  selectedIds: string[];
  interactive: boolean; // true면 빈 영역 마퀴 선택 활성(텍스트 편집 비활성), false면 오브젝트만 잡힘
  onSelect: (ids: string[]) => void;
  onChange: (obj: FloatObject) => void;
  onMove: (ids: string[], dx: number, dy: number) => void;
  onMarquee: (ids: string[]) => void;
}) {
  const [marquee, setMarquee] = useState<{ x: number; y: number; w: number; h: number } | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  const drag = (e: React.PointerEvent, fn: (dx: number, dy: number, ev: PointerEvent) => void, onEnd?: () => void) => {
    e.preventDefault();
    e.stopPropagation();
    const sx = e.clientX;
    const sy = e.clientY;
    const move = (ev: PointerEvent) => fn((ev.clientX - sx) / zoom, (ev.clientY - sy) / zoom, ev);
    const up = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      onEnd?.();
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  };

  // 회전 인지 리사이즈 (반대편 고정)
  const startResize = (e: React.PointerEvent, o: FloatObject, hs: { sx: number; sy: number }) => {
    const rot = (o.rotation * Math.PI) / 180;
    const ux = { x: Math.cos(rot), y: Math.sin(rot) };
    const uy = { x: -Math.sin(rot), y: Math.cos(rot) };
    const c0 = { x: o.x + o.w / 2, y: o.y + o.h / 2 };
    const asx = -hs.sx;
    const asy = -hs.sy;
    const anchor = {
      x: c0.x + ux.x * (asx * o.w / 2) + uy.x * (asy * o.h / 2),
      y: c0.y + ux.y * (asx * o.w / 2) + uy.y * (asy * o.h / 2),
    };
    const p0 = {
      x: c0.x + ux.x * (hs.sx * o.w / 2) + uy.x * (hs.sy * o.h / 2),
      y: c0.y + ux.y * (hs.sx * o.w / 2) + uy.y * (hs.sy * o.h / 2),
    };
    drag(e, (dx, dy) => {
      const px = p0.x + dx;
      const py = p0.y + dy;
      const du = (px - anchor.x) * ux.x + (py - anchor.y) * ux.y;
      const dv = (px - anchor.x) * uy.x + (py - anchor.y) * uy.y;
      const newW = hs.sx !== 0 ? Math.max(20, du * hs.sx) : o.w;
      const newH = hs.sy !== 0 ? Math.max(20, dv * hs.sy) : o.h;
      const cx = anchor.x + ux.x * (hs.sx * newW / 2) + uy.x * (hs.sy * newH / 2);
      const cy = anchor.y + ux.y * (hs.sx * newW / 2) + uy.y * (hs.sy * newH / 2);
      onChange({ ...o, w: Math.round(newW), h: Math.round(newH), x: Math.round(cx - newW / 2), y: Math.round(cy - newH / 2) });
    });
  };

  const startRotate = (e: React.PointerEvent, o: FloatObject) => {
    const root = rootRef.current!.getBoundingClientRect();
    const cx = root.left + (o.x + o.w / 2) * zoom;
    const cy = root.top + (o.y + o.h / 2) * zoom;
    drag(e, (_dx, _dy, ev) => {
      const ang = (Math.atan2(ev.clientY - cy, ev.clientX - cx) * 180) / Math.PI + 90;
      onChange({ ...o, rotation: Math.round(ang) });
    });
  };

  const startMarquee = (e: React.PointerEvent) => {
    if (e.target !== rootRef.current) return;
    const root = rootRef.current!.getBoundingClientRect();
    const ox = (e.clientX - root.left) / zoom;
    const oy = (e.clientY - root.top) / zoom;
    onSelect([]);
    drag(
      e,
      (dx, dy) => {
        const x = Math.min(ox, ox + dx);
        const y = Math.min(oy, oy + dy);
        setMarquee({ x, y, w: Math.abs(dx), h: Math.abs(dy) });
      },
      () => {
        setMarquee((m) => {
          if (m && (m.w > 4 || m.h > 4)) {
            const hit = objects
              .filter((o) => !o.hidden && o.x < m.x + m.w && o.x + o.w > m.x && o.y < m.y + m.h && o.y + o.h > m.y)
              .map((o) => o.id);
            onMarquee(hit);
          }
          return null;
        });
      },
    );
  };

  return (
    <div
      ref={rootRef}
      className="obj-layer"
      style={{ position: 'absolute', inset: 0, width, height, pointerEvents: interactive ? 'auto' : 'none' }}
      onPointerDown={interactive ? startMarquee : undefined}
    >
      {objects.map((o) => {
        if (o.hidden) return null;
        const sel = selectedIds.includes(o.id);
        const strokeCss =
          o.stroke && o.stroke.width > 0
            ? `${o.stroke.width}px solid ${o.stroke.paint.type === 'solid' ? o.stroke.paint.color : (o.stroke.paint.stops[0]?.color ?? '#000')}`
            : undefined;
        const shadowCss = o.shadow ? `${o.shadow.x}px ${o.shadow.y}px ${o.shadow.blur}px ${o.shadow.color}` : undefined;
        return (
          <div
            key={o.id}
            style={{
              position: 'absolute',
              left: o.x,
              top: o.y,
              width: o.w,
              height: o.h,
              opacity: o.opacity,
              transform: `rotate(${o.rotation}deg)`,
              transformOrigin: 'center',
              borderRadius: o.kind === 'ellipse' ? '50%' : o.radius ?? 0,
              background: o.kind === 'image' ? undefined : paintToCss(o.fill),
              border: strokeCss,
              boxShadow: shadowCss,
              outline: sel ? '2px solid var(--accent)' : undefined,
              outlineOffset: 0,
              cursor: o.locked ? 'default' : 'move',
              overflow: 'hidden',
              pointerEvents: 'auto',
            }}
            onPointerDown={(e) => {
              if (o.locked) return;
              e.stopPropagation();
              if (!sel) onSelect([o.id]);
              drag(e, (dx, dy) => onMove(sel && selectedIds.length > 1 ? selectedIds : [o.id], dx, dy));
            }}
          >
            {o.kind === 'image' && o.imageDataUrl && (
              <img src={o.imageDataUrl} draggable={false} style={{ width: '100%', height: '100%', objectFit: 'fill', display: 'block', pointerEvents: 'none' }} />
            )}
          </div>
        );
      })}

      {/* 단일 선택 시 핸들 (회전 미적용 박스 기준 — 시각 가이드) */}
      {selectedIds.length === 1 && (() => {
        const o = objects.find((x) => x.id === selectedIds[0]);
        if (!o || o.locked || o.hidden) return null;
        return (
          <div
            style={{
              position: 'absolute', left: o.x, top: o.y, width: o.w, height: o.h,
              transform: `rotate(${o.rotation}deg)`, transformOrigin: 'center', pointerEvents: 'none',
            }}
          >
            {HANDLES.map((H) => (
              <div
                key={H.h}
                className="obj-handle"
                style={{
                  left: `calc(${(H.sx + 1) * 50}% - 5px)`,
                  top: `calc(${(H.sy + 1) * 50}% - 5px)`,
                  pointerEvents: 'auto',
                  cursor: 'nwse-resize',
                }}
                onPointerDown={(e) => startResize(e, o, H)}
              />
            ))}
            <div
              className="obj-rotate"
              style={{ left: 'calc(50% - 6px)', top: -28, pointerEvents: 'auto' }}
              onPointerDown={(e) => startRotate(e, o)}
            />
          </div>
        );
      })()}

      {marquee && (
        <div
          style={{
            position: 'absolute', left: marquee.x, top: marquee.y, width: marquee.w, height: marquee.h,
            border: '1.5px solid var(--accent)', background: 'rgba(217,119,87,0.12)', pointerEvents: 'none',
          }}
        />
      )}
    </div>
  );
}
