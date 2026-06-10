import { useEffect } from 'react';
import { useStore } from './state/store';
import { Login } from './components/Login';
import { TopBar } from './components/TopBar';
import { Dashboard } from './components/Dashboard';
import { AdminPanel } from './components/AdminPanel';
import { Wizard } from './components/wizard/Wizard';

export default function App() {
  const view = useStore((s) => s.view);
  const loggedIn = useStore((s) => s.loggedIn);
  const customFonts = useStore((s) => s.customFonts);

  // 업로드된 커스텀 폰트를 FontFace로 등록
  useEffect(() => {
    for (const f of customFonts) {
      if ([...document.fonts].some((ff) => ff.family === f.family)) continue;
      const face = new FontFace(f.family, `url(${f.dataUrl})`);
      face
        .load()
        .then((loaded) => document.fonts.add(loaded))
        .catch(() => console.warn(`폰트 로드 실패: ${f.family}`));
    }
  }, [customFonts]);

  if (!loggedIn || view === 'login') return <Login />;

  return (
    <>
      <TopBar />
      {view === 'dashboard' && <Dashboard />}
      {view === 'admin' && <AdminPanel />}
      {view === 'wizard' && <Wizard />}
    </>
  );
}
