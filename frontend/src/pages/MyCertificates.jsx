import { useEffect, useState } from 'react';
import { apiFetch } from '../utils/api';
import PageLoader from '../components/PageLoader';
import { buildCertificateDataUrl, downloadCertificate } from '../utils/generateCertificate';

const ACCENT = '#f86635';
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

function CertificateCard({ course, userName }) {
  const [imgUrl, setImgUrl] = useState(null);
  const date = new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });

  useEffect(() => {
    buildCertificateDataUrl({ userName, courseTitle: course.title, date }).then(setImgUrl);
  }, [course.title]);

  return (
    <div className="rounded-2xl overflow-hidden" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
      <div className="aspect-[1400/990] flex items-center justify-center" style={{ backgroundColor: 'var(--surface-strong)' }}>
        {imgUrl ? (
          <img src={imgUrl} alt={course.title} className="w-full h-full object-contain" />
        ) : (
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Génération...</p>
        )}
      </div>
      <div className="p-4 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>{course.title}</p>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Score : {course.best_score} / {course.max_score}</p>
        </div>
        <button
          onClick={() => downloadCertificate({ userName, courseTitle: course.title, date })}
          className="text-xs px-3.5 py-2 rounded-lg text-white font-medium shrink-0 transition-all hover:brightness-110"
          style={{ backgroundColor: ACCENT }}
        >
          Télécharger
        </button>
      </div>
    </div>
  );
}

function MyCertificates() {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const user = JSON.parse(localStorage.getItem('user') || 'null');

  useEffect(() => {
    apiFetch(`${API_URL}/api/courses`)
      .then((r) => r.json())
      .then((data) => {
        setCourses(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) return <PageLoader />;

  const earned = courses.filter((c) => c.completed && c.max_score > 0 && c.best_score / c.max_score >= 0.7);

  return (
    <div className="max-w-5xl mx-auto p-4 sm:p-6 flex flex-col gap-6">
      <div>
        <h1 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>Mes certificats</h1>
        <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>Les attestations que tu as obtenues en réussissant tes formations</p>
      </div>

      {earned.length === 0 ? (
        <div className="rounded-2xl p-10 text-center" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}>
          <p className="text-3xl mb-2">🏆</p>
          <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>Aucun certificat pour l'instant</p>
          <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>Termine une formation avec au moins 70% pour obtenir ton premier certificat.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {earned.map((c) => (
            <CertificateCard key={c.id} course={c} userName={user?.nom || 'Commercial'} />
          ))}
        </div>
      )}
    </div>
  );
}

export default MyCertificates;