import { useEffect, useState } from 'react';
import { useStore, useCurrentProject } from '../../state/store';
import { CATEGORY_LABEL, PLATFORM_LABEL } from '../../data/categories';
import { flushCloudNow, isCloud } from '../../lib/supabaseSync';
import { useT } from '../../i18n';
import { Step1Brief } from './Step1Brief';
import { Step2Structure } from './Step2Structure';
import { Step3Hooks } from './Step3Hooks';
import { Step4Draft } from './Step4Draft';
import { Step5Editor } from './Step5Editor';
import { Step6AiGen } from './Step6AiGen';
import { Step7Export } from './Step7Export';

const STEPS = [
  { name: '기획안 & 옴니버스', desc: '자료 업로드 · 제품 학습' },
  { name: '구조 설계', desc: '플랫폼별 흐름 구성' },
  { name: '후킹멘트', desc: '3가지 스타일 제안' },
  { name: '상세 기획안', desc: '카피 + 이미지 묘사' },
  { name: '디자인 에디터', desc: '폰트 · 이미지 · 모션' },
  { name: 'AI 이미지 생성', desc: '빈 이미지 채우기' },
  { name: '추출', desc: 'SVG / PNG 내보내기' },
];

export function Wizard() {
  const project = useCurrentProject();
  const { updateProject, setView } = useStore();
  const t = useT();
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState('');

  // 중간 저장 — 로컬(IndexedDB)은 항상 자동 저장, 클라우드는 즉시 push
  const saveNow = async () => {
    setSaving(true);
    try {
      if (isCloud()) await flushCloudNow();
      setSavedAt(new Date().toLocaleTimeString('ko-KR', { hour12: false }));
    } catch {
      setSavedAt('클라우드 동기화 실패 (로컬엔 저장됨)');
    } finally {
      setSaving(false);
    }
  };
  useEffect(() => {
    if (!project) setView('dashboard');
  }, [project, setView]);
  if (!project) return null;
  const step = project.step;
  const go = (n: number) => updateProject(project.id, { step: Math.min(Math.max(n, 1), 7) });

  return (
    <div className="wizard">
      <nav className="wz-steps">
        <div style={{ padding: '4px 12px 14px' }}>
          <div style={{ fontWeight: 900, fontSize: 15 }}>{project.name}</div>
          <div className="hint">
            {t(PLATFORM_LABEL[project.platform])} · {t(CATEGORY_LABEL[project.category])}
          </div>
        </div>
        {STEPS.map((s, i) => {
          const n = i + 1;
          const locked = n > step + 1;
          return (
            <button
              key={n}
              className={`wz-step ${n === step ? 'on' : ''} ${n < step ? 'done' : ''} ${locked ? 'locked' : ''}`}
              onClick={() => !locked && go(n)}
            >
              <span className="wz-num">{n < step ? '✓' : n}</span>
              <span>
                <span className="wz-step-name">{t(s.name)}</span>
                <div className="wz-step-desc">{t(s.desc)}</div>
              </span>
            </button>
          );
        })}
      </nav>

      <main className="wz-body">
        {step === 1 && <Step1Brief project={project} />}
        {step === 2 && <Step2Structure project={project} />}
        {step === 3 && <Step3Hooks project={project} />}
        {step === 4 && <Step4Draft project={project} />}
        {step === 5 && <Step5Editor project={project} />}
        {step === 6 && <Step6AiGen project={project} />}
        {step === 7 && <Step7Export project={project} />}
      </main>

      <div className="wz-foot">
        <button className="btn subtle" disabled={step <= 1} onClick={() => go(step - 1)}>
          {t('← 이전 단계')}
        </button>
        <span style={{ display: 'inline-flex', gap: 12, alignItems: 'center' }}>
          <span className="hint">
            {step}/7 · {t(STEPS[step - 1].name)}
          </span>
          <button className="btn ghost sm" disabled={saving} onClick={saveNow}>
            {saving ? '저장 중…' : '💾 중간 저장'}
          </button>
          {savedAt && <span className="hint">저장됨 · {savedAt}</span>}
        </span>
        <button className="btn" disabled={step >= 7} onClick={() => go(step + 1)}>
          {t('다음 단계 →')}
        </button>
      </div>
    </div>
  );
}
