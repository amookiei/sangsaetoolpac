import { TYPO_ANIMS } from '../../data/typoAnimations';
import { TypoText } from './TypoText';

/** 와디즈 타이포 GIF 스타일 픽커 — 레퍼런스 이미지와 동일한 추천/일반 그룹 그리드 */
export function AnimPicker({
  value,
  onChange,
}: {
  value: string | null;
  onChange: (id: string | null) => void;
}) {
  const groups: Array<'추천' | '일반'> = ['추천', '일반'];
  return (
    <div>
      <button
        className={`chip selectable ${value === null ? 'on' : ''}`}
        style={{ marginBottom: 4 }}
        onClick={() => onChange(null)}
      >
        애니메이션 없음
      </button>
      {groups.map((g) => (
        <div key={g}>
          <div className="anim-group-label">{g}</div>
          <div className="anim-grid">
            {TYPO_ANIMS.filter((a) => a.group === g).map((a) => (
              <button
                key={a.id}
                className={`anim-cell ${value === a.id ? 'on' : ''}`}
                onClick={() => onChange(a.id)}
                type="button"
              >
                <div className="anim-demo">
                  <TypoText text="가나다" animId={a.id} />
                </div>
                <div className="anim-name">{a.label}</div>
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
