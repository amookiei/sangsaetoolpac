import { useState } from 'react';
import { useStore } from '../state/store';
import { CATEGORIES, CATEGORY_LABEL, CATEGORY_PALETTE, PLATFORMS, PLATFORM_LABEL } from '../data/categories';
import { useT } from '../i18n';
import type { Category, Platform } from '../state/types';

export function Dashboard() {
  const { projects, createProject, openProject, deleteProject, refs } = useStore();
  const t = useT();
  const [name, setName] = useState('');
  const [platform, setPlatform] = useState<Platform>('smartstore');
  const [category, setCategory] = useState<Category>('food');

  const refCount = (p: Platform, c: Category) =>
    refs.filter((r) => r.platform === p && r.category === c).length;

  return (
    <div className="dash">
      <div className="hero">
        <h1>{t('오늘은 어떤 상세페이지를 만들까요?')}</h1>
        <p>{t('기획안을 넣으면 구조 설계부터 후킹멘트, 디자인, SVG/PNG 추출까지 7단계로 완성됩니다.')}</p>
      </div>

      <div className="card">
        <div className="section-title" style={{ marginTop: 0 }}>{t('새 프로젝트 만들기')}</div>
        <label className="label">{t('제품/서비스 이름')}</label>
        <input
          className="input"
          placeholder="예) 곡물 그래놀라 '아침한줌'"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <label className="label">{t('플랫폼')}</label>
        <div style={{ display: 'flex', gap: 8 }}>
          {PLATFORMS.map((p) => (
            <button
              key={p}
              className={`chip selectable ${platform === p ? 'on' : ''}`}
              onClick={() => setPlatform(p)}
            >
              {t(PLATFORM_LABEL[p])}
            </button>
          ))}
        </div>
        <label className="label">{t('카테고리')}</label>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {CATEGORIES.map((c) => (
            <button
              key={c}
              className={`chip selectable ${category === c ? 'on' : ''}`}
              onClick={() => setCategory(c)}
            >
              {t(CATEGORY_LABEL[c])}
              <span className="badge" style={{ marginLeft: 2 }}>{t('학습')} {refCount(platform, c)}</span>
            </button>
          ))}
        </div>
        <div style={{ marginTop: 20 }}>
          <button
            className="btn"
            disabled={!name.trim()}
            onClick={() => {
              createProject(name.trim(), platform, category);
              setName('');
            }}
          >
            {t('+ 만들기 시작')}
          </button>
        </div>
      </div>

      <div className="section-title">{t('내 프로젝트')}</div>
      {projects.length === 0 && <div className="hint">{t('아직 프로젝트가 없어요. 위에서 첫 프로젝트를 만들어 보세요!')}</div>}
      <div className="grid cols3">
        {projects.map((p) => {
          const [c1, c2] = CATEGORY_PALETTE[p.category];
          return (
            <div key={p.id} className="card proj-card" onClick={() => openProject(p.id)}>
              <div className="proj-thumb" style={{ background: `linear-gradient(120deg, ${c1}, ${c2})` }}>
                {p.name.slice(0, 8)}
              </div>
              <div className="proj-name">{p.name}</div>
              <div className="proj-meta">
                {t(PLATFORM_LABEL[p.platform])} · {t(CATEGORY_LABEL[p.category])} · {p.step}/7 {t('단계')}
              </div>
              <div style={{ marginTop: 10, display: 'flex', justifyContent: 'flex-end' }}>
                <button
                  className="btn danger sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (confirm(`'${p.name}' 프로젝트를 삭제할까요?`)) deleteProject(p.id);
                  }}
                >
                  {t('삭제')}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
