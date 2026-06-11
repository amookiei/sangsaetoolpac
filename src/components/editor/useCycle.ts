import { useEffect, useState } from 'react';

/** periodMs 간격으로 값을 증가시켜 애니메이션을 재시작하는 키로 사용 (0이면 비활성) */
export function useCycle(periodMs: number): number {
  const [cycle, setCycle] = useState(0);
  useEffect(() => {
    if (!periodMs) return;
    const t = setInterval(() => setCycle((c) => c + 1), periodMs);
    return () => clearInterval(t);
  }, [periodMs]);
  return cycle;
}
