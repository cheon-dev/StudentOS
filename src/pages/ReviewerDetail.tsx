import { useEffect, useState } from 'react'
import { ArrowLeft, BookOpenCheck, Bot, CheckCircle2, ChevronDown, Pencil, Plus, Trash2, Upload, X } from 'lucide-react'
import { Link, useParams } from 'react-router-dom'
import { Toast } from '../components/subjects/Toast.tsx'
import { useAuth } from '../context/useAuth.ts'
import { AIRequestError, generateReviewerQuestions, getAIErrorMessage } from '../services/aiService.ts'
import { subscribeToQuizAttempts } from '../services/quizService.ts'
import { createQuestion, deleteQuestion, subscribeToQuestions, subscribeToReviewer, updateQuestion, updateReviewer } from '../services/reviewerService.ts'
import { subscribeToSubjects } from '../services/subjectService.ts'
import type { Subject } from '../types/subject.ts'
import { emptyQuestion, questionTypes, type Question, type QuestionFormData, type QuestionType, type QuizAttempt, type Reviewer, type ReviewerFormData } from '../types/reviewer.ts'
import { getFirebaseErrorMessage } from '../utils/firebaseError.ts'
import { parseQuestionImport, questionTypeLabel, validateQuestion } from '../utils/reviewer.ts'

