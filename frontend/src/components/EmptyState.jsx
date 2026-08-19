function EmptyState({ icon = '📭', title, subtitle, actionLabel, actionHref, accent = '#f86635' }) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-16 px-6 animate-[fadeIn_0.4s_ease]">
      <div
        className="w-20 h-20 rounded-2xl flex items-center justify-center text-3xl mb-4 animate-[float_3s_ease-in-out_infinite]"
        style={{ background: `${accent}14`, border: `1px solid ${accent}33` }}
      >
        {icon}
      </div>
      <h3 className="text-white font-medium text-sm mb-1">{title}</h3>
      {subtitle && <p className="text-white/40 text-xs max-w-xs">{subtitle}</p>}
      {actionLabel && actionHref && (
        <a
          href={actionHref}
          className="mt-5 text-white text-xs font-semibold px-5 py-2.5 rounded-xl transition-all hover:brightness-110 active:scale-[0.97] shadow-lg"
          style={{ backgroundColor: accent }}
        >
          {actionLabel}
        </a>
      )}
      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes float { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-6px); } }
      `}</style>
    </div>
  );
}

export default EmptyState;