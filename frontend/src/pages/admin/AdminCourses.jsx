import { useEffect, useState } from 'react';
import { apiFetch } from '../../utils/api';
import { compressImage } from '../../utils/imageCompress';
import PageLoader from '../../components/PageLoader';
import Spinner from '../../components/Spinner';

const ACCENT = '#f86635';
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

function CourseFields({ values, onChange, mode }) {
  const [bannerLoading, setBannerLoading] = useState(false);

    const handleBannerFile = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setBannerLoading(true);
    try {
      const compressed = await compressImage(file, 1000, 0.7);
      onChange('bannerUrl', compressed);
    } catch (err) {
      alert('Erreur lors du traitement de l\'image');
    }
    setBannerLoading(false);
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <input
        value={values.title} onChange={(e) => onChange('title', e.target.value)}
        placeholder="Titre du cours"
        className="p-2.5 rounded-lg bg-black border border-white/10 text-white text-sm outline-none focus:border-orange-500/60 sm:col-span-2"
      />
      <input
        value={values.description} onChange={(e) => onChange('description', e.target.value)}
        placeholder="Description"
        className="p-2.5 rounded-lg bg-black border border-white/10 text-white text-sm outline-none focus:border-orange-500/60 sm:col-span-2"
      />
      <label className="p-2.5 rounded-lg bg-black border border-white/10 text-white/50 text-sm cursor-pointer hover:text-white transition-colors sm:col-span-2 flex items-center justify-center gap-2">
        {bannerLoading ? 'Chargement...' : values.bannerUrl ? "Changer l'image de bannière" : 'Choisir une image de bannière'}
        <input type="file" accept="image/*" onChange={handleBannerFile} className="hidden" />
      </label>
      {values.bannerUrl && (
        <div className="sm:col-span-2 rounded-lg overflow-hidden border border-white/10 h-28">
          <img src={values.bannerUrl} alt="Aperçu bannière" className="w-full h-full object-cover" onError={(e) => { e.target.style.display = 'none'; }} />
        </div>
      )}
      {mode === 'video' ? (
        <input
          value={values.videoUrl || ''} onChange={(e) => onChange('videoUrl', e.target.value)}
          placeholder="Lien vidéo ou playlist YouTube — ex: .../watch?v=XXX ou .../playlist?list=XXX"
          className="p-2.5 rounded-lg bg-black border border-white/10 text-white text-sm outline-none focus:border-orange-500/60 sm:col-span-2"
        />
      ) : (
        <textarea
          value={values.contentText} onChange={(e) => onChange('contentText', e.target.value)}
          placeholder="Contenu du cours (texte complet, comme un article)"
          rows={8}
          className="p-2.5 rounded-lg bg-black border border-white/10 text-white text-sm outline-none focus:border-orange-500/60 sm:col-span-2"
        />
      )}
      <input
        value={values.duration} onChange={(e) => onChange('duration', e.target.value)}
        placeholder="Durée estimée (minutes)" type="number"
        className="p-2.5 rounded-lg bg-black border border-white/10 text-white text-sm outline-none focus:border-orange-500/60"
      />
    </div>
  );
}

