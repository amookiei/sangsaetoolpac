import { useRef, useState } from 'react';
import { useStore } from '../state/store';
import { CATEGORIES, CATEGORY_LABEL, CATEGORY_PALETTE, PLATFORMS, PLATFORM_LABEL } from '../data/categories';
import { exportBackup, importBackup } from '../utils/backup';
import { useT } from '../i18n';
import type { Category, Platform } from '../state/types';

export function Dashboard() {
  const { projects, createProject, openProject, deleteProject, refs } = useStore();
  const t = useT();
  const backupInput = useRef<HTMLInputElement>(null);
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

      <div className="card" style={{ marginTop: 28 }}>
        <strong>데이터 백업 / 이사</strong>
        <p className="hint">
          브라우저 저장소는 주소(URL)별로 분리됩니다 — 프리뷰 URL에서 만든 프로젝트는 프로덕션
          URL에서 보이지 않아요. 여기서 JSON으로 내보낸 뒤 다른 주소/기기에서 가져오면 그대로
          이어집니다. (Supabase 클라우드 모드면 같은 계정으로 로그인 시 자동 동기화)
        </p>
        <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
          <button
            className="btn subtle sm"
            onClick={() => {
              exportBackup();
            }}
          >
            ⬇ 전체 데이터 내보내기 (JSON)
          </button>
          <button className="btn subtle sm" onClick={() => backupInput.current?.click()}>
            ⬆ 백업 파일 가져오기
          </button>
          <input
            hidden
            type="file"
            accept=".json,application/json"
            ref={backupInput}
            onChange={async (e) => {
              const f = e.target.files?.[0];
              e.target.value = '';
              if (!f) return;
              try {
                const r = await importBackup(f);
                alert(`가져오기 완료 — 프로젝트 ${r.projects}개, 레퍼런스 ${r.refs}개 병합됨`);
              } catch (err) {
                alert(err instanceof Error ? err.message : '가져오기 실패');
              }
            }}
          />
        </div>
      </div>
    </div>
  );
}
