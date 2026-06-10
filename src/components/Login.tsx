import { useState } from 'react';
import { useStore } from '../state/store';
import { useT } from '../i18n';
import { Logo } from './Logo';

export function Login() {
  const login = useStore((s) => s.login);
  const t = useT();
  const [id, setId] = useState('');
  const [pw, setPw] = useState('');
  const [err, setErr] = useState('');

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!login(id.trim(), pw)) setErr(t('아이디 또는 비밀번호가 올바르지 않습니다.'));
  };

  return (
    <div className="login-wrap">
      <form className="card login-card" onSubmit={submit}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 14 }}>
          <Logo size={60} />
        </div>
        <div className="login-title">{t('상세 스튜디오')}</div>
        <div className="login-sub">{t('레퍼런스를 학습해 상세페이지를 단계별로 만들어 드려요')}</div>
        <input
          className="input"
          placeholder={t('아이디')}
          value={id}
          onChange={(e) => setId(e.target.value)}
          autoFocus
        />
        <div style={{ height: 10 }} />
        <input
          className="input"
          type="password"
          placeholder={t('비밀번호')}
          value={pw}
          onChange={(e) => setPw(e.target.value)}
        />
        <div style={{ height: 18 }} />
        <button className="btn" type="submit" style={{ width: '100%', padding: '13px' }}>
          {t('로그인')}
        </button>
        {err && <div className="login-err">{err}</div>}
        <div className="hint" style={{ marginTop: 18 }}>
          관리자 계정으로 로그인하면 스타일 학습 모드를 사용할 수 있어요.
          <br />
          운영 배포 시 Supabase Auth 연동 — <code>docs/DATABASE.md</code> 참고
        </div>
      </form>
    </div>
  );
}
