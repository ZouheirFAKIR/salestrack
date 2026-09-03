import { useEffect, useState } from 'react';
import { apiFetch } from '../../utils/api';
import { compressImage } from '../../utils/imageCompress';
import PageLoader from '../../components/PageLoader';
import Spinner from '../../components/Spinner';

const ACCENT = '#f86635';
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const inputStyle = {
  backgroundColor: 'var(--surface-strong)',
  border: '1px solid var(--border)',
  color: 'var(--text-primary)',
};

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
        className="p-2.5 rounded-lg text-sm outline-none focus:border-orange-500/60 sm:col-span-2"
        style={inputStyle}
      />
      <input
        value={values.description} onChange={(e) => onChange('description', e.target.value)}
        placeholder="Description"
        className="p-2.5 rounded-lg text-sm outline-none focus:border-orange-500/60 sm:col-span-2"
        style={inputStyle}
      />
      <label
        className="p-2.5 rounded-lg text-sm cursor-pointer transition-colors sm:col-span-2 flex items-center justify-center gap-2 hover:bg-[var(--surface)]"
        style={{ ...inputStyle, color: 'var(--text-muted)' }}
      >
        {bannerLoading ? 'Chargement...' : values.bannerUrl ? "Changer l'image de bannière" : 'Choisir une image de bannière'}
        <input type="file" accept="image/*" onChange={handleBannerFile} className="hidden" />
      </label>
      {values.bannerUrl && (
        <div className="sm:col-span-2 rounded-lg overflow-hidden h-28" style={{ border: '1px solid var(--border)' }}>
          <img src={values.bannerUrl} alt="Aperçu bannière" className="w-full h-full object-cover" onError={(e) => { e.target.style.display = 'none'; }} />
        </div>
      )}

      {mode === 'video' ? (
        <input
          value={values.videoUrl || ''} onChange={(e) => onChange('videoUrl', e.target.value)}
          placeholder="Lien vidéo ou playlist YouTube — ex: .../watch?v=XXX ou .../playlist?list=XXX"
          className="p-2.5 rounded-lg text-sm outline-none focus:border-orange-500/60 sm:col-span-2"
          style={inputStyle}
        />
      ) : (
        <textarea
          value={values.contentText} onChange={(e) => onChange('contentText', e.target.value)}
          placeholder="Contenu du cours (texte complet, comme un article)"
          rows={8}
          className="p-2.5 rounded-lg text-sm outline-none focus:border-orange-500/60 sm:col-span-2"
          style={inputStyle}
        />
      )}

      <input
        value={values.duration} onChange={(e) => onChange('duration', e.target.value)}
        placeholder="Durée estimée (minutes)" type="number"
        className="p-2.5 rounded-lg text-sm outline-none focus:border-orange-500/60"
        style={inputStyle}
      />
    </div>
  );
}

