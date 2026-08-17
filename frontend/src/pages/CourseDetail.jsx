import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { apiFetch } from '../utils/api';
import PageLoader from '../components/PageLoader';
import Spinner from '../components/Spinner';
import Confetti from '../components/Confetti';

const ACCENT = '#f86635';
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

function CourseDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const token = localStorage.getItem('token');

  const [course, setCourse] = useState(null);
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState('reading');
  const [answers, setAnswers] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!token) { navigate('/login'); return; }
    apiFetch(`${API_URL}/api/courses/${id}`)
      .then((r) => r.json())
      .then((data) => {
        setCourse(data);
        setLoading(false);
      });
  }, [id, token]);

  const handleSelectAnswer = (questionId, optionId) => {
    setAnswers((prev) => ({ ...prev, [questionId]: optionId }));
  };

  const allAnswered = course?.questions.every((q) => answers[q.id]);

  const handleSubmit = async () => {
    if (!allAnswered) {
      setError('Réponds à toutes les questions avant de valider');
      return;
    }
    setError('');
    setSubmitting(true);
    try {
      const res = await apiFetch(`${API_URL}/api/courses/${id}/submit`, {
        method: 'POST',
        body: JSON.stringify({ answers }),
      });
      const data = await res.json();
      setResult(data);
      setStep('result');
    } catch (err) {
      setError('Erreur lors de la soumission');
    }
    setSubmitting(false);
  };

  if (loading) return <PageLoader />;
  if (!course) return null;

  return (
    <div className="bg-black min-h-[calc(100vh-64px)] p-4 sm:p-6 pb-12">
      <div className="max-w-2xl mx-auto">

        <Link to="/courses" className="text-white/40 text-sm hover:text-white transition-colors flex items-center gap-1 mb-5">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
          Retour aux cours
        </Link>

        {step === 'reading' && (
          <>
            <h1 className="text-lg font-semibold text-white mb-1">{course.title}</h1>
            <p className="text-white/40 text-sm mb-6">{course.description}</p>

            <div className="bg-white/5 border border-white/10 rounded-2xl p-6 mb-5">
              {course.content_type === 'pdf' && course.content_url ? (
                <iframe
                  src={course.content_url}
                  title={course.title}
                  className="w-full rounded-lg"
                  style={{ height: '60vh', border: 'none' }}
                />
              ) : (
                <p className="text-white/60 text-sm leading-relaxed whitespace-pre-wrap">
                  {course.content_url || 'Contenu du cours non disponible.'}
                </p>
              )}
            </div>

            <button
              onClick={() => setStep('quiz')}
              className="w-full text-white p-3 rounded-lg font-medium transition-all hover:brightness-110 active:scale-95"
              style={{ backgroundColor: ACCENT }}
            >
              J'ai terminé la lecture, passer au quiz
            </button>
          </>
        )}

        {step === 'quiz' && (
          <>
            <h1 className="text-lg font-semibold text-white mb-1">Quiz — {course.title}</h1>
            <p className="text-white/40 text-sm mb-6">{course.questions.length} questions</p>

            <div className="flex flex-col gap-4">
              {course.questions.map((q, qi) => (
                <div key={q.id} className="bg-white/5 border border-white/10 rounded-2xl p-5">
                  <p className="text-white font-medium mb-4">{qi + 1}. {q.question}</p>
                  <div className="flex flex-col gap-2">
                    {q.options.map((opt) => (
                      <button
                        key={opt.id}
                        onClick={() => handleSelectAnswer(q.id, opt.id)}
                        className="text-left p-3 rounded-lg text-sm border transition-all"
                        style={answers[q.id] === opt.id
                          ? { backgroundColor: ACCENT, borderColor: ACCENT, color: '#fff', fontWeight: 500 }
                          : { backgroundColor: '#000', borderColor: 'rgba(255,255,255,0.15)', color: '#fff' }}
                      >
                        {opt.option_text}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {error && <p className="text-red-400 text-xs mt-4 text-center">{error}</p>}

            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="w-full mt-5 text-white p-3 rounded-lg font-medium transition-all hover:brightness-110 active:scale-95 disabled:opacity-60 flex items-center justify-center gap-2"
              style={{ backgroundColor: ACCENT }}
            >
              {submitting && <Spinner size={15} color="#fff" />}
              {submitting ? 'Validation...' : 'Valider mes réponses'}
            </button>
          </>
        )}

        {step === 'result' && result && (
          <div className="text-center py-10">
            <Confetti show={result.percent >= 70} />
            <div
              className="w-24 h-24 rounded-full mx-auto mb-5 flex items-center justify-center text-3xl font-semibold text-white"
              style={{ background: `linear-gradient(135deg, ${ACCENT}, #d6491f)` }}
            >
              {result.percent}%
            </div>
            <h2 className="text-xl font-semibold text-white mb-1">
              {result.percent >= 70 ? 'Bien joué !' : 'Continue tes efforts'}
            </h2>
            <p className="text-white/50 text-sm mb-6">
              Tu as obtenu {result.score} / {result.maxScore} points
            </p>
            <div className="flex items-center justify-center gap-3">
              <Link
                to="/courses"
                className="text-sm px-5 py-2.5 rounded-lg text-white font-medium transition-all hover:brightness-110"
                style={{ backgroundColor: ACCENT }}
              >
                Retour aux cours
              </Link>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

export default CourseDetail;