export function ReviewerDetail() {
  const { reviewerId } = useParams()
  const { user } = useAuth()
  const uid = user?.uid
  const [reviewer, setReviewer] = useState<Reviewer | null>(null)
  const [questions, setQuestions] = useState<Question[]>([])
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [attempts, setAttempts] = useState<QuizAttempt[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [questionOpen, setQuestionOpen] = useState(false)
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null)
  const [reviewerOpen, setReviewerOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<Question | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [importOpen, setImportOpen] = useState(false)
  const [importText, setImportText] = useState('')
  const [importQuestions, setImportQuestions] = useState<QuestionFormData[]>([])
  const [importing, setImporting] = useState(false)
  const [generateOpen, setGenerateOpen] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [generatedQuestions, setGeneratedQuestions] = useState<QuestionFormData[]>([])
  const [generateError, setGenerateError] = useState('')
  const [toast, setToast] = useState<{ message: string; tone: 'success' | 'error' } | null>(null)

  useEffect(() => {
    if (!uid || !reviewerId) return
    const reviewerUnsubscribe = subscribeToReviewer(uid, reviewerId, (item) => {
      setReviewer(item)
      setLoading(false)
      if (!item) setError('This reviewer could not be found.')
    }, (reason) => {
      setError(getFirebaseErrorMessage(reason, 'We could not load this reviewer.'))
      setLoading(false)
    })
    const questionUnsubscribe = subscribeToQuestions(uid, reviewerId, setQuestions, (reason) => setError(getFirebaseErrorMessage(reason, 'Questions could not be loaded.')))
    const subjectUnsubscribe = subscribeToSubjects(uid, setSubjects, () => setSubjects([]))
    const attemptUnsubscribe = subscribeToQuizAttempts(uid, (items) => setAttempts(items.filter((attempt) => attempt.reviewerId === reviewerId)), () => setAttempts([]))
    return () => { reviewerUnsubscribe(); questionUnsubscribe(); subjectUnsubscribe(); attemptUnsubscribe() }
  }, [reviewerId, uid])

  async function saveReviewer(data: ReviewerFormData) {
    if (!uid || !reviewer) return
    setSaving(true)
    try {
      await updateReviewer(uid, reviewer.id, data)
      setReviewerOpen(false)
      setToast({ message: 'Reviewer updated.', tone: 'success' })
    } catch (reason) {
      setToast({ message: getFirebaseErrorMessage(reason, 'We could not update this reviewer.'), tone: 'error' })
    } finally { setSaving(false) }
  }

  async function saveQuestion(data: QuestionFormData) {
    if (!uid || !reviewer) return
    const validation = validateQuestion(data)
    if (validation) { setToast({ message: validation, tone: 'error' }); return }
    setSaving(true)
    try {
      if (editingQuestion) await updateQuestion(uid, reviewer.id, editingQuestion.id, data)
      else await createQuestion(uid, reviewer.id, data)
      setQuestionOpen(false)
      setEditingQuestion(null)
      setToast({ message: editingQuestion ? 'Question updated.' : 'Question added.', tone: 'success' })
    } catch (reason) {
      setToast({ message: getFirebaseErrorMessage(reason, 'We could not save this question.'), tone: 'error' })
    } finally { setSaving(false) }
  }

  async function removeQuestion() {
    if (!uid || !reviewer || !deleteTarget) return
    setDeleting(true)
    try {
      await deleteQuestion(uid, reviewer.id, deleteTarget.id)
      setDeleteTarget(null)
      setToast({ message: 'Question deleted.', tone: 'success' })
    } catch (reason) {
      setToast({ message: getFirebaseErrorMessage(reason, 'We could not delete this question.'), tone: 'error' })
    } finally { setDeleting(false) }
  }

  function previewImport() { setImportQuestions(parseQuestionImport(importText)) }

  async function saveImport() {
    if (!uid || !reviewer) return
    const invalid = importQuestions.find((question) => validateQuestion(question))
    if (invalid) { setToast({ message: validateQuestion(invalid), tone: 'error' }); return }
    if (!importQuestions.length) { setToast({ message: 'Preview at least one question before importing.', tone: 'error' }); return }
    setImporting(true)
    try {
      await Promise.all(importQuestions.map((question) => createQuestion(uid, reviewer.id, question)))
      setImportOpen(false)
      setImportText('')
      setImportQuestions([])
      setToast({ message: `${importQuestions.length} question${importQuestions.length === 1 ? '' : 's'} imported.`, tone: 'success' })
    } catch (reason) {
      setToast({ message: getFirebaseErrorMessage(reason, 'Some questions could not be imported.'), tone: 'error' })
    } finally { setImporting(false) }
  }

  async function generateQuestions(topic: string, count: number, types: QuestionType[]) {
    setGenerateError('')
    setGenerating(true)
    try {
      const generated = await generateReviewerQuestions(topic, count, types)
      if (generated.length !== count || generated.some((question) => validateQuestion(question))) throw new AIRequestError('invalid-response', 'The AI returned an unusable question set. Please try again.')
      setGeneratedQuestions(generated)
    } catch (reason) {
      setGenerateError(getAIErrorMessage(reason))
    } finally { setGenerating(false) }
  }

  async function saveGeneratedQuestions() {
    if (!uid || !reviewer || !generatedQuestions.length) return
    const invalidIndex = generatedQuestions.findIndex((question) => Boolean(validateQuestion(question)))
    if (invalidIndex >= 0) { setGenerateError(`Question ${invalidIndex + 1} needs correction before it can be saved.`); return }
    setGenerating(true)
    try {
      await Promise.all(generatedQuestions.map((question) => createQuestion(uid, reviewer.id, question)))
      setGenerateOpen(false)
      setGeneratedQuestions([])
      setToast({ message: `${generatedQuestions.length} AI question${generatedQuestions.length === 1 ? '' : 's'} ready for review.`, tone: 'success' })
    } catch (reason) {
      setGenerateError(getFirebaseErrorMessage(reason, 'The generated questions could not be saved.'))
    } finally { setGenerating(false) }
  }

  if (loading) return <div className="reviewer-page"><div className="module-loading">Loading reviewer...</div></div>
  if (error || !reviewer || !reviewerId) return <div className="reviewer-page"><section className="subjects-feedback subjects-feedback--error"><BookOpenCheck size={25} /><h2>Reviewer unavailable</h2><p>{error || 'This reviewer could not be found.'}</p><Link className="secondary-button" to="/reviewer"><ArrowLeft size={15} /> Back to reviewers</Link></section></div>

  const subject = reviewer.subjectId ? subjects.find((item) => item.id === reviewer.subjectId) : undefined
  const averageScore = attempts.length ? Math.round(attempts.reduce((sum, attempt) => sum + attempt.percentage, 0) / attempts.length) : 0
  const bestScore = attempts.length ? Math.max(...attempts.map((attempt) => attempt.percentage)) : 0

  return <div className="reviewer-detail-page"><Link className="back-link" to="/reviewer"><ArrowLeft size={15} /> All reviewers</Link><section className="reviewer-detail-hero"><div><p className="dashboard-eyebrow">Review set</p><h1>{reviewer.title}</h1><p>{reviewer.description || 'Use this reviewer to practise active recall.'}</p><div className="reviewer-detail-tags"><span>{subject?.name || (reviewer.subjectId ? 'Deleted subject' : 'General')}</span><span>{questions.length} questions</span><span>{attempts.length} attempts</span></div></div><div className="reviewer-detail-actions"><button className="secondary-button" type="button" onClick={() => setReviewerOpen(true)}><Pencil size={15} /> Edit</button><Link className="primary-button" to={`/reviewer/${reviewer.id}/quiz`}><CheckCircle2 size={15} /> Start quiz</Link></div></section><section className="reviewer-stats"><div><span>Attempts</span><strong>{attempts.length}</strong></div><div><span>Best score</span><strong>{attempts.length ? `${bestScore}%` : '—'}</strong></div><div><span>Latest score</span><strong>{attempts[0] ? `${attempts[0].percentage}%` : '—'}</strong></div><div><span>Average score</span><strong>{attempts.length ? `${averageScore}%` : '—'}</strong></div></section><section className="reviewer-question-section"><div className="module-page-header"><div><p className="dashboard-eyebrow">Build your set</p><h2>Questions</h2></div><div className="reviewer-action-row"><button className="secondary-button" type="button" onClick={() => { setGeneratedQuestions([]); setGenerateError(''); setGenerateOpen(true) }}><Bot size={15} /> Generate questions</button><button className="secondary-button" type="button" onClick={() => setImportOpen(true)}><Upload size={15} /> Import text</button><button className="primary-button" type="button" onClick={() => { setEditingQuestion(null); setQuestionOpen(true) }}><Plus size={15} /> Add question</button></div></div>{questions.length === 0 ? <section className="subjects-feedback"><div className="empty-subject-icon"><BookOpenCheck size={27} /></div><h2>No questions yet</h2><p>Add a question, import structured text, or generate a preview with AI.</p></section> : <div className="reviewer-question-list">{questions.map((question, index) => <article className="reviewer-question-card" key={question.id}><div className="reviewer-question-card-heading"><span>Question {index + 1} · {questionTypeLabel(question.type)}</span><div><button type="button" aria-label="Edit question" onClick={() => { setEditingQuestion(question); setQuestionOpen(true) }}><Pencil size={14} /></button><button type="button" aria-label="Delete question" onClick={() => setDeleteTarget(question)}><Trash2 size={14} /></button></div></div><h3>{question.question}</h3>{question.choices.length > 0 && <ul>{question.choices.map((choice) => <li key={choice}>{choice}</li>)}</ul>}<p className="reviewer-question-answer">Answer: <strong>{question.correctAnswer}</strong></p>{question.explanation && <small>{question.explanation}</small>}</article>)}</div>}</section>{questionOpen && <QuestionForm question={editingQuestion} saving={saving} onClose={() => { setQuestionOpen(false); setEditingQuestion(null) }} onSubmit={saveQuestion} />}{reviewerOpen && <ReviewerEditForm reviewer={reviewer} subjects={subjects} saving={saving} onClose={() => setReviewerOpen(false)} onSubmit={saveReviewer} />}{importOpen && <ImportModal text={importText} questions={importQuestions} importing={importing} onTextChange={setImportText} onPreview={previewImport} onQuestionChange={(index, value) => setImportQuestions((current) => current.map((question, itemIndex) => itemIndex === index ? value : question))} onImport={() => void saveImport()} onClose={() => setImportOpen(false)} />}{generateOpen && <GenerateQuestionsModal questions={generatedQuestions} error={generateError} generating={generating} onGenerate={generateQuestions} onQuestionChange={(index, value) => setGeneratedQuestions((current) => current.map((question, itemIndex) => itemIndex === index ? value : question))} onSave={() => void saveGeneratedQuestions()} onClose={() => { setGenerateOpen(false); setGeneratedQuestions([]) }} />}{deleteTarget && <ConfirmQuestionDelete question={deleteTarget} deleting={deleting} onCancel={() => setDeleteTarget(null)} onConfirm={() => void removeQuestion()} />}{toast && <Toast message={toast.message} tone={toast.tone} onClose={() => setToast(null)} />}</div>
}

function ReviewerEditForm({ reviewer, subjects, saving, onClose, onSubmit }: { reviewer: Reviewer; subjects: Subject[]; saving: boolean; onClose: () => void; onSubmit: (data: ReviewerFormData) => void }) {
  const [form, setForm] = useState<ReviewerFormData>({ title: reviewer.title, subjectId: reviewer.subjectId, description: reviewer.description })
  return <div className="modal-layer"><button className="modal-backdrop" type="button" aria-label="Close form" onClick={onClose} /><form className="module-modal" onSubmit={(event) => { event.preventDefault(); void onSubmit(form) }}><button className="modal-close-button" type="button" aria-label="Close form" onClick={onClose}><X size={18} /></button><p className="dashboard-eyebrow">Reviewer settings</p><h2>Edit reviewer</h2><label>Title<input required value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} /></label><label>Subject<select value={form.subjectId ?? ''} onChange={(event) => setForm({ ...form, subjectId: event.target.value || null })}><option value="">General reviewer</option>{subjects.map((subject) => <option value={subject.id} key={subject.id}>{subject.name}</option>)}</select></label><label>Description<textarea rows={4} value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} /></label><div className="modal-actions"><button className="secondary-button" type="button" onClick={onClose}>Cancel</button><button className="primary-button" type="submit" disabled={saving}>{saving ? 'Saving...' : 'Save changes'}</button></div></form></div>
}

