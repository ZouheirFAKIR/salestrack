import { useEffect, useState } from 'react';

function formatDuration(ms) {
  if (ms <= 0) return '00:00:00';
  const totalSeconds = Math.floor(ms / 1000);
  const h = String(Math.floor(totalSeconds / 3600)).padStart(2, '0');
  const m = String(Math.floor((totalSeconds % 3600) / 60)).padStart(2, '0');
  const s = String(totalSeconds % 60).padStart(2, '0');
  return `${h}:${m}:${s}`;
}

function CountdownClock({ deadline }) {
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  const remaining = new Date(deadline).getTime() - now;

  return (
    <div
      className="px-3 py-1.5 rounded-lg font-mono text-sm sm:text-base tracking-widest"
      style={{ backgroundColor: '#111', color: remaining > 0 ? '#f86635' : '#666', border: '1px solid rgba(255,255,255,0.1)' }}
    >
      {formatDuration(remaining)}
    </div>
  );
}

export default CountdownClock;