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
  const { refs, addRef, removeRef, updateRefNote } = useStore();
  const [platform, setPlatform] = useState<Platform>('smartstore');
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
