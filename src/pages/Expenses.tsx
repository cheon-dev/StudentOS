import { useEffect, useState, type FormEvent } from 'react'
import { ArrowDownUp, ChevronLeft, ChevronRight, Coins, Pencil, Plus, Search, Trash2, X } from 'lucide-react'
import { useSearchParams } from 'react-router-dom'
import { useAuth } from '../context/useAuth.ts'
import { subscribeToProjects } from '../services/projectService.ts'
import { createExpense, deleteExpense, getFinanceSettings, saveFinanceSettings, subscribeToExpenses, updateExpense } from '../services/expenseService.ts'
import { subscribeToSubjects } from '../services/subjectService.ts'
import { expenseCategories, paymentMethods, emptyExpense, type Expense, type ExpenseFormData } from '../types/expense.ts'
import type { Project } from '../types/project.ts'
import type { Subject } from '../types/subject.ts'
import { getFirebaseErrorMessage } from '../utils/firebaseError.ts'
import { Toast } from '../components/subjects/Toast.tsx'

const peso = new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' })
type Sort = 'newest' | 'oldest' | 'highest' | 'lowest'
type HistoryFilter = 'today' | 'all'
const pageSize = 10

function startOfToday(date = new Date()) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

function startOfMonday(date = new Date()) {
  const today = startOfToday(date)
  const daysSinceMonday = today.getDay() === 0 ? 6 : today.getDay() - 1
  today.setDate(today.getDate() - daysSinceMonday)
  return today
}

function isSameDay(first: Date, second: Date) {
  return first.toDateString() === second.toDateString()
}

