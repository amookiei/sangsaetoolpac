import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './styles/global.css';
import { TYPO_KEYFRAMES_CSS } from './data/typoAnimations';

// 타이포 애니메이션 키프레임을 문서에 1회 주입 (미리보기·SVG 추출 공용)
const style = document.createElement('style');
style.textContent = TYPO_KEYFRAMES_CSS;
document.head.appendChild(style);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