function QuestionForm({ question, saving, onClose, onSubmit }: { question: Question | null; saving: boolean; onClose: () => void; onSubmit: (data: QuestionFormData) => void }) {
  const [form, setForm] = useState<QuestionFormData>(question ? { type: question.type, question: question.question, choices: question.choices, correctAnswer: question.correctAnswer, explanation: question.explanation } : emptyQuestion())
  function changeType(type: QuestionType) { setForm(emptyQuestion(type)) }
  return <div className="modal-layer"><button className="modal-backdrop" type="button" aria-label="Close question form" onClick={onClose} /><form className="module-modal module-modal--wide" onSubmit={(event) => { event.preventDefault(); void onSubmit(form) }}><button className="modal-close-button" type="button" aria-label="Close form" onClick={onClose}><X size={18} /></button><p className="dashboard-eyebrow">Question editor</p><h2>{question ? 'Edit question' : 'Add question'}</h2><label>Question type<select value={form.type} onChange={(event) => changeType(event.target.value as QuestionType)}>{questionTypes.map((type) => <option value={type} key={type}>{questionTypeLabel(type)}</option>)}</select></label><label>Question<textarea required rows={3} value={form.question} onChange={(event) => setForm({ ...form, question: event.target.value })} /></label>{form.type === 'multiple_choice' && <div className="question-choice-editor">{form.choices.map((choice, index) => <label key={index}>Choice {String.fromCharCode(65 + index)}<input required value={choice} onChange={(event) => setForm({ ...form, choices: form.choices.map((item, itemIndex) => itemIndex === index ? event.target.value : item) })} /></label>)}</div>}<label>Correct answer{form.type === 'multiple_choice' ? <select required value={form.correctAnswer} onChange={(event) => setForm({ ...form, correctAnswer: event.target.value })}><option value="">Select correct choice</option>{form.choices.map((choice) => <option value={choice} key={choice}>{choice}</option>)}</select> : form.type === 'true_false' ? <select value={form.correctAnswer} onChange={(event) => setForm({ ...form, correctAnswer: event.target.value })}><option>True</option><option>False</option></select> : <input required value={form.correctAnswer} onChange={(event) => setForm({ ...form, correctAnswer: event.target.value })} />}</label><label>Explanation<textarea rows={3} value={form.explanation} onChange={(event) => setForm({ ...form, explanation: event.target.value })} /></label><div className="modal-actions"><button className="secondary-button" type="button" onClick={onClose}>Cancel</button><button className="primary-button" type="submit" disabled={saving}>{saving ? 'Saving...' : question ? 'Save changes' : 'Add question'}</button></div></form></div>
}