export function Expenses() {
  const { user } = useAuth()
  const uid = user?.uid
  const [params] = useSearchParams()
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [budget, setBudget] = useState(0)
  const [now, setNow] = useState(() => new Date())
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('all')
  const [method, setMethod] = useState('all')
  const [subjectId, setSubjectId] = useState('all')
  const [projectId, setProjectId] = useState('all')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [sort, setSort] = useState<Sort>('newest')
  const [historyFilter, setHistoryFilter] = useState<HistoryFilter>('today')
  const [page, setPage] = useState(1)
  const [formOpen, setFormOpen] = useState(() => params.get('new') === 'true')
  const [editing, setEditing] = useState<Expense | null>(null)
  const [form, setForm] = useState<ExpenseFormData>(emptyExpense)
  const [saving, setSaving] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<Expense | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [toast, setToast] = useState<{ message: string; tone: 'success' | 'error' } | null>(null)

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 60_000)
    return () => window.clearInterval(timer)
  }, [])

  useEffect(() => {
    if (!uid) return
    const unsubscribe = subscribeToExpenses(uid, (items) => { setExpenses(items); setLoading(false) }, (reason) => { setError(getFirebaseErrorMessage(reason, 'Expenses could not be loaded.')); setLoading(false) })
    const subjectsUnsubscribe = subscribeToSubjects(uid, setSubjects, () => setSubjects([]))
    const projectsUnsubscribe = subscribeToProjects(uid, setProjects, () => setProjects([]))
    void getFinanceSettings(uid).then((settings) => setBudget(settings.monthlyBudget)).catch(() => setBudget(0))
    return () => { unsubscribe(); subjectsUnsubscribe(); projectsUnsubscribe() }
  }, [uid])

  const subjectMap = new Map(subjects.map((subject) => [subject.id, subject.name]))
  const projectMap = new Map(projects.map((project) => [project.id, project.name]))
  const mondayStart = startOfMonday(now)
  const nextMonday = new Date(mondayStart)
  nextMonday.setDate(nextMonday.getDate() + 7)
  const dateOf = (expense: Expense) => expense.dateTimestamp?.toDate()
  const today = expenses.filter((expense) => { const date = dateOf(expense); return date ? isSameDay(date, now) : false }).reduce((sum, expense) => sum + expense.amount, 0)
  const week = expenses.filter((expense) => { const date = dateOf(expense); return date ? date >= mondayStart && date < nextMonday : false }).reduce((sum, expense) => sum + expense.amount, 0)
  const month = expenses.filter((expense) => { const date = dateOf(expense); return date?.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear() }).reduce((sum, expense) => sum + expense.amount, 0)
  const query = search.trim().toLowerCase()
  const visible = expenses.filter((expense) => {
    const date = dateOf(expense)
    const matchesHistory = historyFilter === 'all' || (date ? isSameDay(date, now) : false)
    const matchesDate = (!from || (date && date >= new Date(`${from}T00:00:00`))) && (!to || (date && date <= new Date(`${to}T23:59:59`)))
    return matchesHistory && matchesDate
      && (!query || `${expense.title} ${expense.description}`.toLowerCase().includes(query))
      && (category === 'all' || expense.category === category)
      && (method === 'all' || expense.paymentMethod === method)
      && (subjectId === 'all' || (subjectId === 'general' ? !expense.subjectId : expense.subjectId === subjectId))
      && (projectId === 'all' || (projectId === 'general' ? !expense.projectId : expense.projectId === projectId))
  }).sort((first, second) => sort === 'oldest' ? (first.dateTimestamp?.toMillis() ?? 0) - (second.dateTimestamp?.toMillis() ?? 0) : sort === 'highest' ? second.amount - first.amount : sort === 'lowest' ? first.amount - second.amount : (second.dateTimestamp?.toMillis() ?? 0) - (first.dateTimestamp?.toMillis() ?? 0))
  const pageCount = Math.max(1, Math.ceil(visible.length / pageSize))
  const currentPage = Math.min(page, pageCount)
  const pagedExpenses = visible.slice((currentPage - 1) * pageSize, currentPage * pageSize)
  const filtered = Boolean(query || category !== 'all' || method !== 'all' || subjectId !== 'all' || projectId !== 'all' || from || to || historyFilter !== 'today')

  function openCreate() { setEditing(null); setForm(emptyExpense()); setFormOpen(true) }
  function openEdit(expense: Expense) { setEditing(expense); setForm({ title: expense.title, amount: expense.amount, category: expense.category, date: expense.date, description: expense.description, paymentMethod: expense.paymentMethod, subjectId: expense.subjectId, projectId: expense.projectId }); setFormOpen(true) }
  function clear() { setSearch(''); setCategory('all'); setMethod('all'); setSubjectId('all'); setProjectId('all'); setFrom(''); setTo(''); setSort('newest'); setHistoryFilter('today') }
  function changeHistory(value: HistoryFilter) { setHistoryFilter(value); if (value === 'today') { setFrom(''); setTo('') } }

  async function save(event: FormEvent) {
    event.preventDefault()
    if (!uid || !form.title.trim() || form.amount < 0) return
    setSaving(true)
    try {
      if (editing) await updateExpense(uid, editing.id, form)
      else await createExpense(uid, form)
      setFormOpen(false)
      setToast({ message: editing ? 'Expense updated.' : 'Expense added.', tone: 'success' })
    } catch (reason) {
      setToast({ message: getFirebaseErrorMessage(reason, 'We could not save this expense.'), tone: 'error' })
    } finally { setSaving(false) }
  }

  async function remove() {
    if (!uid || !deleteTarget) return
    setDeleting(true)
    try { await deleteExpense(uid, deleteTarget.id); setDeleteTarget(null); setToast({ message: 'Expense deleted.', tone: 'success' }) }
    catch (reason) { setToast({ message: getFirebaseErrorMessage(reason, 'We could not delete this expense.'), tone: 'error' }) }
    finally { setDeleting(false) }
  }

  async function updateBudget(event: FormEvent) {
    event.preventDefault()
    if (!uid) return
    const value = Math.max(0, Number(budget) || 0)
    setBudget(value)
    try { await saveFinanceSettings(uid, value); setToast({ message: 'Monthly budget saved.', tone: 'success' }) }
    catch (reason) { setToast({ message: getFirebaseErrorMessage(reason, 'We could not save your budget.'), tone: 'error' }) }
  }

  return (
    <div className="finance-page">
      <section className="module-page-header"><div><p className="dashboard-eyebrow">Spend with intention</p><h1>Expenses</h1><p>Keep everyday spending visible without losing the bigger picture.</p></div><button className="primary-button" type="button" onClick={openCreate}><Plus size={17} /> Add expense</button></section>
      <section className="expense-summary"><Summary label="Spent today" value={today} /><Summary label="Spent this week" value={week} /><Summary label="Spent this month" value={month} /></section>
      <section className="budget-card"><div><p className="panel-eyebrow">Monthly budget</p><h2>{peso.format(budget)}</h2><p>{peso.format(month)} spent <span className={budget - month < 0 ? 'budget-over' : ''}>{budget ? `${peso.format(Math.max(0, budget - month))} remaining` : 'Set a budget to track remaining'}</span></p></div><form onSubmit={updateBudget}><label>Budget<input type="number" min="0" step="0.01" value={budget} onChange={(event) => setBudget(Number(event.target.value))} /></label><button className="secondary-button" type="submit">Save budget</button></form><div className="budget-track"><span style={{ width: `${budget ? Math.min(100, month / budget * 100) : 0}%` }} /></div>{budget > 0 && month > budget && <strong className="budget-over">Over budget</strong>}</section>
      <div className="expense-toolbar"><label className="projects-search"><Search size={16} /><input type="search" value={search} placeholder="Search title or description" aria-label="Search expenses" onChange={(event) => setSearch(event.target.value)} /></label><select value={historyFilter} aria-label="Filter expense history" onChange={(event) => changeHistory(event.target.value as HistoryFilter)}><option value="today">Today</option><option value="all">All history</option></select><select value={category} aria-label="Filter by category" onChange={(event) => setCategory(event.target.value)}><option value="all">All categories</option>{expenseCategories.map((item) => <option key={item}>{item}</option>)}</select><select value={method} aria-label="Filter by payment method" onChange={(event) => setMethod(event.target.value)}><option value="all">All payment methods</option>{paymentMethods.map((item) => <option key={item}>{item}</option>)}</select><select value={subjectId} aria-label="Filter by subject" onChange={(event) => setSubjectId(event.target.value)}><option value="all">All subjects</option><option value="general">No subject</option>{subjects.map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}</select><select value={projectId} aria-label="Filter by project" onChange={(event) => setProjectId(event.target.value)}><option value="all">All projects</option><option value="general">No project</option>{projects.map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}</select><label>Date from<input type="date" value={from} onChange={(event) => { setFrom(event.target.value); setHistoryFilter('all') }} /></label><label>Date to<input type="date" value={to} onChange={(event) => { setTo(event.target.value); setHistoryFilter('all') }} /></label><select value={sort} aria-label="Sort expenses" onChange={(event) => setSort(event.target.value as Sort)}><option value="newest">Newest</option><option value="oldest">Oldest</option><option value="highest">Highest amount</option><option value="lowest">Lowest amount</option></select>{filtered && <button className="clear-filters-button" type="button" onClick={clear}>Clear</button>}</div>
      <section className="expense-history"><div className="expense-history-heading"><div><p className="panel-eyebrow">{historyFilter === 'today' ? 'Today' : 'All records'}</p><h2>Expense history</h2></div><span>{visible.length} {visible.length === 1 ? 'record' : 'records'}</span></div>
        {error ? <section className="subjects-feedback subjects-feedback--error"><Coins size={25} /><h2>Expenses unavailable</h2><p>{error}</p></section> : loading ? <div className="module-loading">Loading expenses...</div> : pagedExpenses.length === 0 ? <Empty text={filtered ? 'No expenses match' : 'No expenses today'} detail={filtered ? 'Try another filter or clear the filters.' : 'Add an expense to start tracking today.'} onAdd={filtered ? clear : openCreate} /> : <div className="expense-list">{pagedExpenses.map((expense) => <article className="expense-row" key={expense.id}><span className="expense-row-icon"><ArrowDownUp size={17} /></span><div className="expense-row-main"><strong>{expense.title}</strong><span>{expense.category} · {expense.paymentMethod}{expense.subjectId ? ` · ${subjectMap.get(expense.subjectId) ?? 'Deleted subject'}` : ''}{expense.projectId ? ` · ${projectMap.get(expense.projectId) ?? 'Deleted project'}` : ''}</span>{expense.description && <small>{expense.description}</small>}</div><span className="expense-row-date">{expense.dateTimestamp?.toDate().toLocaleDateString() || expense.date}</span><strong className="expense-amount">{peso.format(expense.amount)}</strong><div className="row-actions"><button type="button" aria-label={`Edit ${expense.title}`} onClick={() => openEdit(expense)}><Pencil size={14} /></button><button type="button" aria-label={`Delete ${expense.title}`} onClick={() => setDeleteTarget(expense)}><Trash2 size={14} /></button></div></article>)}</div>}
        {pageCount > 1 && <div className="pagination" aria-label="Expense history pages"><button type="button" aria-label="Previous page" disabled={currentPage === 1} onClick={() => setPage((current) => Math.max(1, current - 1))}><ChevronLeft size={16} /></button><span>Page {currentPage} of {pageCount}</span><button type="button" aria-label="Next page" disabled={currentPage === pageCount} onClick={() => setPage((current) => current + 1)}><ChevronRight size={16} /></button></div>}
      </section>
      {formOpen && <ExpenseForm form={form} editing={Boolean(editing)} saving={saving} subjects={subjects} projects={projects} setForm={setForm} onClose={() => setFormOpen(false)} onSubmit={save} />}
      {deleteTarget && <ConfirmDelete expense={deleteTarget} deleting={deleting} onCancel={() => setDeleteTarget(null)} onConfirm={remove} />}
      {toast && <Toast message={toast.message} tone={toast.tone} onClose={() => setToast(null)} />}
    </div>
  )
}

