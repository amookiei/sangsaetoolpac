import { useStore } from '../state/store';

export function TopBar() {
  const { view, setView, isAdmin, logout, userId } = useStore();
  return (
    <header className="topbar">
      <div className="brand">
        <div className="logo-mark">상</div>
        상세 스튜디오
      </div>
      <button
        className={`nav-link ${view === 'dashboard' ? 'on' : ''}`}
        onClick={() => setView('dashboard')}
      >
        홈
      </button>
      {isAdmin && (
        <button
          className={`nav-link ${view === 'admin' ? 'on' : ''}`}
          onClick={() => setView('admin')}
        >
          스타일 학습 (관리자)
        </button>
      )}
      <div className="spacer" />
      <span className="hint">{userId}</span>
      <button className="btn subtle sm" onClick={logout}>
        로그아웃
      </button>
    </header>
  );
}
