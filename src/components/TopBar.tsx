import { useStore, type Lang } from '../state/store';
import { useT, LANGS } from '../i18n';
import { Logo } from './Logo';

export function TopBar() {
  const { view, setView, isAdmin, logout, userId, lang, setLang } = useStore();
  const t = useT();
  return (
    <header className="topbar">
      <div className="brand">
        <Logo size={34} />
        {t('상세 스튜디오')}
      </div>
      <button
        className={`nav-link ${view === 'dashboard' ? 'on' : ''}`}
        onClick={() => setView('dashboard')}
      >
        {t('홈')}
      </button>
      {isAdmin && (
        <button
          className={`nav-link ${view === 'admin' ? 'on' : ''}`}
          onClick={() => setView('admin')}
        >
          {t('스타일 학습 (관리자)')}
        </button>
      )}
      <div className="spacer" />
      <select
        className="lang-select"
        value={lang}
        onChange={(e) => setLang(e.target.value as Lang)}
        title="Language"
      >
        {LANGS.map((l) => (
          <option key={l.code} value={l.code}>{l.label}</option>
        ))}
      </select>
      <span className="hint">{userId}</span>
      <button className="btn subtle sm" onClick={logout}>
        {t('로그아웃')}
      </button>
    </header>
  );
}