// Formulaire réutilisable pour ajouter OU modifier une question.
// En mode "ajout local" (dans le formulaire de création de cours), onSubmit
// reçoit juste les données, sans appel API — le parent gère la liste locale.
// En mode "édition d'une question existante", onSubmit fait l'appel API.
function QuestionEditorForm({ initial, onSubmit, onCancel, saving }) {
  const [question, setQuestion] = useState(initial?.question || '');
  const [points, setPoints] = useState(initial?.points || 10);
  const [options, setOptions] = useState(
    initial?.options?.map((o) => ({ text: o.option_text, correct: o.is_correct })) ||
    [{ text: '', correct: true }, { text: '', correct: false }, { text: '', correct: false }]
  );
  const [error, setError] = useState('');

  const updateOption = (i, field, value) => {
    setOptions((prev) => prev.map((o, idx) => {
      if (field === 'correct') return { ...o, correct: idx === i };
      return idx === i ? { ...o, [field]: value } : o;
    }));
  };

  const addOption = () => {
    if (options.length < 5) setOptions((prev) => [...prev, { text: '', correct: false }]);
  };

  const removeOption = (i) => {
    if (options.length > 2) setOptions((prev) => prev.filter((_, idx) => idx !== i));
  };

  const handleSubmit = () => {
    if (!question.trim() || options.some((o) => !o.text.trim())) {
      setError('Remplis la question et toutes les options');
      return;
    }
    setError('');
    onSubmit({
      question,
      points: Number(points),
      options: options.map((o) => ({ option_text: o.text, is_correct: o.correct })),
    });
  };

  return (
    <div className="bg-black/40 border border-white/10 rounded-xl p-4">
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
            {options.length > 2 && (
              <button onClick={() => removeOption(i)} className="text-white/30 hover:text-red-400 text-xs shrink-0">✕</button>
            )}
          </div>
        ))}
        {options.length < 5 && (
          <button onClick={addOption} className="text-xs text-white/40 hover:text-white text-left">+ Ajouter une option</button>
        )}
      </div>
      <div className="flex items-center gap-2 mt-3">
        <button
          onClick={handleSubmit}
          disabled={saving}
          className="px-4 py-2 rounded-lg text-white text-xs font-medium disabled:opacity-60 flex items-center gap-2"
          style={{ backgroundColor: ACCENT }}
        >
          {saving && <Spinner size={12} color="#fff" />}
          {initial ? 'Enregistrer la question' : 'Ajouter la question'}
        </button>
        {onCancel && (
          <button onClick={onCancel} className="px-4 py-2 rounded-lg text-white/60 text-xs border border-white/10 hover:text-white transition-colors">
            Annuler
          </button>
        )}
      </div>
    </div>
  );
}

