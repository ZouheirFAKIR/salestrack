import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiFetch } from '../utils/api';
import PageLoader from '../components/PageLoader';
import EmptyState from '../components/EmptyState';

const ACCENT = '#f86635';
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

function Courses() {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
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
      <div className="bg-black min-h-screen flex flex-col items-center justify-center p-6 text-center">
        <span className="text-4xl mb-4">🔒</span>
        <h1 className="text-xl font-semibold text-white mb-2">Connecte-toi pour voir les cours</h1>
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

  return (
    <div className="bg-black min-h-[calc(100vh-64px)] p-4 sm:p-6 pb-12">
      <div className="max-w-6xl mx-auto flex flex-col gap-6">

        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-semibold text-white">Formation</h1>
            <p className="text-white/40 text-sm mt-1">Suis les cours et gagne des points d'apprentissage</p>
          </div>

          <div className="flex items-center gap-4 bg-white/5 border border-white/10 rounded-2xl px-5 py-3 shrink-0">
            <div>
              <p className="text-white/40 text-[11px] uppercase tracking-wide">Points gagnés</p>
              <p className="text-xl font-semibold" style={{ color: ACCENT }}>{totalScore}<span className="text-white/30 text-sm font-normal"> / {totalMax}</span></p>
            </div>
            <div className="w-px h-9 bg-white/10" />
            <div>
              <p className="text-white/40 text-[11px] uppercase tracking-wide">Complétés</p>
              <p className="text-xl font-semibold text-white">{completedCount}<span className="text-white/30 text-sm font-normal"> / {courses.length}</span></p>
            </div>
            <div className="w-11 h-11 rounded-full shrink-0 relative flex items-center justify-center">
              <svg width="44" height="44" className="-rotate-90">
                <circle cx="22" cy="22" r="18" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="4" />
                <circle
                  cx="22" cy="22" r="18" fill="none" stroke={ACCENT} strokeWidth="4"
                  strokeDasharray={`${(progressPercent / 100) * 113} 113`}
                  strokeLinecap="round"
                />
              </svg>
              <span className="absolute text-[10px] font-semibold text-white">{progressPercent}%</span>
            </div>
          </div>
        </div>

        {courses.length === 0 && (
          <EmptyState
            icon="🎓"
            title="Aucune formation pour l'instant"
            subtitle="Les cours ajoutés par l'admin apparaîtront ici dès qu'ils seront disponibles."
          />
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {courses.map((course, i) => (
            <Link
              key={course.id}
              to={`/courses/${course.id}`}
              className="group bg-white/5 border border-white/10 rounded-2xl overflow-hidden hover:border-orange-400/50 hover:-translate-y-0.5 transition-all duration-200 flex flex-col"
              style={{ animation: `fadeIn 0.4s ease ${i * 0.05}s both` }}
            >
              <div className="relative aspect-video bg-black/40 overflow-hidden">
                {course.banner_url ? (
                  <img
                    src={course.banner_url}
                    alt=""
                    className="w-full h-full object-cover group-hover:scale-[1.04] transition-transform duration-300"
                    onError={(e) => { e.target.style.display = 'none'; }}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-3xl text-white/15">🎓</div>
                )}
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
                <p className="text-white font-medium leading-snug">{course.title}</p>
                <p className="text-white/40 text-sm mt-1 line-clamp-2 flex-1">{course.description}</p>
                {course.completed ? (
                  <p className="text-xs mt-3 font-medium" style={{ color: ACCENT }}>
                    Score : {course.best_score} / {course.max_score} points
                  </p>
                ) : (
                  <p className="text-xs mt-3 text-white/30">Pas encore commencé</p>
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