function ImportModal({ text, questions, importing, onTextChange, onPreview, onQuestionChange, onImport, onClose }: { text: string; questions: QuestionFormData[]; importing: boolean; onTextChange: (value: string) => void; onPreview: () => void; onQuestionChange: (index: number, value: QuestionFormData) => void; onImport: () => void; onClose: () => void }) {
  return <div className="modal-layer"><button className="modal-backdrop" type="button" aria-label="Close import" onClick={onClose} /><section className="module-modal module-modal--wide"><button className="modal-close-button" type="button" aria-label="Close import" onClick={onClose}><X size={18} /></button><p className="dashboard-eyebrow">Structured text</p><h2>Import questions</h2><p>Preview and correct parsed questions before saving them.</p><textarea className="import-textarea" rows={8} value={text} placeholder={'1. What does HTML stand for?\nA. Hyper Text Markup Language\nB. High Text Machine Language\nAnswer: A'} onChange={(event) => onTextChange(event.target.value)} /><button className="secondary-button" type="button" onClick={onPreview}><ChevronDown size={15} /> Preview import</button>{questions.length > 0 && <div className="import-preview-list">{questions.map((question, index) => <div className="import-preview-row" key={index}><strong>Question {index + 1}</strong><textarea rows={2} value={question.question} onChange={(event) => onQuestionChange(index, { ...question, question: event.target.value })} />{question.choices.map((choice, choiceIndex) => <input key={choiceIndex} value={choice} placeholder={`Choice ${String.fromCharCode(65 + choiceIndex)}`} onChange={(event) => onQuestionChange(index, { ...question, choices: question.choices.map((item, itemIndex) => itemIndex === choiceIndex ? event.target.value : item) })} />)}<input value={question.correctAnswer} placeholder="Correct answer" onChange={(event) => onQuestionChange(index, { ...question, correctAnswer: event.target.value })} /><textarea rows={2} value={question.explanation} placeholder="Explanation" onChange={(event) => onQuestionChange(index, { ...question, explanation: event.target.value })} /><small className={validateQuestion(question) ? 'vault-form-error' : 'reviewer-import-valid'}>{validateQuestion(question) || 'Ready to import'}</small></div>)}</div>}<div className="modal-actions"><button className="secondary-button" type="button" onClick={onClose}>Cancel</button><button className="primary-button" type="button" disabled={importing || !questions.length} onClick={onImport}>{importing ? 'Importing...' : 'Import valid questions'}</button></div></section></div>
}

