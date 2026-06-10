import { useRef, useState } from 'react';
import { useStore } from '../state/store';
import { CATEGORIES, CATEGORY_LABEL, PLATFORMS, PLATFORM_LABEL } from '../data/categories';
import { readFileAsDataUrl } from '../utils/files';
import type { Category, Platform } from '../state/types';

/**
 * 관리자 스타일 학습 모드.
 * 플랫폼(스마트스토어/와디즈) × 카테고리 5종 = 10개 버킷에 레퍼런스(SVG/PNG)를 업로드.
 * 저장된 레퍼런스 수와 메모는 구조 추천·AI 프롬프트의 스타일 근거로 활용된다.
 */
export function AdminPanel() {
  const { refs, addRef, removeRef, updateRefNote, accounts, addAccount, updateAccount, removeAccount } =
    useStore();
  const [platform, setPlatform] = useState<Platform>('smartstore');
  const [newId, setNewId] = useState('');
  const [newPw, setNewPw] = useState('');
  const [newKey, setNewKey] = useState('');
  const fileRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const upload = async (cat: Category, files: FileList | null) => {
    if (!files) return;
    for (const f of Array.from(files)) {
      if (!/image\/(png|svg\+xml|jpeg|webp|gif)/.test(f.type)) continue;
      const dataUrl = await readFileAsDataUrl(f);
      addRef({ platform, category: cat, name: f.name, dataUrl, mime: f.type, note: '' });
    }
  };

  return (
    <div className="dash">
      <div className="hero" style={{ padding: '32px 36px' }}>
        <h1>스타일 학습 (관리자)</h1>
        <p>
          플랫폼·카테고리별로 레퍼런스 SVG/PNG를 업로드하세요. 업로드된 레퍼런스는 구조 추천과
          AI 이미지 생성 프롬프트에 스타일 근거로 반영됩니다.
        </p>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 18 }}>
        {PLATFORMS.map((p) => (
          <button
            key={p}
            className={`chip selectable ${platform === p ? 'on' : ''}`}
            onClick={() => setPlatform(p)}
          >
            {PLATFORM_LABEL[p]} 스타일
          </button>
        ))}
      </div>

      <div className="admin-grid">
        {CATEGORIES.map((cat) => {
          const list = refs.filter((r) => r.platform === platform && r.category === cat);
          return (
            <div key={cat} className="card">
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <strong style={{ fontSize: 15 }}>{CATEGORY_LABEL[cat]}</strong>
                <span className="badge">{list.length}개 학습됨</span>
              </div>
              <div
                className="upload-zone"
                style={{ marginTop: 12, padding: 18 }}
                onClick={() => fileRefs.current[cat]?.click()}
              >
                + SVG / PNG 레퍼런스 업로드
              </div>
              <input
                hidden
                multiple
                type="file"
                accept=".png,.svg,.jpg,.jpeg,.webp,.gif"
                ref={(el) => {
                  fileRefs.current[cat] = el;
                }}
                onChange={(e) => {
                  upload(cat, e.target.files);
                  e.target.value = '';
                }}
              />
              <div className="ref-thumbs">
                {list.map((r) => (
                  <div key={r.id} className="ref-thumb" title={r.name}>
                    <img src={r.dataUrl} alt={r.name} />
                    <button className="del" onClick={() => removeRef(r.id)}>✕</button>
                  </div>
                ))}
              </div>
              {list.length > 0 && (
                <>
                  <label className="label">스타일 메모 (톤·레이아웃 특징)</label>
                  <textarea
                    className="input"
                    style={{ minHeight: 60 }}
                    placeholder="예) 큰 타이포 + 여백 많음, 파스텔 배경, 제품 클로즈업 위주"
                    value={list[list.length - 1].note}
                    onChange={(e) => updateRefNote(list[list.length - 1].id, e.target.value)}
                  />
                </>
              )}
            </div>
          );
        })}
      </div>

      <div className="card" style={{ marginTop: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <strong>계정 관리</strong>
          <span className="hint">계정별로 Gemini API 키를 미리 설정 — 로그인하면 자동 적용됩니다</span>
        </div>

        {accounts.map((a) => (
          <div key={a.id} className="export-row" style={{ marginTop: 12 }}>
            <span className="badge">{a.id}</span>
            <input
              className="input"
              style={{ flex: 1, padding: '7px 10px', fontSize: 13 }}
              type="password"
              placeholder="Gemini API 키 (AIza...)"
              value={a.geminiKey}
              onChange={(e) => updateAccount(a.id, { geminiKey: e.target.value })}
            />
            <button
              className="btn danger sm"
              onClick={() => confirm(`'${a.id}' 계정을 삭제할까요?`) && removeAccount(a.id)}
            >
              삭제
            </button>
          </div>
        ))}

        <div style={{ display: 'flex', gap: 8, marginTop: 14, flexWrap: 'wrap' }}>
          <input
            className="input"
            style={{ width: 150 }}
            placeholder="아이디"
            value={newId}
            onChange={(e) => setNewId(e.target.value)}
          />
          <input
            className="input"
            style={{ width: 150 }}
            type="password"
            placeholder="비밀번호"
            value={newPw}
            onChange={(e) => setNewPw(e.target.value)}
          />
          <input
            className="input"
            style={{ flex: 1, minWidth: 200 }}
            type="password"
            placeholder="Gemini API 키 (선택 — aistudio.google.com 무료 발급)"
            value={newKey}
            onChange={(e) => setNewKey(e.target.value)}
          />
          <button
            className="btn"
            disabled={
              !newId.trim() || !newPw.trim() || accounts.some((a) => a.id === newId.trim()) || newId.trim() === 'adminadmin'
            }
            onClick={() => {
              addAccount({ id: newId.trim(), pw: newPw, geminiKey: newKey.trim() });
              setNewId('');
              setNewPw('');
              setNewKey('');
            }}
          >
            + 계정 추가
          </button>
        </div>
        <p className="hint" style={{ marginBottom: 0, marginTop: 10 }}>
          ⚠ 개발용 로컬 저장입니다 — 운영 배포 시 Supabase Auth + 서버 측 키 관리로 교체하세요
          (docs/DATABASE.md).
        </p>
      </div>

      <div className="card" style={{ marginTop: 20 }}>
        <strong>학습이 어떻게 동작하나요?</strong>
        <p className="hint" style={{ marginBottom: 0 }}>
          현재 버전은 레퍼런스를 버킷별로 저장하고, 스타일 메모와 카테고리 무드를 구조
          추천·카피 생성·AI 이미지 프롬프트에 주입하는 방식입니다(모델 파인튜닝 아님).
          서버 기반 임베딩 검색·실제 학습 파이프라인으로 확장하는 가이드는{' '}
          <code>docs/DATABASE.md</code>를 참고하세요.
        </p>
      </div>
    </div>
  );
}
