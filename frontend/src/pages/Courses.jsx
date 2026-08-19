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

  return (
    <div className="bg-black min-h-[calc(100vh-64px)] p-4 sm:p-6 pb-12">
      <div className="max-w-3xl mx-auto flex flex-col gap-5">

        <div>
          <h1 className="text-lg font-semibold text-white">Formation</h1>
          <p className="text-white/40 text-xs">Suis les cours et gagne des points d'apprentissage</p>
        </div>

        <div className="rounded-2xl p-6 text-center" style={{ background: `linear-gradient(135deg, ${ACCENT}, #d6491f)` }}>
          <p className="text-white/80 text-xs uppercase tracking-wide mb-1">Points d'apprentissage</p>
          <p className="text-white text-4xl font-semibold">{totalScore}</p>
          <p className="text-white/70 text-xs mt-2">{completedCount}/{courses.length} cours complétés</p>
        </div>

        <div className="flex flex-col gap-3">
          {courses.length === 0 && (
            <EmptyState
              icon="🎓"
              title="Aucune formation pour l'instant"
              subtitle="Les cours ajoutés par l'admin apparaîtront ici dès qu'ils seront disponibles."
            />
          )}

          {courses.map((course, i) => (
            <Link
              key={course.id}
              to={`/courses/${course.id}`}
              className="bg-white/5 border border-white/10 rounded-2xl p-5 hover:border-orange-400/50 transition-all block"
              style={{ animation: `fadeIn 0.4s ease ${i * 0.06}s both` }}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="text-white font-medium">{course.title}</p>
                    {course.completed && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full font-medium" style={{ backgroundColor: `${ACCENT}22`, color: ACCENT }}>
                        Complété
                      </span>
                    )}
                  </div>
                  <p className="text-white/40 text-sm">{course.description}</p>
                  {course.completed && (
                    <p className="text-xs mt-2" style={{ color: ACCENT }}>
                      Score : {course.best_score} / {course.max_score} points
                    </p>
                  )}
                </div>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 mt-1">
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </div>
            </Link>
          ))}
        </div>

      </div>
      <style>{`@keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }`}</style>
    </div>
  );
}

export default Courses;