// Formulaire unique : infos du cours + questions, tout avant de créer.
function NewCourseForm({ onCreated }) {
  const [courseType, setCourseType] = useState('text');
  const [values, setValues] = useState({ title: '', description: '', bannerUrl: '', contentText: '', duration: '', videoUrl: '' });
  const [questions, setQuestions] = useState([]);
  const [addingQuestion, setAddingQuestion] = useState(false);
  const [editingIndex, setEditingIndex] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (field, value) => setValues((prev) => ({ ...prev, [field]: value }));

  const handleAddQuestion = (q) => {
    setQuestions((prev) => [...prev, q]);
    setAddingQuestion(false);
  };

  const handleEditQuestion = (q) => {
    setQuestions((prev) => prev.map((old, i) => (i === editingIndex ? q : old)));
    setEditingIndex(null);
  };

  const handleDeleteQuestion = (i) => {
    setQuestions((prev) => prev.filter((_, idx) => idx !== i));
  };

  const handleCreate = async () => {
    if (!values.title.trim()) { setError('Le titre est obligatoire'); return; }
    setError('');
    setSaving(true);
    try {
      const res = await apiFetch(`${API_URL}/api/admin/courses`, {
        method: 'POST',
        body: JSON.stringify({
          title: values.title, description: values.description,
          content_type: courseType,
          content_url: courseType === 'video' ? (values.videoUrl.trim() || null) : null,
          content_text: courseType === 'text' ? values.contentText : null,
          banner_url: values.bannerUrl || null,
          duration_minutes: values.duration ? Number(values.duration) : null,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || 'Erreur');
        setSaving(false);
        return;
      }
      const created = await res.json();

            await Promise.all(
        questions.map((q) =>
          apiFetch(`${API_URL}/api/admin/courses/${created.id}/questions`, {
            method: 'POST',
            body: JSON.stringify(q),
          })
        )
      );

      setValues({ title: '', description: '', bannerUrl: '', contentText: '', duration: '', videoUrl: '' });
      setQuestions([]);
      onCreated();
    } catch (err) {
      setError('Erreur réseau');
    }
    setSaving(false);
  };

  return (
    <div className="bg-white/5 border border-white/10 rounded-2xl p-5 mb-5">
      <p className="text-sm font-semibold text-white mb-3">Nouveau cours</p>

      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setCourseType('text')}
          className="flex-1 py-2.5 rounded-lg text-sm font-medium transition-all"
          style={courseType === 'text' ? { backgroundColor: ACCENT, color: '#fff' } : { backgroundColor: 'black', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.5)' }}
        >
          📄 Article à lire
        </button>
        <button
          onClick={() => setCourseType('video')}
          className="flex-1 py-2.5 rounded-lg text-sm font-medium transition-all"
          style={courseType === 'video' ? { backgroundColor: ACCENT, color: '#fff' } : { backgroundColor: 'black', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.5)' }}
        >
          🎬 Vidéo YouTube
        </button>
      </div>

      {error && <p className="text-red-400 text-xs mb-3">{error}</p>}
      <CourseFields values={values} onChange={handleChange} mode={courseType} />

      <div className="mt-4">
        <p className="text-xs font-medium text-white/60 mb-2">Questions du quiz ({questions.length})</p>
        <div className="flex flex-col gap-2 mb-2">
          {questions.map((q, i) => (
            editingIndex === i ? (
              <QuestionEditorForm
                key={i}
                initial={q}
                saving={false}
                onSubmit={handleEditQuestion}
                onCancel={() => setEditingIndex(null)}
              />
            ) : (
              <div key={i} className="bg-black/30 border border-white/10 rounded-lg p-3 flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm text-white/80">{i + 1}. {q.question} <span className="text-white/30 text-xs">({q.points} pts)</span></p>
                  <div className="mt-1 flex flex-col gap-0.5">
                    {q.options.map((o, oi) => (
                      <p key={oi} className="text-xs" style={{ color: o.is_correct ? ACCENT : 'rgba(255,255,255,0.4)' }}>
                        {o.is_correct ? '✓' : '○'} {o.option_text}
                      </p>
                    ))}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button onClick={() => setEditingIndex(i)} className="text-xs text-white/50 hover:text-white">Modifier</button>
                  <button onClick={() => handleDeleteQuestion(i)} className="text-xs text-red-400/70 hover:text-red-400">Supprimer</button>
                </div>
              </div>
            )
          ))}
        </div>

        {addingQuestion ? (
          <QuestionEditorForm
            saving={false}
            onSubmit={handleAddQuestion}
            onCancel={() => setAddingQuestion(false)}
          />
        ) : (
          <button onClick={() => setAddingQuestion(true)} className="text-xs" style={{ color: ACCENT }}>
            + Ajouter une question
          </button>
        )}
      </div>

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

function EditCourseForm({ course, onSaved, onCancel }) {
  const [courseType, setCourseType] = useState(course.content_type === 'video' ? 'video' : 'text');
  const [values, setValues] = useState({
    title: course.title || '',
    description: course.description || '',
    bannerUrl: course.banner_url || '',
    contentText: course.content_text || '',
    duration: course.duration_minutes || '',
    videoUrl: course.content_type === 'video' ? (course.content_url || '') : '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (field, value) => setValues((prev) => ({ ...prev, [field]: value }));

  const handleSave = async () => {
    if (!values.title.trim()) { setError('Le titre est obligatoire'); return; }
    setError('');
    setSaving(true);
    try {
      const res = await apiFetch(`${API_URL}/api/admin/courses/${course.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          title: values.title, description: values.description,
          content_type: courseType,
          content_url: courseType === 'video' ? (values.videoUrl.trim() || null) : null,
          content_text: courseType === 'text' ? values.contentText : null,
          banner_url: values.bannerUrl || null,
          duration_minutes: values.duration ? Number(values.duration) : null,
        }),
      });
      if (res.ok) {
        onSaved();
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
    <div className="bg-black/40 border border-white/10 rounded-xl p-4 mb-3">
      <p className="text-xs font-medium text-white/60 mb-2">Modifier le cours</p>

      <div className="flex gap-2 mb-3">
        <button
          onClick={() => setCourseType('text')}
          className="flex-1 py-2 rounded-lg text-xs font-medium transition-all"
          style={courseType === 'text' ? { backgroundColor: ACCENT, color: '#fff' } : { backgroundColor: 'black', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.5)' }}
        >
          📄 Article à lire
        </button>
        <button
          onClick={() => setCourseType('video')}
          className="flex-1 py-2 rounded-lg text-xs font-medium transition-all"
          style={courseType === 'video' ? { backgroundColor: ACCENT, color: '#fff' } : { backgroundColor: 'black', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.5)' }}
        >
          🎬 Vidéo YouTube
        </button>
      </div>

      {error && <p className="text-red-400 text-xs mb-2">{error}</p>}
      <CourseFields values={values} onChange={handleChange} mode={courseType} />
      <div className="flex items-center gap-2 mt-3">
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-4 py-2 rounded-lg text-white text-xs font-medium disabled:opacity-60 flex items-center gap-2"
          style={{ backgroundColor: ACCENT }}
        >
          {saving && <Spinner size={12} color="#fff" />}
          Enregistrer
        </button>
        <button
          onClick={onCancel}
          className="px-4 py-2 rounded-lg text-white/60 text-xs border border-white/10 hover:text-white transition-colors"
        >
          Annuler
        </button>
      </div>
    </div>
  );
}

function CourseCompletions({ courseId }) {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [resettingId, setResettingId] = useState(null);

  const load = () => {
    apiFetch(`${API_URL}/api/admin/courses/${courseId}/completions`)
      .then((r) => r.json())
      .then((data) => { setList(data); setLoading(false); });
  };

  useEffect(() => { load(); }, [courseId]);

  const handleReset = async (commercialId) => {
    if (!confirm('Réinitialiser cette formation pour ce commercial ?')) return;
    setResettingId(commercialId);
    await apiFetch(`${API_URL}/api/admin/courses/${courseId}/commercials/${commercialId}/attempt`, {
      method: 'DELETE',
    });
    setResettingId(null);
    load();
  };

  if (loading) return <Spinner size={16} color={ACCENT} />;

  return (
    <div className="flex flex-col gap-1.5 mt-3">
      {list.map((c) => (
        <div key={c.commercial_id} className="flex items-center justify-between gap-2 bg-black/30 border border-white/10 rounded-lg p-2.5">
          <div className="min-w-0">
            <p className="text-xs text-white/80 truncate">{c.nom}</p>
            <p className="text-[11px] text-white/40">
              {c.score !== null ? `Complété — ${c.score}/${c.max_score}` : 'Pas encore commencé'}
            </p>
          </div>
          {c.score !== null && (
            <button
              onClick={() => handleReset(c.commercial_id)}
              disabled={resettingId === c.commercial_id}
              className="text-[11px] px-2.5 py-1 rounded-lg border border-orange-500/30 text-orange-400 hover:bg-orange-500/10 transition-colors shrink-0 disabled:opacity-50"
            >
              {resettingId === c.commercial_id ? '...' : 'Réinitialiser'}
            </button>
          )}
        </div>
      ))}
    </div>
  );
}

function CourseCard({ course, onRefresh }) {
  const [expanded, setExpanded] = useState(false);
  const [detail, setDetail] = useState(null);
  const [addingQuestion, setAddingQuestion] = useState(false);
  const [editingQuestionId, setEditingQuestionId] = useState(null);
  const [savingQuestion, setSavingQuestion] = useState(false);
  const [isEditingCourse, setIsEditingCourse] = useState(false);
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

  const handleAddQuestion = async (q) => {
    setSavingQuestion(true);
    await apiFetch(`${API_URL}/api/admin/courses/${course.id}/questions`, {
      method: 'POST',
      body: JSON.stringify(q),
    });
    setSavingQuestion(false);
    setAddingQuestion(false);
    loadDetail();
    onRefresh();
  };

  const handleSaveQuestion = async (qId, q) => {
    setSavingQuestion(true);
    await apiFetch(`${API_URL}/api/admin/questions/${qId}`, {
      method: 'PUT',
      body: JSON.stringify(q),
    });
    setSavingQuestion(false);
    setEditingQuestionId(null);
    loadDetail();
  };

  const handleDeleteQuestion = async (qId) => {
    if (!confirm('Supprimer cette question ?')) return;
    await apiFetch(`${API_URL}/api/admin/questions/${qId}`, { method: 'DELETE' });
    loadDetail();
    onRefresh();
  };

  return (
    <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
      <div className="p-4 flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="flex items-center gap-3 min-w-0">
          {course.banner_url && (
            <img
              src={course.banner_url}
              alt=""
              className="w-12 h-12 sm:w-14 sm:h-14 rounded-lg object-cover shrink-0 border border-white/10"
              onError={(e) => { e.target.style.display = 'none'; }}
            />
          )}
          <div className="flex-1 min-w-0">
            <p className="text-white font-medium truncate">{course.title}</p>
            <p className="text-white/40 text-xs mt-0.5">{course.question_count} question(s)</p>
          </div>
        </div>
        <div className="grid grid-cols-3 sm:flex sm:items-center gap-2 shrink-0">
          <button
            onClick={() => { setIsEditingCourse((v) => !v); if (!expanded) toggleExpand(); }}
            className="text-xs px-3 py-1.5 rounded-lg border border-white/15 text-white/70 hover:text-white transition-colors"
          >
            Modifier
          </button>
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
              {isEditingCourse && (
                <EditCourseForm
                  course={detail}
                  onSaved={() => { setIsEditingCourse(false); loadDetail(); onRefresh(); }}
                  onCancel={() => setIsEditingCourse(false)}
                />
              )}

              <details className="mb-3">
                <summary className="text-xs cursor-pointer" style={{ color: ACCENT }}>Voir les commerciaux</summary>
                <CourseCompletions courseId={course.id} />
              </details>

              <div className="flex flex-col gap-2">
                {detail.questions.map((q, qi) => (
                  editingQuestionId === q.id ? (
                    <QuestionEditorForm
                      key={q.id}
                      initial={q}
                      saving={savingQuestion}
                      onSubmit={(data) => handleSaveQuestion(q.id, data)}
                      onCancel={() => setEditingQuestionId(null)}
                    />
                  ) : (
                    <div key={q.id} className="bg-black/30 border border-white/10 rounded-lg p-3">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm text-white/80">{qi + 1}. {q.question} <span className="text-white/30 text-xs">({q.points} pts)</span></p>
                        <div className="flex items-center gap-2 shrink-0">
                          <button onClick={() => setEditingQuestionId(q.id)} className="text-xs text-white/50 hover:text-white">Modifier</button>
                          <button onClick={() => handleDeleteQuestion(q.id)} className="text-xs text-red-400/70 hover:text-red-400">Supprimer</button>
                        </div>
                      </div>
                      <div className="mt-2 flex flex-col gap-1">
                        {q.options.map((o) => (
                          <p key={o.id} className="text-xs" style={{ color: o.is_correct ? ACCENT : 'rgba(255,255,255,0.4)' }}>
                            {o.is_correct ? '✓' : '○'} {o.option_text}
                          </p>
                        ))}
                      </div>
                    </div>
                  )
                ))}
              </div>

              {!addingQuestion ? (
                <button onClick={() => setAddingQuestion(true)} className="mt-3 text-xs" style={{ color: ACCENT }}>
                  + Ajouter une question
                </button>
              ) : (
                <div className="mt-3">
                  <QuestionEditorForm
                    saving={savingQuestion}
                    onSubmit={handleAddQuestion}
                    onCancel={() => setAddingQuestion(false)}
                  />
                </div>
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