function TypeToggle({ courseType, setCourseType }) {
  return (
    <div className="flex gap-2 mb-4">
      <button
        onClick={() => setCourseType('text')}
        className="flex-1 py-2.5 rounded-lg text-sm font-medium transition-all"
        style={courseType === 'text'
          ? { backgroundColor: ACCENT, color: '#fff' }
          : { backgroundColor: 'var(--surface-strong)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}
      >
        📄 Article à lire
      </button>
      <button
        onClick={() => setCourseType('video')}
        className="flex-1 py-2.5 rounded-lg text-sm font-medium transition-all"
        style={courseType === 'video'
          ? { backgroundColor: ACCENT, color: '#fff' }
          : { backgroundColor: 'var(--surface-strong)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}
      >
        🎬 Vidéo YouTube
      </button>
    </div>
  );
}

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
    <div className="rounded-xl p-4" style={{ backgroundColor: 'var(--surface-strong)', border: '1px solid var(--border)' }}>
      {error && <p className="text-red-500 text-xs mb-2">{error}</p>}
      <input
        value={question} onChange={(e) => setQuestion(e.target.value)}
        placeholder="Texte de la question"
        className="w-full p-2 rounded-lg text-sm outline-none focus:border-orange-500/60 mb-2"
        style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
      />
      <div className="flex items-center gap-2 mb-3">
        <label className="text-xs" style={{ color: 'var(--text-muted)' }}>Points :</label>
        <input
          type="number" value={points} onChange={(e) => setPoints(e.target.value)}
          className="w-20 p-1.5 rounded-lg text-sm outline-none focus:border-orange-500/60"
          style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
        />
      </div>
      <div className="flex flex-col gap-2">
        {options.map((opt, i) => (
          <div key={i} className="flex items-center gap-2">
            <button
              onClick={() => updateOption(i, 'correct')}
              className="w-5 h-5 rounded-full border-2 shrink-0 flex items-center justify-center"
              style={{ borderColor: opt.correct ? ACCENT : 'var(--border)' }}
              title="Marquer comme bonne réponse"
            >
              {opt.correct && <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: ACCENT }} />}
            </button>
            <input
              value={opt.text} onChange={(e) => updateOption(i, 'text', e.target.value)}
              placeholder={`Option ${i + 1}`}
              className="flex-1 p-2 rounded-lg text-sm outline-none focus:border-orange-500/60"
              style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
            />
            {options.length > 2 && (
              <button onClick={() => removeOption(i)} className="text-xs shrink-0 transition-colors hover:text-red-500" style={{ color: 'var(--text-muted)' }}>✕</button>
            )}
          </div>
        ))}
        {options.length < 5 && (
          <button onClick={addOption} className="text-xs text-left transition-colors hover:text-[var(--text-primary)]" style={{ color: 'var(--text-muted)' }}>+ Ajouter une option</button>
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
          <button
            onClick={onCancel}
            className="px-4 py-2 rounded-lg text-xs transition-colors hover:bg-[var(--surface)]"
            style={{ border: '1px solid var(--border)', color: 'var(--text-secondary)' }}
          >
            Annuler
          </button>
        )}
      </div>
    </div>
  );
}

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
    <div className="rounded-2xl p-5" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
      <p className="text-sm font-medium mb-3" style={{ color: 'var(--text-primary)' }}>Nouveau cours</p>
      {error && <p className="text-red-500 text-xs mb-3">{error}</p>}

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-5">
        <div>
          <TypeToggle courseType={courseType} setCourseType={setCourseType} />
          <CourseFields values={values} onChange={handleChange} mode={courseType} />

          <button
            onClick={handleCreate}
            disabled={saving}
            className="mt-4 w-full px-4 py-2.5 rounded-lg text-white text-sm font-medium disabled:opacity-60 flex items-center justify-center gap-2"
            style={{ backgroundColor: ACCENT }}
          >
            {saving && <Spinner size={13} color="#fff" />}
            Créer le cours
          </button>
        </div>

        <div className="rounded-xl p-4" style={{ backgroundColor: 'var(--surface-strong)', border: '1px solid var(--border)' }}>
          <p className="text-xs font-medium mb-3" style={{ color: 'var(--text-secondary)' }}>Questions du quiz ({questions.length})</p>
          <div className="flex flex-col gap-2 mb-2 max-h-[420px] overflow-y-auto pr-1">
            {questions.length === 0 && !addingQuestion && (
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Aucune question pour l'instant</p>
            )}
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
                <div key={i} className="rounded-lg p-3 flex items-start justify-between gap-2" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}>
                  <div className="min-w-0">
                    <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{i + 1}. {q.question} <span className="text-xs" style={{ color: 'var(--text-muted)' }}>({q.points} pts)</span></p>
                    <div className="mt-1 flex flex-col gap-0.5">
                      {q.options.map((o, oi) => (
                        <p key={oi} className="text-xs" style={{ color: o.is_correct ? ACCENT : 'var(--text-muted)' }}>
                          {o.is_correct ? '✓' : '○'} {o.option_text}
                        </p>
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button onClick={() => setEditingIndex(i)} className="text-xs transition-colors hover:text-[var(--text-primary)]" style={{ color: 'var(--text-muted)' }}>Modifier</button>
                    <button onClick={() => handleDeleteQuestion(i)} className="text-xs transition-colors hover:text-red-500" style={{ color: 'var(--text-muted)' }}>Supprimer</button>
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
            <button onClick={() => setAddingQuestion(true)} className="text-xs w-full text-center py-2 rounded-lg transition-colors hover:bg-[var(--surface)]" style={{ color: ACCENT, border: `1px dashed ${ACCENT}55` }}>
              + Ajouter une question
            </button>
          )}
        </div>
      </div>
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
    <div className="rounded-xl p-4 mb-3" style={{ backgroundColor: 'var(--surface-strong)', border: '1px solid var(--border)' }}>
      <p className="text-xs font-medium mb-3" style={{ color: 'var(--text-secondary)' }}>Modifier le cours</p>

      <TypeToggle courseType={courseType} setCourseType={setCourseType} />

      {error && <p className="text-red-500 text-xs mb-2">{error}</p>}
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
          className="px-4 py-2 rounded-lg text-xs transition-colors hover:bg-[var(--surface)]"
          style={{ border: '1px solid var(--border)', color: 'var(--text-secondary)' }}
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
        <div key={c.commercial_id} className="flex items-center justify-between gap-2 rounded-lg p-2.5" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}>
          <div className="min-w-0">
            <p className="text-xs truncate" style={{ color: 'var(--text-secondary)' }}>{c.nom}</p>
            <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
              {c.score !== null ? `Complété — ${c.score}/${c.max_score}` : 'Pas encore commencé'}
            </p>
          </div>
          {c.score !== null && (
            <button
              onClick={() => handleReset(c.commercial_id)}
              disabled={resettingId === c.commercial_id}
              className="text-[11px] px-2.5 py-1 rounded-lg transition-colors shrink-0 disabled:opacity-50 hover:bg-orange-500/10"
              style={{ border: '1px solid rgba(248,102,53,0.3)', color: ACCENT }}
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

  const isVideo = course.content_type === 'video';

  return (
    <div className="rounded-2xl overflow-hidden" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
      <div className="p-4 flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <div className="relative shrink-0">
            {course.banner_url ? (
              <img
                src={course.banner_url}
                alt=""
                className="w-12 h-12 sm:w-14 sm:h-14 rounded-lg object-cover"
                style={{ border: '1px solid var(--border)' }}
                onError={(e) => { e.target.style.display = 'none'; }}
              />
            ) : (
              <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-lg flex items-center justify-center text-lg" style={{ backgroundColor: 'var(--surface-strong)', border: '1px solid var(--border)' }}>
                {isVideo ? '🎬' : '📄'}
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="font-medium truncate" style={{ color: 'var(--text-primary)' }}>{course.title}</p>
              <span
                className="text-[10px] px-2 py-0.5 rounded-full shrink-0"
                style={{ backgroundColor: isVideo ? '#3b82f61a' : `${ACCENT}1a`, color: isVideo ? '#3b82f6' : ACCENT }}
              >
                {isVideo ? 'Vidéo' : 'Article'}
              </span>
            </div>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{course.question_count} question(s)</p>
          </div>
        </div>
        <div className="grid grid-cols-3 sm:flex sm:items-center gap-2 shrink-0">
          <button
            onClick={() => { setIsEditingCourse((v) => !v); if (!expanded) toggleExpand(); }}
            className="text-xs px-3 py-1.5 rounded-lg transition-colors hover:bg-[var(--surface-strong)]"
            style={{ border: '1px solid var(--border)', color: 'var(--text-secondary)' }}
          >
            Modifier
          </button>
          <button
            onClick={toggleExpand}
            className="text-xs px-3 py-1.5 rounded-lg transition-colors hover:bg-[var(--surface-strong)]"
            style={{ border: '1px solid var(--border)', color: 'var(--text-secondary)' }}
          >
            {expanded ? 'Fermer' : 'Gérer'}
          </button>
          <button
            onClick={handleDeleteCourse}
            disabled={deleting}
            className="text-xs px-3 py-1.5 rounded-lg transition-colors hover:bg-red-500/10"
            style={{ border: '1px solid rgba(239,68,68,0.3)', color: '#ef4444' }}
          >
            Supprimer
          </button>
        </div>
      </div>

      {expanded && (
        <div className="p-4" style={{ borderTop: '1px solid var(--border)' }}>
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
                    <div key={q.id} className="rounded-lg p-3" style={{ backgroundColor: 'var(--surface-strong)', border: '1px solid var(--border)' }}>
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{qi + 1}. {q.question} <span className="text-xs" style={{ color: 'var(--text-muted)' }}>({q.points} pts)</span></p>
                        <div className="flex items-center gap-2 shrink-0">
                          <button onClick={() => setEditingQuestionId(q.id)} className="text-xs transition-colors hover:text-[var(--text-primary)]" style={{ color: 'var(--text-muted)' }}>Modifier</button>
                          <button onClick={() => handleDeleteQuestion(q.id)} className="text-xs transition-colors hover:text-red-500" style={{ color: 'var(--text-muted)' }}>Supprimer</button>
                        </div>
                      </div>
                      <div className="mt-2 flex flex-col gap-1">
                        {q.options.map((o) => (
                          <p key={o.id} className="text-xs" style={{ color: o.is_correct ? ACCENT : 'var(--text-muted)' }}>
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
    <div className="min-h-[calc(100vh-64px)] p-4 sm:p-6 pb-12 relative overflow-hidden" style={{ backgroundColor: 'var(--bg)' }}>
      <div
        className="absolute -top-24 -right-32 w-[36rem] h-[36rem] rounded-full pointer-events-none"
        style={{ background: `radial-gradient(circle, ${ACCENT}18, transparent 70%)`, filter: 'blur(6px)' }}
      />
      <div
        className="absolute -bottom-40 -left-32 w-[40rem] h-[40rem] rounded-full pointer-events-none"
        style={{ background: `radial-gradient(circle, ${ACCENT}14, transparent 70%)`, filter: 'blur(6px)' }}
      />

      <div className="max-w-6xl mx-auto flex flex-col gap-5 relative z-10">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold tracking-tight" style={{ color: 'var(--text-primary)' }}>Administration — Formations</h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--text-secondary)' }}>Ajoute et gère les cours et leurs quiz</p>
        </div>

        <NewCourseForm onCreated={loadCourses} />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
          {courses.length === 0 && <p className="text-sm text-center lg:col-span-2" style={{ color: 'var(--text-muted)' }}>Aucun cours pour l'instant</p>}
          {courses.map((c) => (
            <CourseCard key={c.id} course={c} onRefresh={loadCourses} />
          ))}
        </div>
      </div>
    </div>
  );
}

export default AdminCourses;