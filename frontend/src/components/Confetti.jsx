const ACCENT = '#f86635';

function Confetti({ show }) {
  if (!show) return null;
  const pieces = Array.from({ length: 30 });

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-50">
      {pieces.map((_, i) => (
        <span
          key={i}
          className="absolute w-2 h-2 rounded-sm"
          style={{
            left: `${Math.random() * 100}%`,
            top: '-10px',
            backgroundColor: i % 2 === 0 ? ACCENT : '#ffffff',
            animation: `fall 1.3s ease-in forwards`,
            animationDelay: `${Math.random() * 0.3}s`,
          }}
        />
      ))}
      <style>{`@keyframes fall { to { transform: translateY(100vh) rotate(360deg); opacity: 0; } }`}</style>
    </div>
  );
}

export default Confetti;