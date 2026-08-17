import { useEffect, useState } from 'react';
import { apiFetch } from '../../utils/api';
import PageLoader from '../../components/PageLoader';
import Spinner from '../../components/Spinner';

const ACCENT = '#f86635';
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

function NewCourseForm({ onCreated }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [contentUrl, setContentUrl] = useState('');
  const [duration, setDuration] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleCreate = async () => {
    if (!title.trim()) { setError('Le titre est obligatoire'); return; }
    setError('');
    setSaving(true);
    try {
      const res = await apiFetch(`${API_URL}/api/admin/courses`, {
        method: 'POST',
        body: JSON.stringify({
          title, description, content_type: 'pdf',
          content_url: contentUrl, duration_minutes: duration ? Number(duration) : null,
        }),
      });
      if (res.ok) {
        setTitle(''); setDescription(''); setContentUrl(''); setDuration('');
        onCreated();
      } else {
        const data = await res.json();
        setError(data.error || 'Erreur');
      }
    } catch (err) {
      setError('Erreur réseau');
    }
    setSaving(false);
  };

  return (
    <div className="bg-white/5 border border-white/10 rounded-2xl p-5 mb-5">
      <p className="text-sm font-semibold text-white mb-3">Nouveau cours</p>
      {error && <p className="text-red-400 text-xs mb-3">{error}</p>}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <input
          value={title} onChange={(e) => setTitle(e.target.value)}
          placeholder="Titre du cours"
          className="p-2.5 rounded-lg bg-black border border-white/10 text-white text-sm outline-none focus:border-orange-500/60 sm:col-span-2"
        />
        <input
          value={description} onChange={(e) => setDescription(e.target.value)}
          placeholder="Description"
          className="p-2.5 rounded-lg bg-black border border-white/10 text-white text-sm outline-none focus:border-orange-500/60 sm:col-span-2"
        />
        <input
          value={contentUrl} onChange={(e) => setContentUrl(e.target.value)}
          placeholder="Chemin du PDF (ex: /mon-cours.pdf)"
          className="p-2.5 rounded-lg bg-black border border-white/10 text-white text-sm outline-none focus:border-orange-500/60"
        />
        <input
          value={duration} onChange={(e) => setDuration(e.target.value)}
          placeholder="Durée estimée (minutes)" type="number"
          className="p-2.5 rounded-lg bg-black border border-white/10 text-white text-sm outline-none focus:border-orange-500/60"
        />
      </div>
      <p className="text-[11px] text-white/30 mt-2">
        Place d'abord le fichier PDF dans le dossier public du site, puis indique son chemin ici (ex: /guide-vente.pdf).
      </p>
      <button
        onClick={handleCreate}
        disabled={saving}
        className="mt-4 px-4 py-2 rounded-lg text-white text-sm font-medium disabled:opacity-60 flex items-center gap-2"
        style={{ backgroundColor: ACCENT }}
      >
        {saving && <Spinner size={13} color="#fff" />}
        Créer le cours
      </button>
    </div>
  );
}

function QuestionForm({ courseId, onAdded }) {
  const [question, setQuestion] = useState('');
  const [points, setPoints] = useState(10);
  const [options, setOptions] = useState([{ text: '', correct: true }, { text: '', correct: false }, { text: '', correct: false }]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const updateOption = (i, field, value) => {
    setOptions((prev) => prev.map((o, idx) => {
      if (field === 'correct') {
        return { ...o, correct: idx === i };
      }
      return idx === i ? { ...o, [field]: value } : o;
    }));
  };

  const addOption = () => {
    if (options.length < 5) setOptions((prev) => [...prev, { text: '', correct: false }]);
  };

  const handleAdd = async () => {
    if (!question.trim() || options.some((o) => !o.text.trim())) {
      setError('Remplis la question et toutes les options');
      return;
    }
    setError('');
    setSaving(true);
    try {
      const res = await apiFetch(`${API_URL}/api/admin/courses/${courseId}/questions`, {
        method: 'POST',
        body: JSON.stringify({
          question, points: Number(points),
          options: options.map((o) => ({ option_text: o.text, is_correct: o.correct })),
        }),
      });
      if (res.ok) {
        setQuestion(''); setPoints(10);
        setOptions([{ text: '', correct: true }, { text: '', correct: false }, { text: '', correct: false }]);
        onAdded();
      } else {
        const data = await res.json();
        setError(data.error || 'Erreur');
      }
    } catch (err) {
      setError('Erreur réseau');
    }
    setSaving(false);
  };

  return (
    <div className="bg-black/40 border border-white/10 rounded-xl p-4 mt-3">
      <p className="text-xs font-medium text-white/60 mb-2">Ajouter une question</p>
      {error && <p className="text-red-400 text-xs mb-2">{error}</p>}
      <input
        value={question} onChange={(e) => setQuestion(e.target.value)}
        placeholder="Texte de la question"
        className="w-full p-2 rounded-lg bg-black border border-white/10 text-white text-sm outline-none focus:border-orange-500/60 mb-2"
      />
      <div className="flex items-center gap-2 mb-3">
        <label className="text-xs text-white/40">Points :</label>
        <input
          type="number" value={points} onChange={(e) => setPoints(e.target.value)}
          className="w-20 p-1.5 rounded-lg bg-black border border-white/10 text-white text-sm outline-none focus:border-orange-500/60"
        />
      </div>
      <div className="flex flex-col gap-2">
        {options.map((opt, i) => (
          <div key={i} className="flex items-center gap-2">
            <button
              onClick={() => updateOption(i, 'correct')}
              className="w-5 h-5 rounded-full border-2 shrink-0 flex items-center justify-center"
              style={{ borderColor: opt.correct ? ACCENT : 'rgba(255,255,255,0.2)' }}
              title="Marquer comme bonne réponse"
            >
              {opt.correct && <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: ACCENT }} />}
            </button>
            <input
              value={opt.text} onChange={(e) => updateOption(i, 'text', e.target.value)}
              placeholder={`Option ${i + 1}`}
              className="flex-1 p-2 rounded-lg bg-black border border-white/10 text-white text-sm outline-none focus:border-orange-500/60"
            />
          </div>
        ))}
        {options.length < 5 && (
          <button onClick={addOption} className="text-xs text-white/40 hover:text-white text-left">+ Ajouter une option</button>
        )}
      </div>
      <button
        onClick={handleAdd}
        disabled={saving}
        className="mt-3 px-4 py-2 rounded-lg text-white text-xs font-medium disabled:opacity-60 flex items-center gap-2"
        style={{ backgroundColor: ACCENT }}
      >
        {saving && <Spinner size={12} color="#fff" />}
        Ajouter la question
      </button>
    </div>
  );
}

