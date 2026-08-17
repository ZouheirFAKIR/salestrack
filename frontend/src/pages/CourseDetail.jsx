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

function PdfCanvasPage({ pdfDoc, pageNum, containerWidth, zoom }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    let renderTask = null;
    let cancelled = false;
    if (!pdfDoc || !containerWidth) return;

    pdfDoc.getPage(pageNum).then((page) => {
      if (cancelled) return;

      // 1. Détecter la densité de pixels de l'écran mobile (Retina = 2x ou 3x)
      const dpr = Math.min(window.devicePixelRatio || 1, 3);

      // 2. Calcul de l'échelle d'affichage de base
      const baseViewport = page.getViewport({ scale: 1 });
      const cssScale = (containerWidth / baseViewport.width) * zoom;

      // 3. Viewport haute résolution pour le moteur de rendu
      const renderViewport = page.getViewport({ scale: cssScale * dpr });

      const canvas = canvasRef.current;
      if (!canvas) return;
      const context = canvas.getContext('2d', { alpha: false });

      // 4. Dimensions réelles (buffer HD)
      canvas.width = Math.floor(renderViewport.width);
      canvas.height = Math.floor(renderViewport.height);

      // 5. Dimensions CSS (affichage à l'écran)
      canvas.style.width = `${Math.floor(baseViewport.width * cssScale)}px`;
      canvas.style.height = 'auto';

      renderTask = page.render({
        canvasContext: context,
        viewport: renderViewport,
      });

      renderTask.promise.catch((err) => {
        if (err?.name !== 'RenderingCancelledException') {
          console.error(err);
        }
      });
    });

    return () => {
      cancelled = true;
      if (renderTask) renderTask.cancel();
    };
  }, [pdfDoc, pageNum, containerWidth, zoom]);

  return <canvas ref={canvasRef} className="block mb-3 rounded-lg shadow-xl mx-auto bg-white" />;
}

function PdfViewer({ url }) {
  const containerRef = useRef(null);
  const wrapperRef = useRef(null);
  const [pdfDoc, setPdfDoc] = useState(null);
  const [numPages, setNumPages] = useState(0);
  const [containerWidth, setContainerWidth] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [zoom, setZoom] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(false);
    setErrorMsg('');
    pdfjsLib.getDocument({ url, disableStream: true, disableRange: true }).promise
      .then((doc) => {
        if (cancelled) return;
        setPdfDoc(doc);
        setNumPages(doc.numPages);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Erreur PDF.js :', err);
        if (!cancelled) {
          setError(true);
          setErrorMsg(err?.message || String(err));
          setLoading(false);
        }
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
  }, [measure, isFullscreen]);

  useEffect(() => {
    const onFsChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', onFsChange);
    return () => document.removeEventListener('fullscreenchange', onFsChange);
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      wrapperRef.current?.requestFullscreen?.();
    } else {
      document.exitFullscreen?.();
    }
  };

  const handleDownload = () => {
    const a = document.createElement('a');
    a.href = url;
    a.download = '';
    a.target = '_blank';
    a.click();
  };

  const pages = Array.from({ length: numPages }, (_, i) => i + 1);

  return (
    <div
      ref={wrapperRef}
      className="flex-1 min-h-0 flex flex-col bg-[#0a0a0a] border border-white/10 rounded-xl overflow-hidden"
      style={isFullscreen ? { backgroundColor: '#0a0a0a' } : undefined}
    >
      <div className="flex items-center justify-between gap-2 px-3 py-2 border-b border-white/10 shrink-0 bg-[#0d0d0d]">
        <span className="text-[11px] text-white/40">{numPages > 0 ? `${numPages} page${numPages > 1 ? 's' : ''}` : ''}</span>
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setZoom((z) => Math.max(0.6, +(z - 0.2).toFixed(1)))}
            title="Réduire"
            className="w-8 h-8 rounded-lg bg-black/60 border border-white/10 hover:border-white/30 text-white/80 hover:text-white flex items-center justify-center text-sm font-semibold transition-all cursor-pointer"
          >
            −
          </button>
          <button
            onClick={() => setZoom(1)}
            title="Taille standard"
            className="px-2.5 h-8 rounded-lg bg-black/60 border border-white/10 hover:border-white/30 text-white/70 hover:text-white text-xs font-medium transition-all cursor-pointer"
          >
            {Math.round(zoom * 100)}%
          </button>
          <button
            onClick={() => setZoom((z) => Math.min(2.5, +(z + 0.2).toFixed(1)))}
            title="Agrandir"
            className="w-8 h-8 rounded-lg bg-black/60 border border-white/10 hover:border-white/30 text-white/80 hover:text-white flex items-center justify-center text-sm font-semibold transition-all cursor-pointer"
          >
            +
          </button>
          <button
            onClick={handleDownload}
            title="Télécharger"
            className="w-8 h-8 rounded-lg bg-black/60 border border-white/10 hover:border-white/30 text-white/80 hover:text-white flex items-center justify-center transition-all cursor-pointer ml-1"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
            </svg>
          </button>
          <button
            onClick={toggleFullscreen}
            title={isFullscreen ? 'Quitter plein écran' : 'Plein écran'}
            className="w-8 h-8 rounded-lg bg-black/60 border border-white/10 hover:border-white/30 text-white/80 hover:text-white flex items-center justify-center transition-all cursor-pointer"
          >
            {isFullscreen ? (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3" />
              </svg>
            ) : (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M15 3h6v6m0-6-7 7M9 21H3v-6m0 6 7-7" />
              </svg>
            )}
          </button>
        </div>
      </div>

      <div
        ref={containerRef}
        className="flex-1 min-h-0 overflow-y-auto overflow-x-auto p-2"
        style={{ scrollbarWidth: 'thin', scrollbarColor: `${ACCENT} #1a1a1a` }}
      >
        {loading && (
          <div className="h-full flex flex-col items-center justify-center gap-3 py-16">
            <Spinner size={28} color={ACCENT} />
            <p className="text-xs text-white/50">Chargement du document...</p>
          </div>
        )}
        {error && (
          <div className="h-full flex flex-col items-center justify-center text-white/40 text-sm py-16 gap-2 px-4 text-center">
            <p>Impossible d'afficher le document.</p>
            <p className="text-white/25 text-xs break-all">{errorMsg}</p>
          </div>
        )}
        {!loading && !error && pdfDoc && containerWidth > 0 && (
          <div className="flex flex-col items-center min-w-max mx-auto">
            {pages.map((p) => (
              <PdfCanvasPage key={p} pdfDoc={pdfDoc} pageNum={p} containerWidth={containerWidth} zoom={zoom} />
            ))}
          </div>
        )}
      </div>
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
    <div className="bg-black text-white h-[calc(100dvh-64px)] overflow-hidden flex flex-col p-3 sm:p-5">
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