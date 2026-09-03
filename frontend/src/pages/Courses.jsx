import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiFetch } from '../utils/api';
import PageLoader from '../components/PageLoader';
import EmptyState from '../components/EmptyState';

const ACCENT = '#f86635';
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const FILTERS = [
  { key: 'all', label: 'Tout' },
  { key: 'text', label: '📄 Articles' },
  { key: 'video', label: '🎬 Vidéos' },
];

function Courses() {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const token = localStorage.getItem('token');

  useEffect(() => {
    if (!token) { setLoading(false); return; }
    apiFetch(`${API_URL}/api/courses`)
      .then((r) => r.json())
      .then((data) => {
        setCourses(data);
        setLoading(false);
      });
  }, [token]);

  if (loading) return <PageLoader />;

  if (!token) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center" style={{ backgroundColor: 'var(--bg)' }}>
        <span className="text-4xl mb-4">🔒</span>
        <h1 className="text-xl font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>Connecte-toi pour voir les cours</h1>
        <a href="/login" className="text-white px-5 py-2.5 rounded-lg font-medium mt-2" style={{ backgroundColor: ACCENT }}>
          Se connecter
        </a>
      </div>
    );
  }

  const totalScore = courses.reduce((sum, c) => sum + (c.best_score || 0), 0);
  const totalMax = courses.reduce((sum, c) => sum + (c.max_score || 0), 0);
  const completedCount = courses.filter((c) => c.completed).length;
  const progressPercent = courses.length > 0 ? Math.round((completedCount / courses.length) * 100) : 0;

  const filteredCourses = filter === 'all' ? courses : courses.filter((c) => (c.content_type || 'text') === filter);

  return (
    <div className="min-h-[calc(100vh-64px)] p-4 sm:p-6 pb-12 relative overflow-hidden" style={{ backgroundColor: 'var(--bg)' }}>
      <div
        className="absolute -top-24 -right-32 w-[36rem] h-[36rem] rounded-full pointer-events-none"
        style={{ background: `radial-gradient(circle, ${ACCENT}20, transparent 70%)`, filter: 'blur(6px)' }}
      />
      <div
        className="absolute -bottom-40 -left-32 w-[40rem] h-[40rem] rounded-full pointer-events-none"
        style={{ background: `radial-gradient(circle, ${ACCENT}16, transparent 70%)`, filter: 'blur(6px)' }}
      />
      <svg className="absolute top-24 right-10 pointer-events-none hidden xl:block" width="120" height="120" viewBox="0 0 120 120">
        <circle cx="60" cy="60" r="52" stroke={ACCENT} strokeOpacity="0.16" strokeWidth="2" fill="none" />
        <circle cx="60" cy="60" r="30" stroke={ACCENT} strokeOpacity="0.12" strokeWidth="2" fill="none" />
      </svg>

      <div className="max-w-7xl mx-auto flex flex-col gap-6 relative z-10">

        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-semibold tracking-tight" style={{ color: 'var(--text-primary)' }}>Formation</h1>
            <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>Suis les cours et gagne des points d'apprentissage</p>
          </div>

          <div
            className="flex items-center gap-4 rounded-2xl px-5 py-3 shrink-0"
            style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}
          >
            <div>
              <p className="text-[11px] uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>Points gagnés</p>
              <p className="text-xl font-semibold" style={{ color: ACCENT }}>
                {totalScore}<span className="text-sm font-normal" style={{ color: 'var(--text-muted)' }}> / {totalMax}</span>
              </p>
            </div>
            <div className="w-px h-9" style={{ backgroundColor: 'var(--border)' }} />
            <div>
              <p className="text-[11px] uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>Complétés</p>
              <p className="text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>
                {completedCount}<span className="text-sm font-normal" style={{ color: 'var(--text-muted)' }}> / {courses.length}</span>
              </p>
            </div>
            <div className="w-11 h-11 rounded-full shrink-0 relative flex items-center justify-center">
              <svg width="44" height="44" className="-rotate-90">
                <circle cx="22" cy="22" r="18" fill="none" stroke="var(--border)" strokeWidth="4" />
                <circle
                  cx="22" cy="22" r="18" fill="none" stroke={ACCENT} strokeWidth="4"
                  strokeDasharray={`${(progressPercent / 100) * 113} 113`}
                  strokeLinecap="round"
                />
              </svg>
              <span className="absolute text-[10px] font-semibold" style={{ color: 'var(--text-primary)' }}>{progressPercent}%</span>
            </div>
          </div>
        </div>

        {courses.length > 0 && (
          <div className="flex items-center gap-2 flex-wrap">
            {FILTERS.map((f) => {
              const active = filter === f.key;
              const count = f.key === 'all' ? courses.length : courses.filter((c) => (c.content_type || 'text') === f.key).length;
              return (
                <button
                  key={f.key}
                  onClick={() => setFilter(f.key)}
                  className="text-xs px-3.5 py-2 rounded-full font-medium whitespace-nowrap transition-all"
                  style={active
                    ? { backgroundColor: ACCENT, color: '#fff', boxShadow: `0 2px 10px ${ACCENT}40` }
                    : { backgroundColor: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}
                >
                  {f.label} <span style={{ opacity: 0.7 }}>({count})</span>
                </button>
              );
            })}
          </div>
        )}

        {courses.length === 0 && (
          <EmptyState
            icon="🎓"
            title="Aucune formation pour l'instant"
            subtitle="Les cours ajoutés par l'admin apparaîtront ici dès qu'ils seront disponibles."
          />
        )}

        {courses.length > 0 && filteredCourses.length === 0 && (
          <p className="text-sm text-center py-10" style={{ color: 'var(--text-muted)' }}>Aucun cours dans cette catégorie</p>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {filteredCourses.map((course, i) => (
            <Link
              key={course.id}
              to={`/courses/${course.id}`}
              className="group rounded-2xl overflow-hidden hover:-translate-y-0.5 transition-all duration-200 flex flex-col"
              style={{
                backgroundColor: 'var(--surface)',
                border: '1px solid var(--border)',
                boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                animation: `fadeIn 0.4s ease ${i * 0.05}s both`,
              }}
            >
              <div className="relative aspect-video overflow-hidden" style={{ backgroundColor: 'var(--surface-strong)' }}>
                {course.banner_url ? (
                  <img
                    src={course.banner_url}
                    alt=""
                    className="w-full h-full object-cover group-hover:scale-[1.04] transition-transform duration-300"
                    onError={(e) => { e.target.style.display = 'none'; }}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-3xl" style={{ color: 'var(--text-muted)' }}>🎓</div>
                )}
                <span
                  className="absolute top-3 left-3 text-[10px] font-semibold px-2.5 py-1 rounded-full backdrop-blur-sm"
                  style={{
                    backgroundColor: course.content_type === 'video' ? 'rgba(59,130,246,0.85)' : 'rgba(248,102,53,0.85)',
                    color: '#fff',
                  }}
                >
                  {course.content_type === 'video' ? '🎬 Vidéo' : '📄 Article'}
                </span>
                {course.completed && (
                  <span
                    className="absolute top-3 right-3 text-[10px] font-semibold px-2.5 py-1 rounded-full text-white backdrop-blur-sm"
                    style={{ backgroundColor: `${ACCENT}dd` }}
                  >
                    Complété
                  </span>
                )}
              </div>

              <div className="p-4 flex-1 flex flex-col">
                <p className="font-medium leading-snug" style={{ color: 'var(--text-primary)' }}>{course.title}</p>
                <p className="text-sm mt-1 line-clamp-2 flex-1" style={{ color: 'var(--text-secondary)' }}>{course.description}</p>
                {course.completed ? (
                  <p className="text-xs mt-3 font-medium" style={{ color: ACCENT }}>
                    Score : {course.best_score} / {course.max_score} points
                  </p>
                ) : (
                  <p className="text-xs mt-3" style={{ color: 'var(--text-muted)' }}>Pas encore commencé</p>
                )}
              </div>
            </Link>
          ))}
        </div>

      </div>
      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        .line-clamp-2 { display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
      `}</style>
    </div>
  );
}

export default Courses;