function CourseCard({ course, onRefresh }) {
  const [expanded, setExpanded] = useState(false);
  const [detail, setDetail] = useState(null);
  const [showQuestionForm, setShowQuestionForm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const loadDetail = async () => {
    const res = await apiFetch(`${API_URL}/api/admin/courses/${course.id}`);
    const data = await res.json();
    setDetail(data);
  };

  const toggleExpand = () => {
    if (!expanded && !detail) loadDetail();
    setExpanded((e) => !e);
  };

  const handleDeleteCourse = async () => {
    if (!confirm('Supprimer ce cours et toutes ses questions ?')) return;
    setDeleting(true);
    await apiFetch(`${API_URL}/api/admin/courses/${course.id}`, { method: 'DELETE' });
    onRefresh();
  };

  const handleDeleteQuestion = async (qId) => {
    if (!confirm('Supprimer cette question ?')) return;
    await apiFetch(`${API_URL}/api/admin/questions/${qId}`, { method: 'DELETE' });
    loadDetail();
  };

  return (
    <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
      <div className="p-4 flex items-center justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-white font-medium">{course.title}</p>
          <p className="text-white/40 text-xs mt-0.5">{course.question_count} question(s)</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button onClick={toggleExpand} className="text-xs px-3 py-1.5 rounded-lg border border-white/15 text-white/70 hover:text-white transition-colors">
            {expanded ? 'Fermer' : 'Gérer'}
          </button>
          <button
            onClick={handleDeleteCourse}
            disabled={deleting}
            className="text-xs px-3 py-1.5 rounded-lg border border-red-500/30 text-red-400 hover:bg-red-500/10 transition-colors"
          >
            Supprimer
          </button>
        </div>
      </div>

      {expanded && (
        <div className="border-t border-white/10 p-4">
          {!detail && <Spinner size={16} color={ACCENT} />}
          {detail && (
            <>
              <div className="flex flex-col gap-2">
                {detail.questions.map((q, qi) => (
                  <div key={q.id} className="bg-black/30 border border-white/10 rounded-lg p-3">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm text-white/80">{qi + 1}. {q.question} <span className="text-white/30 text-xs">({q.points} pts)</span></p>
                      <button onClick={() => handleDeleteQuestion(q.id)} className="text-xs text-red-400/70 hover:text-red-400 shrink-0">Supprimer</button>
                    </div>
                    <div className="mt-2 flex flex-col gap-1">
                      {q.options.map((o) => (
                        <p key={o.id} className="text-xs" style={{ color: o.is_correct ? ACCENT : 'rgba(255,255,255,0.4)' }}>
                          {o.is_correct ? '✓' : '○'} {o.option_text}
                        </p>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              {!showQuestionForm ? (
                <button onClick={() => setShowQuestionForm(true)} className="mt-3 text-xs" style={{ color: ACCENT }}>
                  + Ajouter une question
                </button>
              ) : (
                <QuestionForm courseId={course.id} onAdded={() => { loadDetail(); onRefresh(); }} />
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

function AdminCourses() {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadCourses = () => {
    apiFetch(`${API_URL}/api/admin/courses`)
      .then((r) => r.json())
      .then((data) => { setCourses(data); setLoading(false); });
  };

  useEffect(() => { loadCourses(); }, []);

  if (loading) return <PageLoader />;

  return (
    <div className="bg-black min-h-[calc(100vh-64px)] p-4 sm:p-6 pb-12">
      <div className="max-w-3xl mx-auto flex flex-col gap-5">
        <div>
          <h1 className="text-lg font-semibold text-white">Administration — Formations</h1>
          <p className="text-white/40 text-xs">Ajoute et gère les cours et leurs quiz</p>
        </div>

        <NewCourseForm onCreated={loadCourses} />

        <div className="flex flex-col gap-3">
          {courses.length === 0 && <p className="text-white/30 text-sm text-center">Aucun cours pour l'instant</p>}
          {courses.map((c) => (
            <CourseCard key={c.id} course={c} onRefresh={loadCourses} />
          ))}
        </div>
      </div>
    </div>
  );
}

export default AdminCourses;