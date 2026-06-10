import { useStore } from '../../state/store';
import { STRUCTURES } from '../../data/structures';
import { CATEGORY_LABEL, PLATFORM_LABEL } from '../../data/categories';
import type { Project, StructureItem } from '../../state/types';

/** 2단계: 플랫폼·카테고리 학습 데이터 기반 구조 설계 (편집 가능) */
export function Step2Structure({ project }: { project: Project }) {
  const { updateProject, refs } = useStore();
  const learned = refs.filter(
    (r) => r.platform === project.platform && r.category === project.category,
  ).length;

  const set = (structure: StructureItem[]) => updateProject(project.id, { structure });
  const move = (i: number, dir: -1 | 1) => {
    const s = [...project.structure];
    const j = i + dir;
    if (j < 0 || j >= s.length) return;
    [s[i], s[j]] = [s[j], s[i]];
    set(s);
  };

  return (
    <>
      <div className="wz-head">
        <h2>2. 상세페이지 구조 설계</h2>
        <span className="badge">
          {PLATFORM_LABEL[project.platform]} · {CATEGORY_LABEL[project.category]} 표준 흐름
        </span>
        {learned > 0 && <span className="badge">학습 레퍼런스 {learned}개 반영</span>}
      </div>
      <p className="hint" style={{ marginBottom: 18 }}>
        {project.platform === 'smartstore'
          ? '스마트스토어는 구매 전환 중심 — 인트로(후킹) → 리뷰(신뢰) → 메인 소개 → 특징 → 인증 → 배송·보관 흐름이 표준입니다.'
          : '와디즈는 펀딩 설득 중심 — 타이포 인트로(GIF) → 문제제기 → 해결책 → 특징 → 비교 → 메이커 스토리 → 리워드 → FAQ 흐름이 표준입니다.'}
        {' '}섹션 이름을 수정하거나 순서를 바꾸고, 필요 없는 섹션은 삭제하세요.
      </p>

      {project.structure.map((s, i) => (
        <div key={i} className="struct-row">
          <span className="num">{i + 1}</span>
          <div className="grow">
            <input
              value={s.name}
              onChange={(e) => {
                const next = [...project.structure];
                next[i] = { ...next[i], name: e.target.value };
                set(next);
              }}
            />
            <div className="purpose">{s.purpose}</div>
          </div>
          <button className="icon-btn" title="위로" onClick={() => move(i, -1)}>↑</button>
          <button className="icon-btn" title="아래로" onClick={() => move(i, 1)}>↓</button>
          <button
            className="icon-btn"
            title="삭제"
            onClick={() => set(project.structure.filter((_, j) => j !== i))}
          >
            ✕
          </button>
        </div>
      ))}

      <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
        <button
          className="btn ghost"
          onClick={() => set([...project.structure, { name: '새 섹션', purpose: '직접 정의한 섹션' }])}
        >
          + 섹션 추가
        </button>
        <button
          className="btn subtle"
          onClick={() => set(STRUCTURES[project.platform][project.category].map((x) => ({ ...x })))}
        >
          ↺ 표준 구조로 초기화
        </button>
      </div>
    </>
  );
}