function Summary({ label, value }: { label: string; value: number }) { return <div><span>{label}</span><strong>{peso.format(value)}</strong></div> }
function Empty({ text, detail, onAdd }: { text: string; detail: string; onAdd: () => void }) { return <section className="subjects-feedback"><div className="empty-subject-icon"><Coins size={27} /></div><h2>{text}</h2><p>{detail}</p><button className="primary-button" type="button" onClick={onAdd}>{text.includes('match') ? 'Clear filters' : 'Add expense'}</button></section> }

function ExpenseForm({ form, editing, saving, subjects, projects, setForm, onClose, onSubmit }: { form: ExpenseFormData; editing: boolean; saving: boolean; subjects: Subject[]; projects: Project[]; setForm: (value: ExpenseFormData) => void; onClose: () => void; onSubmit: (event: FormEvent) => void }) {
  const set = (key: keyof ExpenseFormData, value: string | number | null) => setForm({ ...form, [key]: value })
  return <div className="modal-layer"><button className="modal-backdrop" type="button" aria-label="Close expense form" onClick={onClose} /><form className="module-modal" onSubmit={onSubmit}><button className="modal-close-button" type="button" aria-label="Close form" onClick={onClose}><X size={18} /></button><p className="dashboard-eyebrow">{editing ? 'Update record' : 'New record'}</p><h2>{editing ? 'Edit expense' : 'Add expense'}</h2><div className="form-grid"><label>Title<input required value={form.title} onChange={(event) => set('title', event.target.value)} /></label><label>Amount<input required min="0" step="0.01" type="number" value={form.amount} onChange={(event) => set('amount', Number(event.target.value))} /></label><label>Date<input required type="date" value={form.date} onChange={(event) => set('date', event.target.value)} /></label><label>Category<select value={form.category} onChange={(event) => set('category', event.target.value)}>{expenseCategories.map((item) => <option key={item}>{item}</option>)}</select></label><label>Payment method<select value={form.paymentMethod} onChange={(event) => set('paymentMethod', event.target.value)}>{paymentMethods.map((item) => <option key={item}>{item}</option>)}</select></label><label>Subject<select value={form.subjectId ?? ''} onChange={(event) => set('subjectId', event.target.value || null)}><option value="">No subject</option>{subjects.map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}</select></label><label>Project<select value={form.projectId ?? ''} onChange={(event) => set('projectId', event.target.value || null)}><option value="">No project</option>{projects.map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}</select></label><label className="form-grid-wide">Description<textarea rows={4} value={form.description} onChange={(event) => set('description', event.target.value)} /></label></div><div className="modal-actions"><button className="secondary-button" type="button" onClick={onClose}>Cancel</button><button className="primary-button" type="submit" disabled={saving}>{saving ? 'Saving...' : editing ? 'Save changes' : 'Add expense'}</button></div></form></div>
}

function ConfirmDelete({ expense, deleting, onCancel, onConfirm }: { expense: Expense; deleting: boolean; onCancel: () => void; onConfirm: () => void }) { return <div className="modal-layer"><button className="modal-backdrop" type="button" aria-label="Close confirmation" onClick={onCancel} /><section className="module-modal module-modal--small"><button className="modal-close-button" type="button" aria-label="Close confirmation" onClick={onCancel}><X size={18} /></button><p className="dashboard-eyebrow">Remove expense</p><h2>Delete expense?</h2><p><strong>{expense.title}</strong> will be permanently removed.</p><div className="modal-actions"><button className="secondary-button" type="button" onClick={onCancel}>Cancel</button><button className="danger-button" type="button" disabled={deleting} onClick={onConfirm}>{deleting ? 'Deleting...' : 'Delete'}</button></div></section></div> }
