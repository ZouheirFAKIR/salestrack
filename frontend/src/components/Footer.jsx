const ACCENT = '#f86635';

function Footer() {
  return (
    <footer className="bg-black border-t border-white/10 px-6 py-3">
      <div className="flex items-center justify-between text-xs text-white/30">
        <span>SalesTrack by Yealead</span>
        <span style={{ color: ACCENT }}>Chaque activité compte 🔥</span>
      </div>
    </footer>
  );
}

export default Footer;