import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { apiFetch } from '../utils/api';
import PageLoader from '../components/PageLoader';
import Spinner from '../components/Spinner';
import Confetti from '../components/Confetti';

const ACCENT = '#f86635';
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

function ScoreRing({ percent, size = 96 }) {
  const r = (size - 10) / 2;
  const circumference = 2 * Math.PI * r;
  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="7" />
        <circle
          cx={size / 2} cy={size / 2} r={r} fill="none" stroke={ACCENT} strokeWidth="7"
          strokeDasharray={`${(percent / 100) * circumference} ${circumference}`}
          strokeLinecap="round"
        />
      </svg>
      <span className="absolute text-xl font-semibold text-white">{percent}%</span>
    </div>
  );
}

function renderCourseContent(text) {
  const lines = text.split('\n');
  const blocks = [];
  let currentList = null;

  lines.forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed) {
      currentList = null;
      return;
    }
    if (trimmed.startsWith('## ')) {
      currentList = null;
      blocks.push({ type: 'heading', text: trimmed.slice(3) });
    } else if (trimmed.startsWith('- ')) {
      if (!currentList) {
        currentList = { type: 'list', items: [] };
        blocks.push(currentList);
      }
      currentList.items.push(trimmed.slice(2));
    } else {
      currentList = null;
      blocks.push({ type: 'paragraph', text: trimmed });
    }
  });

  return blocks;
}

function CourseDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const token = localStorage.getItem('token');

  const [course, setCourse] = useState(null);
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState('reading');
  const [answers, setAnswers] = useState({});
  const [answerResults, setAnswerResults] = useState({});
  const [checkingId, setCheckingId] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [activeHeadingIndex, setActiveHeadingIndex] = useState(0);

  useEffect(() => {
    if (!token) { navigate('/login'); return; }
    apiFetch(`${API_URL}/api/courses/${id}`)
      .then((r) => r.json())
      .then((data) => {
        setCourse(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [id, token]);

  useEffect(() => {
    if (step !== 'reading' || !course?.content_text) return;
    const headingEls = document.querySelectorAll('[data-heading-id]');
    if (headingEls.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveHeadingIndex(Number(entry.target.dataset.headingId));
          }
        });
      },
      { root: null, threshold: 0, rootMargin: '0px 0px -70% 0px' }
    );
    headingEls.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [step, course]);

  const scrollToHeading = (id) => {
    const el = document.querySelector(`[data-heading-id="${id}"]`);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const handleSelectAnswer = async (questionId, optionId) => {
    if (answers[questionId] || checkingId) return;

    setCheckingId(questionId);
    setAnswers((prev) => ({ ...prev, [questionId]: optionId }));

    try {
      const res = await apiFetch(`${API_URL}/api/courses/questions/${questionId}/answer`, {
        method: 'POST',
        body: JSON.stringify({ optionId }),
      });
      const data = await res.json();
      setAnswerResults((prev) => ({ ...prev, [questionId]: data }));
    } catch (err) {
      console.error(err);
    }
    setCheckingId(null);
  };

  const handleRestart = () => {
    setAnswers({});
    setAnswerResults({});
    setResult(null);
    setError('');
    setStep('reading');
  };

  const allAnswered = course?.questions?.length > 0 && course.questions.every((q) => answers[q.id]);

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

  const contentBlocks = course.content_text ? renderCourseContent(course.content_text) : [];
  const headings = contentBlocks.map((b, i) => ({ ...b, index: i })).filter((b) => b.type === 'heading');

  const answeredCount = Object.keys(answers).length;
  const totalQuestions = course.questions?.length || 0;

  return (
    <div className={`bg-black text-white flex flex-col ${step === 'reading' ? 'min-h-[calc(100vh-64px)]' : 'h-[calc(100dvh-64px)] overflow-hidden'}`}>

      {step === 'reading' && (
        <div className="max-w-5xl w-full mx-auto flex-1 flex flex-col gap-4 p-4 sm:p-6">
          <Link
            to="/courses"
            className="text-white/40 text-xs hover:text-white transition-colors inline-flex items-center gap-1.5 shrink-0"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
            Retour aux formations
          </Link>

          {/* Carte d'info compacte : petite image + titre/description/meta */}
          <div className="flex flex-col sm:flex-row gap-4 bg-white/5 border border-white/10 rounded-2xl p-4 shrink-0">
            <div className="w-full sm:w-48 aspect-video rounded-xl overflow-hidden bg-black shrink-0">
              {course.banner_url ? (
                <img
                  src={course.banner_url}
                  alt=""
                  className="w-full h-full object-cover"
                  onError={(e) => { e.target.style.display = 'none'; }}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-2xl text-white/15">🎓</div>
              )}
            </div>
            <div className="flex-1 flex flex-col justify-center min-w-0">
              <span className="text-[11px] font-semibold text-orange-400 mb-1.5">Formation Yealead</span>
              <h1 className="text-lg sm:text-xl font-bold text-white leading-tight">{course.title}</h1>
              {course.description && <p className="text-white/50 text-sm mt-1.5">{course.description}</p>}
              {course.duration_minutes && (
                <span className="text-[11px] font-medium text-white/50 bg-white/5 border border-white/10 px-2.5 py-1 rounded-full w-fit mt-3">
                  {course.duration_minutes} min de lecture
                </span>
              )}
            </div>
          </div>

          {/* Grille : contenu + sommaire, chacun dans sa propre carte */}
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_240px] gap-4 items-start">
            <div className="bg-white/5 border border-white/10 rounded-2xl p-5 sm:p-7">
              {course.content_text ? (
                <div>
                  {contentBlocks.map((block, i) => {
                    if (block.type === 'heading') {
                      return (
                        <h2 key={i} data-heading-id={i} className="text-white font-semibold text-base sm:text-lg mt-7 mb-3 first:mt-0 pb-2 border-b border-white/10 scroll-mt-6">
                          {block.text}
                        </h2>
                      );
                    }
                    if (block.type === 'list') {
                      return (
                        <ul key={i} className="flex flex-col gap-2 mb-4">
                          {block.items.map((item, ii) => (
                            <li key={ii} className="flex items-start gap-2.5 text-sm text-white/70 leading-relaxed">
                              <span className="w-1.5 h-1.5 rounded-full mt-2 shrink-0" style={{ backgroundColor: ACCENT }} />
                              {item}
                            </li>
                          ))}
                        </ul>
                      );
                    }
                    return (
                      <p key={i} className="text-sm text-white/70 leading-relaxed mb-4">
                        {block.text}
                      </p>
                    );
                  })}
                </div>
              ) : (
                <p className="text-white/30 text-sm text-center py-10">Aucun contenu disponible pour ce cours.</p>
              )}

              <button
                onClick={() => setStep('quiz')}
                className="w-full text-white py-3 rounded-xl font-semibold text-sm transition-all hover:brightness-110 active:scale-[0.99] shadow-lg cursor-pointer flex items-center justify-center gap-2 mt-6"
                style={{ backgroundColor: ACCENT }}
              >
                <span>J'ai terminé la lecture, passer au quiz</span>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </button>
            </div>

            {headings.length > 0 && (
              <aside className="bg-white/5 border border-white/10 rounded-2xl p-5 lg:sticky lg:top-6">
                <p className="text-[11px] uppercase tracking-wide mb-4" style={{ color: 'var(--text-muted)' }}>Sommaire</p>
                <nav className="relative flex flex-col gap-5">
                  <div className="absolute left-[5px] top-1.5 bottom-1.5 w-px bg-white/10" />
                  {headings.map((h) => {
                    const isActive = activeHeadingIndex === h.index;
                    const isPast = h.index < activeHeadingIndex;
                    return (
                      <button
                        key={h.index}
                        onClick={() => scrollToHeading(h.index)}
                        className="relative flex items-start gap-3 text-left"
                      >
                        <span
                          className="w-2.5 h-2.5 rounded-full shrink-0 mt-1 transition-all"
                          style={{
                            backgroundColor: isActive || isPast ? ACCENT : '#1a1a1a',
                            border: isActive || isPast ? 'none' : '1px solid var(--border)',
                            boxShadow: isActive ? `0 0 0 4px ${ACCENT}33` : 'none',
                          }}
                        />
                        <span
                          className="text-xs leading-snug transition-colors"
                          style={{ color: isActive ? 'var(--text-primary)' : isPast ? 'var(--text-secondary)' : 'var(--text-muted)', fontWeight: isActive ? 600 : 400 }}
                        >
                          {h.text}
                        </span>
                      </button>
                    );
                  })}
                </nav>
              </aside>
            )}
          </div>
        </div>
      )}

      {step === 'quiz' && (
        <div className="max-w-3xl w-full mx-auto flex-1 flex flex-col min-h-0 gap-4 p-4 sm:p-6">
          <div className="shrink-0">
            <div className="flex items-center justify-between mb-2">
              <h1 className="text-base sm:text-lg font-bold text-white">Quiz — {course.title}</h1>
              <button
                onClick={handleRestart}
                className="text-xs px-2.5 py-1 rounded-lg border border-white/15 text-white/60 hover:text-white transition-all cursor-pointer shrink-0"
              >
                Recommencer
              </button>
            </div>
            <div className="flex gap-1.5">
              {course.questions.map((q) => (
                <div
                  key={q.id}
                  className="h-1.5 flex-1 rounded-full transition-colors"
                  style={{ backgroundColor: answers[q.id] ? ACCENT : 'rgba(255,255,255,0.1)' }}
                />
              ))}
            </div>
            <p className="text-[11px] text-white/40 mt-1.5">{answeredCount} / {totalQuestions} questions répondues</p>
          </div>

          <div className="flex-1 overflow-y-auto space-y-4 pr-1" style={{ scrollbarWidth: 'thin' }}>
            {course.questions.map((q, qi) => {
              const selectedOptionId = answers[q.id];
              const isAnswered = !!selectedOptionId;
              const isChecking = checkingId === q.id;
              const qResult = answerResults[q.id];

              return (
                <div key={q.id} className="bg-[#0f0f0f] border border-white/10 rounded-2xl p-5 transition-all">
                  <div className="flex items-start justify-between gap-3 mb-4">
                    <p className="text-white font-medium text-sm">
                      <span className="text-white/40 mr-1.5">{qi + 1}.</span> {q.question}
                    </p>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-white/5 text-white/40 border border-white/10 shrink-0">
                      {q.points} pts
                    </span>
                  </div>

                  <div className="flex flex-col gap-2">
                    {q.options.map((opt) => {
                      const isChosen = selectedOptionId === opt.id;
                      const isCorrect = !!qResult && qResult.correctOptionId === opt.id;
                      const showFeedback = isAnswered && !!qResult;

                      let optionStyle = 'bg-black/60 border-white/10 text-white/80 hover:border-white/30 cursor-pointer';

                      if (isAnswered && isChecking) {
                        optionStyle = isChosen
                          ? 'bg-white/10 border-white/30 text-white/80 cursor-default'
                          : 'bg-black/30 border-white/5 text-white/25 cursor-default opacity-40';
                      } else if (showFeedback) {
                        if (isChosen) {
                          optionStyle = isCorrect
                            ? 'bg-emerald-950/60 border-emerald-500 text-emerald-300 font-medium cursor-default ring-1 ring-emerald-500'
                            : 'bg-rose-950/60 border-rose-500 text-rose-300 font-medium cursor-default ring-1 ring-rose-500';
                        } else if (isCorrect) {
                          optionStyle = 'bg-emerald-950/30 border-emerald-500/70 text-emerald-400 font-medium cursor-default';
                        } else {
                          optionStyle = 'bg-black/30 border-white/5 text-white/25 cursor-default opacity-40';
                        }
                      }

                      return (
                        <button
                          key={opt.id}
                          disabled={isAnswered}
                          onClick={() => handleSelectAnswer(q.id, opt.id)}
                          className={`w-full text-left p-3.5 rounded-xl text-xs sm:text-sm border transition-all flex items-center justify-between gap-2 ${optionStyle}`}
                        >
                          <span>{opt.option_text}</span>
                          {isChosen && isChecking && <Spinner size={13} color="#fff" />}
                          {showFeedback && (
                            <span className="shrink-0 text-xs font-semibold">
                              {isChosen && isCorrect && '✓ Correct'}
                              {isChosen && !isCorrect && '✕ Incorrect'}
                              {!isChosen && isCorrect && '✓ Bonne réponse'}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          {error && <p className="text-red-400 text-xs text-center shrink-0">{error}</p>}

          <button
            onClick={handleSubmit}
            disabled={!allAnswered || submitting}
            className="shrink-0 w-full text-white py-3.5 rounded-xl font-semibold text-sm transition-all hover:brightness-110 active:scale-[0.99] disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer shadow-lg"
            style={{ backgroundColor: ACCENT }}
          >
            {submitting && <Spinner size={15} color="#fff" />}
            {submitting ? 'Validation...' : 'Valider mes réponses'}
          </button>
        </div>
      )}

      {step === 'result' && result && (
        <div className="flex-1 flex flex-col items-center justify-center text-center p-6">
          <Confetti show={result.percent >= 70} />
          <ScoreRing percent={result.percent} size={110} />
          <h2 className="text-xl sm:text-2xl font-bold text-white mb-1 mt-5">
            {result.percent >= 70 ? 'Félicitations !' : 'Score insuffisant'}
          </h2>
          <p className="text-white/50 text-sm mb-8">
            Tu as obtenu {result.score} / {result.maxScore} points.
          </p>
          <div className="flex items-center justify-center gap-3">
            <button
              onClick={handleRestart}
              className="text-xs px-5 py-2.5 rounded-xl text-white/80 border border-white/15 hover:text-white transition-all cursor-pointer"
            >
              Recommencer
            </button>
            <Link
              to="/courses"
              className="text-xs px-5 py-2.5 rounded-xl text-white font-semibold transition-all hover:brightness-110 shadow-lg"
              style={{ backgroundColor: ACCENT }}
            >
              Retour aux formations
            </Link>
          </div>
        </div>
      )}

    </div>
  );
}

export default CourseDetail;