function GenerateQuestionsModal({ questions, error, generating, onGenerate, onQuestionChange, onSave, onClose }: { questions: QuestionFormData[]; error: string; generating: boolean; onGenerate: (topic: string, count: number, types: QuestionType[]) => Promise<void>; onQuestionChange: (index: number, value: QuestionFormData) => void; onSave: () => void; onClose: () => void }) {
  const [topic, setTopic] = useState('')
  const [count, setCount] = useState(10)
  const [types, setTypes] = useState<QuestionType[]>([...questionTypes])
  function toggleType(type: QuestionType) { setTypes((current) => current.includes(type) ? current.filter((item) => item !== type) : [...current, type]) }
  return <div className="modal-layer"><button className="modal-backdrop" type="button" aria-label="Close AI generation" onClick={generating ? undefined : onClose} /><section className="module-modal module-modal--wide generated-question-modal"><button className="modal-close-button" type="button" aria-label="Close AI generation" onClick={onClose} disabled={generating}><X size={18} /></button><p className="dashboard-eyebrow">AI-assisted study set</p><h2>Generate questions</h2>{questions.length === 0 ? <><p>Enter a topic or paste study text. AI output will be validated and previewed before anything is saved.</p><label>Topic or study text<textarea rows={8} value={topic} onChange={(event) => setTopic(event.target.value)} placeholder="Example: Explain normalization in relational databases..." disabled={generating} /></label><div className="generate-options"><label>Question count<input type="number" min="1" max="30" value={count} onChange={(event) => setCount(Math.max(1, Math.min(30, Number(event.target.value))))} disabled={generating} /></label><div><span className="quiz-label">Question types</span>{questionTypes.map((type) => <label className="quiz-check" key={type}><input type="checkbox" checked={types.includes(type)} onChange={() => toggleType(type)} disabled={generating} /><span>{questionTypeLabel(type)}</span></label>)}</div></div>{error && <div className="vault-notice" role="alert">{error}</div>}<div className="modal-actions"><button className="secondary-button" type="button" onClick={onClose} disabled={generating}>Cancel</button><button className="primary-button" type="button" disabled={generating || !topic.trim() || !types.length} onClick={() => void onGenerate(topic, count, types)}>{generating ? 'Generating questions...' : 'Generate preview'}</button></div></> : <><p>Review every generated question before saving it to this reviewer.</p><div className="generated-question-list">{questions.map((question, index) => <div className="generated-question-row" key={index}><strong>Question {index + 1}</strong><textarea rows={2} value={question.question} onChange={(event) => onQuestionChange(index, { ...question, question: event.target.value })} />{question.type === 'multiple_choice' && question.choices.map((choice, choiceIndex) => <input key={choiceIndex} value={choice} onChange={(event) => onQuestionChange(index, { ...question, choices: question.choices.map((item, itemIndex) => itemIndex === choiceIndex ? event.target.value : item) })} />)}<input value={question.correctAnswer} placeholder="Correct answer" onChange={(event) => onQuestionChange(index, { ...question, correctAnswer: event.target.value })} /><textarea rows={2} value={question.explanation} placeholder="Explanation" onChange={(event) => onQuestionChange(index, { ...question, explanation: event.target.value })} /><small className={validateQuestion(question) ? 'vault-form-error' : 'reviewer-import-valid'}>{validateQuestion(question) || 'Validated question'}</small></div>)}</div>{error && <div className="vault-notice" role="alert">{error}</div>}<div className="modal-actions"><button className="secondary-button" type="button" onClick={() => setTopic('')} disabled={generating}>Generate another set</button><button className="primary-button" type="button" onClick={onSave} disabled={generating}>{generating ? 'Saving questions...' : 'Save validated questions'}</button></div></>}</section></div>
}

function ConfirmQuestionDelete({ question, deleting, onCancel, onConfirm }: { question: Question; deleting: boolean; onCancel: () => void; onConfirm: () => void }) {
  return <div className="modal-layer"><button className="modal-backdrop" type="button" aria-label="Close confirmation" onClick={onCancel} /><section className="module-modal module-modal--small"><h2>Delete question?</h2><p><strong>{question.question}</strong> will be permanently removed from the reviewer.</p><div className="modal-actions"><button className="secondary-button" type="button" onClick={onCancel}>Cancel</button><button className="danger-button" type="button" disabled={deleting} onClick={onConfirm}>{deleting ? 'Deleting...' : 'Delete'}</button></div></section></div>
}
