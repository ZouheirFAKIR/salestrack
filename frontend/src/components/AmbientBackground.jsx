function AmbientBackground() {
  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
      {/* Halo en haut à gauche */}
      <div
        className="absolute -top-40 -left-40 w-[500px] h-[500px] rounded-full opacity-[0.07] animate-[drift1_18s_ease-in-out_infinite]"
        style={{ background: 'radial-gradient(circle, #f86635 0%, transparent 70%)' }}
      />
      {/* Halo en bas à droite */}
      <div
        className="absolute -bottom-40 -right-40 w-[550px] h-[550px] rounded-full opacity-[0.06] animate-[drift2_22s_ease-in-out_infinite]"
        style={{ background: 'radial-gradient(circle, #f86635 0%, transparent 70%)' }}
      />
      {/* Petit halo au milieu à droite, plus discret */}
      <div
        className="absolute top-1/3 -right-24 w-[300px] h-[300px] rounded-full opacity-[0.05] animate-[drift1_25s_ease-in-out_infinite]"
        style={{ background: 'radial-gradient(circle, #f86635 0%, transparent 70%)' }}
      />
      {/* Trame de points très subtile sur tout le fond */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: 'radial-gradient(circle, #ffffff 1px, transparent 1px)',
          backgroundSize: '32px 32px',
        }}
      />
      <style>{`
        @keyframes drift1 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          50% { transform: translate(30px, 40px) scale(1.08); }
        }
        @keyframes drift2 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          50% { transform: translate(-25px, -35px) scale(1.05); }
        }
      `}</style>
    </div>
  );
}

export default AmbientBackground;