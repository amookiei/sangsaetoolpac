import type { Block, Section } from '../../state/types';
import { TypoText } from './TypoText';

/**
 * 섹션 라이브 미리보기 (HTML 렌더 — 애니메이션 실시간 재생).
 * 추출 시에는 동일 데이터를 layout.ts 기반 SVG/PNG 렌더러가 그린다.
 */
export function SectionPreview({
  section,
  width,
  selectedBlock,
  onSelectBlock,
}: {
  section: Section;
  width: number;
  selectedBlock: string | null;
  onSelectBlock: (id: string) => void;
}) {
  return (
    <div style={{ width, background: section.bg, padding: '72px 64px' }}>
      {section.blocks.map((b) => (
        <div
          key={b.id}
          className={`ed-block ${selectedBlock === b.id ? 'sel' : ''}`}
          onClick={(e) => {
            e.stopPropagation();
            onSelectBlock(b.id);
          }}
          style={{ marginBottom: 32 }}
        >
          <BlockView b={b} />
        </div>
      ))}
    </div>
  );
}

function BlockView({ b }: { b: Block }) {
  if (b.kind === 'image') {
    if (b.imageDataUrl) {
      return <img src={b.imageDataUrl} style={{ width: '100%', borderRadius: 2, display: 'block' }} />;
    }
    return (
      <div
        className="img-desc"
        style={{ minHeight: 240, display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}
      >
        {b.imageDesc || '이미지 영역 — 에디터에서 업로드하거나 6단계에서 AI로 생성'}
      </div>
    );
  }
  const weight = b.bold || b.kind === 'heading' ? 800 : 400;
  return (
    <div style={{ textAlign: b.align, lineHeight: 1.55 }}>
      {b.text.split('\n').map((line, i) => (
        <div key={i}>
          <TypoText
            text={line}
            animId={b.animation}
            style={{
              fontFamily: `"${b.font}", "Noto Sans KR", sans-serif`,
              fontSize: b.fontSize,
              fontWeight: weight,
              color: b.color,
              background: b.highlight ?? undefined,
              padding: b.highlight ? '0 8px' : undefined,
              borderRadius: b.highlight ? 4 : undefined,
              boxDecorationBreak: 'clone',
            }}
          />
        </div>
      ))}
    </div>
  );
}
