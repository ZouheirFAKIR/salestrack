import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import * as pdfjsLib from 'pdfjs-dist';
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.mjs?url';
import { apiFetch } from '../utils/api';
import PageLoader from '../components/PageLoader';
import Spinner from '../components/Spinner';
import Confetti from '../components/Confetti';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;

const ACCENT = '#f86635';
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

function PdfCanvasPage({ pdfDoc, pageNum, containerWidth }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    if (!pdfDoc || !containerWidth) return;

    pdfDoc.getPage(pageNum).then((page) => {
      if (cancelled) return;
      const baseViewport = page.getViewport({ scale: 1 });
      const scale = containerWidth / baseViewport.width;
      const viewport = page.getViewport({ scale });

      const canvas = canvasRef.current;
      if (!canvas) return;
      const context = canvas.getContext('2d');
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      canvas.style.width = '100%';
      canvas.style.height = 'auto';

      page.render({ canvasContext: context, viewport });
    });

    return () => { cancelled = true; };
  }, [pdfDoc, pageNum, containerWidth]);

  return <canvas ref={canvasRef} className="block mb-2 rounded shadow-lg" />;
}

function PdfViewer({ url }) {
  const containerRef = useRef(null);
  const [pdfDoc, setPdfDoc] = useState(null);
  const [numPages, setNumPages] = useState(0);
  const [containerWidth, setContainerWidth] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(false);
    pdfjsLib.getDocument(url).promise
      .then((doc) => {
        if (cancelled) return;
        setPdfDoc(doc);
        setNumPages(doc.numPages);
        setLoading(false);
      })
      .catch(() => {
        if (!cancelled) { setError(true); setLoading(false); }
      });
    return () => { cancelled = true; };
  }, [url]);

  const measure = useCallback(() => {
    if (containerRef.current) {
      setContainerWidth(containerRef.current.clientWidth - 16);
    }
  }, []);

  useEffect(() => {
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [measure]);

  const pages = Array.from({ length: numPages }, (_, i) => i + 1);

  return (
    <div
      ref={containerRef}
      className="flex-1 min-h-0 bg-[#0a0a0a] border border-white/10 rounded-xl overflow-y-auto overflow-x-hidden p-2"
      style={{ scrollbarWidth: 'thin', scrollbarColor: `${ACCENT} #1a1a1a` }}
    >
      {loading && (
        <div className="h-full flex flex-col items-center justify-center gap-3 py-16">
          <Spinner size={28} color={ACCENT} />
          <p className="text-xs text-white/50">Chargement du document...</p>
        </div>
      )}
      {error && (
        <div className="h-full flex items-center justify-center text-white/40 text-sm py-16">
          Impossible d'afficher le document.
        </div>
      )}
      {!loading && !error && pdfDoc && containerWidth > 0 && (
        <div className="flex flex-col items-center">
          {pages.map((p) => (
            <PdfCanvasPage key={p} pdfDoc={pdfDoc} pageNum={p} containerWidth={containerWidth} />
          ))}
        </div>
      )}
    </div>
  );
}

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
      })
      .catch(() => setLoading(false));
  }, [id, token]);

  const handleSelectAnswer = (questionId, optionId) => {
    if (answers[questionId]) return;
    setAnswers((prev) => ({ ...prev, [questionId]: optionId }));
  };

  const handleRestart = () => {
    setAnswers({});
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

  const answeredCount = Object.keys(answers).length;
  const totalQuestions = course.questions?.length || 0;

  return (
    <div className="bg-black text-white min-h-[calc(100dvh-64px)] flex flex-col p-3 sm:p-5">
      <div className="max-w-5xl w-full mx-auto flex-1 flex flex-col min-h-0 gap-2.5">
        <div className="flex items-center justify-between gap-3 flex-wrap shrink-0">
          <Link
            to="/courses"
            className="text-white/40 text-xs hover:text-white transition-colors inline-flex items-center gap-1.5"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
            Retour aux formations
          </Link>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-semibold text-orange-400 bg-orange-500/10 border border-orange-500/20 px-2.5 py-0.5 rounded-full">
              Formation Yealead
            </span>
            <span className="text-[11px] text-white/40 bg-white/5 border border-white/10 px-2 py-0.5 rounded-md">
              ⏳ ~{course.duration_minutes || 12} min
            </span>
          </div>
        </div>

        {step === 'reading' && (
          <div className="flex-1 flex flex-col min-h-0 gap-2.5 animate-[fadeIn_0.25s_ease]">
            <div className="shrink-0">
              <h1 className="text-base sm:text-lg font-bold text-white leading-tight">{course.title}</h1>
              <p className="text-xs text-white/50 mt-0.5">{course.description}</p>
            </div>

            <PdfViewer url={course.content_url || '/Strategie-prescription.pdf'} />

            <button
              onClick={() => setStep('quiz')}
              className="shrink-0 w-full text-white py-3 rounded-xl font-semibold text-sm transition-all hover:brightness-110 active:scale-[0.99] shadow-lg cursor-pointer flex items-center justify-center gap-2"
              style={{ backgroundColor: ACCENT }}
            >
              <span>J'ai terminé la lecture, passer au quiz</span>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </button>
          </div>
        )}

        {step === 'quiz' && (
          <div className="flex-1 flex flex-col min-h-0 gap-3 animate-[fadeIn_0.25s_ease]">
            <div className="flex items-center justify-between border-b border-white/10 pb-2 shrink-0">
              <div>
                <h1 className="text-base font-bold text-white">Quiz — {course.title}</h1>
                <p className="text-[11px] text-white/40">{answeredCount} / {totalQuestions} questions répondues</p>
              </div>
              <button
                onClick={handleRestart}
                className="text-xs px-2.5 py-1 rounded-lg border border-white/15 text-white/60 hover:text-white transition-all cursor-pointer shrink-0"
              >
                Recommencer
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-4 pr-1" style={{ scrollbarWidth: 'thin' }}>
              {course.questions.map((q, qi) => {
                const selectedOptionId = answers[q.id];
                const isAnswered = !!selectedOptionId;

                return (
                  <div key={q.id} className="bg-[#0f0f0f] border border-white/10 rounded-xl p-4 transition-all">
                    <div className="flex items-start justify-between gap-3 mb-3">
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
                        const isCorrect = opt.is_correct === true || opt.is_correct === 'true';

                        let optionStyle = 'bg-black/60 border-white/10 text-white/80 hover:border-white/30 cursor-pointer';

                        if (isAnswered) {
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
                            className={`w-full text-left p-3 rounded-lg text-xs sm:text-sm border transition-all flex items-center justify-between gap-2 ${optionStyle}`}
                          >
                            <span>{opt.option_text}</span>
                            {isAnswered && (
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
              className="shrink-0 w-full text-white py-3 rounded-xl font-semibold text-sm transition-all hover:brightness-110 active:scale-[0.99] disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer shadow-lg"
              style={{ backgroundColor: ACCENT }}
            >
              {submitting && <Spinner size={15} color="#fff" />}
              {submitting ? 'Validation...' : 'Valider mes réponses'}
            </button>
          </div>
        )}

        {step === 'result' && result && (
          <div className="flex-1 flex flex-col items-center justify-center text-center bg-[#0c0c0c] border border-white/10 rounded-2xl p-6 animate-[fadeIn_0.25s_ease]">
            <Confetti show={result.percent >= 70} />
            <div
              className="w-20 h-20 rounded-full mx-auto mb-4 flex items-center justify-center text-2xl font-bold text-white shadow-xl"
              style={{ background: `linear-gradient(135deg, ${ACCENT}, #d6491f)` }}
            >
              {result.percent}%
            </div>
            <h2 className="text-xl font-bold text-white mb-1">
              {result.percent >= 70 ? 'Félicitations !' : 'Score insuffisant'}
            </h2>
            <p className="text-white/50 text-xs mb-6">
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
      <style>{`@keyframes fadeIn { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: translateY(0); } }`}</style>
    </div>
  );
}

export default CourseDetail;