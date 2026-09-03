import { useEffect, useState } from 'react';
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
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--border)" strokeWidth="7" />
        <circle
          cx={size / 2} cy={size / 2} r={r} fill="none" stroke={ACCENT} strokeWidth="7"
          strokeDasharray={`${(percent / 100) * circumference} ${circumference}`}
          strokeLinecap="round"
        />
      </svg>
      <span className="absolute text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>{percent}%</span>
    </div>
  );
}

function getYoutubeEmbedUrl(url) {
  if (!url) return null;

  let listId = null;
  try {
    const parsed = new URL(url);
    listId = parsed.searchParams.get('list');
  } catch (err) {
    const listMatch = url.match(/[?&]list=([a-zA-Z0-9_-]+)/);
    listId = listMatch ? listMatch[1] : null;
  }

  // Format officiel Google pour charger une playlist en iframe
  if (listId) return `https://www.youtube.com/embed?listType=playlist&list=${listId}`;

  const videoMatch = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
  const videoId = videoMatch ? videoMatch[1] : null;
  if (videoId) return `https://www.youtube.com/embed/${videoId}`;

  return null;
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
  const [playlistItems, setPlaylistItems] = useState([]);
  const [activeVideoId, setActiveVideoId] = useState(null);
  const [answers, setAnswers] = useState({});
  const [answerResults, setAnswerResults] = useState({});
  const [checkingId, setCheckingId] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [activeHeadingIndex, setActiveHeadingIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    if (!token) { navigate('/login'); return; }
    apiFetch(`${API_URL}/api/courses/${id}`)
      .then((r) => r.json())
      .then((data) => {
        setCourse(data);
        setLoading(false);
        if (data.content_type === 'video') {
          apiFetch(`${API_URL}/api/courses/${id}/playlist`)
            .then((r) => r.json())
            .then((res) => {
              if (res.items?.length > 0) {
                setPlaylistItems(res.items);
                setActiveVideoId(res.items[0].videoId);
              }
            })
            .catch(() => {});
        }
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
    setRevealed(false);
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
      setRevealed(true);
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
    <div
      className={`flex flex-col relative overflow-hidden ${step === 'reading' ? 'min-h-[calc(100vh-64px)]' : 'h-[calc(100dvh-64px)] overflow-hidden'}`}
      style={{ backgroundColor: 'var(--bg)' }}
    >
      {step !== 'result' && (
        <>
          <div
            className="absolute -top-24 -right-32 w-[36rem] h-[36rem] rounded-full pointer-events-none"
            style={{ background: `radial-gradient(circle, ${ACCENT}20, transparent 70%)`, filter: 'blur(6px)' }}
          />
          <div
            className="absolute -bottom-40 -left-32 w-[40rem] h-[40rem] rounded-full pointer-events-none"
            style={{ background: `radial-gradient(circle, ${ACCENT}16, transparent 70%)`, filter: 'blur(6px)' }}
          />
        </>
      )}

      {step === 'reading' && (
        <div className="max-w-7xl w-full mx-auto flex-1 flex flex-col gap-4 p-4 sm:p-6 relative z-10">
          <Link
            to="/courses"
            className="text-xs transition-colors inline-flex items-center gap-1.5 shrink-0 hover:opacity-70"
            style={{ color: 'var(--text-muted)' }}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
            Retour aux formations
          </Link>

          <div
            className="flex flex-col sm:flex-row gap-4 rounded-2xl p-4 shrink-0"
            style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}
          >
            <div className="w-full sm:w-52 aspect-video rounded-xl overflow-hidden shrink-0" style={{ backgroundColor: 'var(--surface-strong)' }}>
              {course.banner_url ? (
                <img
                  src={course.banner_url}
                  alt=""
                  className="w-full h-full object-cover"
                  onError={(e) => { e.target.style.display = 'none'; }}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-2xl" style={{ color: 'var(--text-muted)' }}>
                  {course.content_type === 'video' ? '🎬' : '🎓'}
                </div>
              )}
            </div>
            <div className="flex-1 flex flex-col justify-center min-w-0">
              <span className="text-[11px] font-semibold mb-1.5" style={{ color: ACCENT }}>Formation Yealead</span>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight leading-tight" style={{ color: 'var(--text-primary)' }}>{course.title}</h1>
              {course.description && <p className="text-sm mt-1.5" style={{ color: 'var(--text-secondary)' }}>{course.description}</p>}
              {course.duration_minutes && (
                <span
                  className="text-[11px] font-medium px-2.5 py-1 rounded-full w-fit mt-3"
                  style={{ backgroundColor: 'var(--surface-strong)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}
                >
                  {course.duration_minutes} min de lecture
                </span>
              )}
            </div>
          </div>

          <div className={`grid grid-cols-1 gap-4 items-start ${(headings.length > 0 || playlistItems.length > 0) ? 'lg:grid-cols-[1fr_320px]' : ''}`}>
            <div
              className="rounded-2xl p-5 sm:p-8"
              style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}
            >
              {course.content_type === 'video' && course.content_url && (
                <div className="relative w-full mb-6 rounded-xl overflow-hidden" style={{ paddingTop: '56.25%' }}>
                  <iframe
                    src={activeVideoId ? `https://www.youtube.com/embed/${activeVideoId}` : getYoutubeEmbedUrl(course.content_url)}
                    title={course.title}
                    className="absolute inset-0 w-full h-full"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                </div>
              )}

              {course.content_text ? (
                <div>
                  {contentBlocks.map((block, i) => {
                    if (block.type === 'heading') {
                      return (
                        <h2
                          key={i} data-heading-id={i}
                          className="font-semibold text-base sm:text-lg mt-8 mb-3 first:mt-0 pb-2 scroll-mt-6"
                          style={{ color: 'var(--text-primary)', borderBottom: '1px solid var(--border)' }}
                        >
                          {block.text}
                        </h2>
                      );
                    }
                    if (block.type === 'list') {
                      return (
                        <ul key={i} className="flex flex-col gap-2 mb-4">
                          {block.items.map((item, ii) => (
                            <li key={ii} className="flex items-start gap-2.5 text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                              <span className="w-1.5 h-1.5 rounded-full mt-2 shrink-0" style={{ backgroundColor: ACCENT }} />
                              {item}
                            </li>
                          ))}
                        </ul>
                      );
                    }
                    return (
                      <p key={i} className="text-sm leading-relaxed mb-4" style={{ color: 'var(--text-secondary)' }}>
                        {block.text}
                      </p>
                    );
                  })}
                </div>
              ) : course.content_type !== 'video' ? (
                <p className="text-sm text-center py-10" style={{ color: 'var(--text-muted)' }}>Aucun contenu disponible pour ce cours.</p>
              ) : null}

              {course.completed ? (
                <div className="mt-6 p-4 rounded-xl text-center" style={{ backgroundColor: 'var(--surface-strong)', border: '1px solid var(--border)' }}>
                  <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                    Formation déjà complétée — score : {course.best_score} / {course.max_score}
                  </p>
                  <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
                    Contacte un admin si tu souhaites la repasser.
                  </p>
                </div>
              ) : (
                <button
                  onClick={() => setStep('quiz')}
                  className="w-full text-white py-3.5 rounded-xl font-semibold text-sm transition-all hover:brightness-110 active:scale-[0.99] cursor-pointer flex items-center justify-center gap-2 mt-6"
                  style={{ backgroundColor: ACCENT, boxShadow: `0 4px 20px ${ACCENT}40` }}
                >
                  <span>J'ai terminé la lecture, passer au quiz</span>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="9 18 15 12 9 6" />
                  </svg>
                </button>
              )}
            </div>

            {playlistItems.length > 0 && (
              <aside
                className="rounded-2xl p-3 lg:sticky lg:top-6 lg:max-h-[80vh] lg:overflow-y-auto"
                style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}
              >
                <p className="text-[11px] uppercase tracking-wide mb-3 font-medium px-2 pt-1" style={{ color: 'var(--text-muted)' }}>
                  {playlistItems.length} vidéos
                </p>
                <div className="flex flex-col gap-1">
                  {playlistItems.map((v, i) => {
                    const isActive = v.videoId === activeVideoId;
                    return (
                      <button
                        key={v.videoId}
                        onClick={() => setActiveVideoId(v.videoId)}
                        className="flex items-center gap-2.5 p-2 rounded-xl text-left transition-colors"
                        style={{ backgroundColor: isActive ? `${ACCENT}15` : 'transparent' }}
                      >
                        <div className="relative w-20 aspect-video rounded-lg overflow-hidden shrink-0" style={{ border: isActive ? `2px solid ${ACCENT}` : '1px solid var(--border)' }}>
                          <img src={v.thumbnail} alt="" className="w-full h-full object-cover" />
                        </div>
                        <p
                          className="text-xs leading-snug line-clamp-2"
                          style={{ color: isActive ? ACCENT : 'var(--text-secondary)', fontWeight: isActive ? 600 : 400 }}
                        >
                          {i + 1}. {v.title}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </aside>
            )}

            {playlistItems.length === 0 && headings.length > 0 && (
              <aside
                className="rounded-2xl p-5 lg:sticky lg:top-6"
                style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}
              >
                <p className="text-[11px] uppercase tracking-wide mb-4 font-medium" style={{ color: 'var(--text-muted)' }}>Sommaire</p>
                <nav className="relative flex flex-col gap-5">
                  <div className="absolute left-[5px] top-1.5 bottom-1.5 w-px" style={{ backgroundColor: 'var(--border)' }} />
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
                            backgroundColor: isActive || isPast ? ACCENT : 'var(--surface-strong)',
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
        <div className="max-w-4xl w-full mx-auto flex-1 flex flex-col min-h-0 gap-4 p-4 sm:p-6 relative z-10">
          <div className="shrink-0">
            <div className="flex items-center justify-between mb-2">
              <h1 className="text-base sm:text-lg font-bold" style={{ color: 'var(--text-primary)' }}>Quiz — {course.title}</h1>
              <button
                onClick={handleRestart}
                className="text-xs px-2.5 py-1 rounded-lg transition-all cursor-pointer shrink-0"
                style={{ border: '1px solid var(--border)', color: 'var(--text-secondary)' }}
              >
                Recommencer
              </button>
            </div>
            <div className="flex gap-1.5">
              {course.questions.map((q) => (
                <div
                  key={q.id}
                  className="h-1.5 flex-1 rounded-full transition-colors"
                  style={{ backgroundColor: answers[q.id] ? ACCENT : 'var(--border)' }}
                />
              ))}
            </div>
            <p className="text-[11px] mt-1.5" style={{ color: 'var(--text-muted)' }}>
              {revealed ? 'Correction de tes réponses' : `${answeredCount} / ${totalQuestions} questions répondues`}
            </p>
          </div>

          <div className="flex-1 overflow-y-auto space-y-4 pr-1" style={{ scrollbarWidth: 'thin' }}>
            {course.questions.map((q, qi) => {
              const selectedOptionId = answers[q.id];
              const isAnswered = !!selectedOptionId;
              const isChecking = checkingId === q.id;
              const qResult = answerResults[q.id];

              return (
                <div
                  key={q.id}
                  className="rounded-2xl p-5 transition-all"
                  style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}
                >
                  <div className="flex items-start justify-between gap-3 mb-4">
                    <p className="font-medium text-sm" style={{ color: 'var(--text-primary)' }}>
                      <span style={{ color: 'var(--text-muted)' }} className="mr-1.5">{qi + 1}.</span> {q.question}
                    </p>
                    <span
                      className="text-[10px] px-2 py-0.5 rounded shrink-0"
                      style={{ backgroundColor: 'var(--surface-strong)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}
                    >
                      {q.points} pts
                    </span>
                  </div>

                  <div className="flex flex-col gap-2">
                    {q.options.map((opt) => {
                      const isChosen = selectedOptionId === opt.id;
                      const isCorrect = !!qResult && qResult.correctOptionId === opt.id;
                      const showFeedback = isAnswered && !!qResult && revealed;

                      let bg = 'var(--surface-strong)';
                      let border = 'var(--border)';
                      let color = 'var(--text-primary)';
                      let opacity = 1;
                      let fontWeight = 400;
                      let cursor = 'pointer';

                      if (!revealed && isAnswered) {
                        cursor = 'default';
                        if (!isChosen) { opacity = 0.4; }
                      } else if (showFeedback) {
                        cursor = 'default';
                        if (isChosen) {
                          bg = isCorrect ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)';
                          border = isCorrect ? '#22c55e' : '#ef4444';
                          color = isCorrect ? '#16a34a' : '#dc2626';
                          fontWeight = 500;
                        } else if (isCorrect) {
                          bg = 'rgba(34,197,94,0.06)';
                          border = 'rgba(34,197,94,0.5)';
                          color = '#16a34a';
                          fontWeight = 500;
                        } else {
                          opacity = 0.4;
                        }
                      }

                      return (
                        <button
                          key={opt.id}
                          disabled={isAnswered}
                          onClick={() => handleSelectAnswer(q.id, opt.id)}
                          className="w-full text-left p-3.5 rounded-xl text-xs sm:text-sm border transition-all flex items-center justify-between gap-2"
                          style={{ backgroundColor: bg, borderColor: border, color, opacity, fontWeight, cursor }}
                        >
                          <span>{opt.option_text}</span>
                          {isChosen && isChecking && <Spinner size={13} color={ACCENT} />}
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

          {error && <p className="text-red-500 text-xs text-center shrink-0">{error}</p>}

          {!revealed ? (
            <button
              onClick={handleSubmit}
              disabled={!allAnswered || submitting}
              className="shrink-0 w-full text-white py-3.5 rounded-xl font-semibold text-sm transition-all hover:brightness-110 active:scale-[0.99] disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer"
              style={{ backgroundColor: ACCENT, boxShadow: `0 4px 20px ${ACCENT}40` }}
            >
              {submitting && <Spinner size={15} color="#fff" />}
              {submitting ? 'Validation...' : 'Valider mes réponses'}
            </button>
          ) : (
            <button
              onClick={() => setStep('result')}
              className="shrink-0 w-full text-white py-3.5 rounded-xl font-semibold text-sm transition-all hover:brightness-110 active:scale-[0.99] flex items-center justify-center gap-2 cursor-pointer"
              style={{ backgroundColor: ACCENT, boxShadow: `0 4px 20px ${ACCENT}40` }}
            >
              Voir mon résultat
            </button>
          )}
        </div>
      )}

      {step === 'result' && result && (
        <div className="flex-1 flex flex-col items-center justify-center text-center p-6 relative z-10">
          <Confetti show={result.percent >= 70} />
          <ScoreRing percent={result.percent} size={110} />
          <h2 className="text-xl sm:text-2xl font-bold mb-1 mt-5" style={{ color: 'var(--text-primary)' }}>
            {result.percent >= 70 ? 'Félicitations !' : 'Score insuffisant'}
          </h2>
          <p className="text-sm mb-8" style={{ color: 'var(--text-secondary)' }}>
            Tu as obtenu {result.score} / {result.maxScore} points.
          </p>
          <div className="flex items-center justify-center gap-3">
            <button
              onClick={handleRestart}
              className="text-xs px-5 py-2.5 rounded-xl transition-all cursor-pointer"
              style={{ border: '1px solid var(--border)', color: 'var(--text-secondary)' }}
            >
              Recommencer
            </button>
            <Link
              to="/courses"
              className="text-xs px-5 py-2.5 rounded-xl text-white font-semibold transition-all hover:brightness-110"
              style={{ backgroundColor: ACCENT, boxShadow: `0 4px 20px ${ACCENT}40` }}
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