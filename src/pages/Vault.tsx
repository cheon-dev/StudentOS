import { useEffect, useState, type FormEvent } from 'react'
import { Copy, ExternalLink, Eye, EyeOff, KeyRound, LockKeyhole, Pencil, Plus, RefreshCw, Search, ShieldCheck, Trash2, WandSparkles, X } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useVault } from '../context/useVault.ts'
import { emptyVaultEntry, type VaultEntry, type VaultEntryPayload } from '../types/vault.ts'
import { generateSecurePassword, passwordStrength, validateMasterPassword, type PasswordGeneratorOptions } from '../utils/password.ts'

function safeWebsiteHref(value: string) {
  const trimmed = value.trim()
  if (!trimmed) return null
  const candidate = /^[a-z][a-z\d+.-]*:/i.test(trimmed) ? trimmed : `https://${trimmed}`
  try {
    const url = new URL(candidate)
    return url.protocol === 'https:' || url.protocol === 'http:' ? url.href : null
  } catch {
    return null
  }
}

function Notice({ message }: { message: string }) {
  return message ? <div className="vault-notice" role="alert">{message}</div> : null
}

function PasswordStrength({ value }: { value: string }) {
  if (!value) return <small className="vault-password-hint">Use a unique password with a mix of characters.</small>
  const strength = passwordStrength(value)
  return <small className={`vault-strength vault-strength--${strength.toLowerCase()}`}>{strength} password guidance</small>
}

export function Vault() {
  const vault = useVault()
  const [unlockPassword, setUnlockPassword] = useState('')
  const [setupPassword, setSetupPassword] = useState('')
  const [setupConfirm, setSetupConfirm] = useState('')
  const [search, setSearch] = useState('')
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<VaultEntry | null>(null)
  const [form, setForm] = useState<VaultEntryPayload>(emptyVaultEntry)
  const [formError, setFormError] = useState('')
  const [generatorOpen, setGeneratorOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<VaultEntry | null>(null)
  const [visiblePasswords, setVisiblePasswords] = useState<Record<string, boolean>>({})
  const [notice, setNotice] = useState('')

  useEffect(() => {
    if (vault.status === 'unlocked') return
    queueMicrotask(() => {
      setFormOpen(false)
      setGeneratorOpen(false)
      setDeleteTarget(null)
      setForm(emptyVaultEntry())
      setUnlockPassword('')
      setVisiblePasswords({})
    })
  }, [vault.status])

  async function submitSetup(event: FormEvent) {
    event.preventDefault()
    const validation = validateMasterPassword(setupPassword)
    if (validation) return
    if (setupPassword !== setupConfirm) return
    try {
      await vault.createVault(setupPassword)
      setSetupPassword('')
      setSetupConfirm('')
    } catch {
      // The provider exposes a friendly error without exposing crypto details.
    }
  }

  async function submitUnlock(event: FormEvent) {
    event.preventDefault()
    try {
      await vault.unlockVault(unlockPassword)
      setUnlockPassword('')
    } catch {
      setUnlockPassword('')
    }
  }

  function openCreate() {
    vault.clearError()
    setNotice('')
    setFormError('')
    setEditing(null)
    setForm(emptyVaultEntry())
    setFormOpen(true)
  }

  function openEdit(entry: VaultEntry) {
    vault.clearError()
    setNotice('')
    setFormError('')
    setEditing(entry)
    setForm({ name: entry.name, username: entry.username, password: entry.password, website: entry.website, notes: entry.notes })
    setFormOpen(true)
  }

  async function submitEntry(event: FormEvent) {
    event.preventDefault()
    if (!form.name.trim() || !form.password) {
      setFormError('Name and password are required.')
      return
    }
    setFormError('')
    try {
      if (editing) await vault.updateEntry(editing.id, form)
      else await vault.createEntry(form)
      setForm(emptyVaultEntry())
      setEditing(null)
      setFormOpen(false)
      setNotice(editing ? 'Password updated.' : 'Password added.')
    } catch {
      // The provider exposes the friendly save error.
    }
  }

  async function removeEntry() {
    if (!deleteTarget) return
    try {
      await vault.deleteEntry(deleteTarget.id)
      setDeleteTarget(null)
      setNotice('Password deleted.')
    } catch {
      // The provider exposes the friendly delete error.
    }
  }

  async function copyValue(value: string, label: string) {
    try {
      await navigator.clipboard.writeText(value)
      setNotice(`${label} copied.`)
    } catch {
      setNotice('Clipboard access is unavailable in this browser.')
    }
  }

  if (vault.status === 'loading') return <div className="vault-page"><div className="module-loading">Loading your vault...</div></div>
  if (vault.status === 'unavailable') return <div className="vault-page"><section className="vault-gate"><div className="vault-gate-icon"><KeyRound size={28} /></div><p className="dashboard-eyebrow">Password Vault</p><h1>Vault unavailable</h1><Notice message={vault.error} /><button className="primary-button" type="button" onClick={() => void vault.reloadVault()}>Try again</button></section></div>
  if (vault.status === 'setup') return <VaultSetup password={setupPassword} confirm={setupConfirm} error={vault.error} busy={vault.busy} onPassword={setSetupPassword} onConfirm={setSetupConfirm} onSubmit={submitSetup} />
  if (vault.status === 'locked') return <VaultLocked password={unlockPassword} error={vault.error} busy={vault.busy} onPassword={setUnlockPassword} onSubmit={submitUnlock} />

  const query = search.trim().toLowerCase()
  const visibleEntries = vault.entries.filter((entry) => !query || `${entry.name} ${entry.username} ${entry.website}`.toLowerCase().includes(query))

  return <div className="vault-page"><section className="vault-page-header"><div><p className="dashboard-eyebrow">Private by design</p><h1>Password Vault</h1><p>Encrypted credentials stay unreadable in Firestore and are decrypted only after unlock.</p></div><div className="vault-header-actions"><button className="secondary-button" type="button" onClick={() => setGeneratorOpen(true)}><WandSparkles size={16} /> Generator</button><button className="secondary-button" type="button" onClick={vault.lockVault}><LockKeyhole size={16} /> Lock Vault</button><button className="primary-button" type="button" onClick={openCreate}><Plus size={17} /> Add password</button></div></section><div className="vault-security-strip"><ShieldCheck size={17} /><span>Unlocked in memory only</span><small>{vault.entries.length} encrypted {vault.entries.length === 1 ? 'entry' : 'entries'}</small><Link to="/settings">Security settings</Link></div><label className="vault-search"><Search size={16} /><input type="search" value={search} placeholder="Search names, usernames, or websites" aria-label="Search vault" onChange={(event) => setSearch(event.target.value)} /></label>{vault.error && <Notice message={vault.error} />}{notice && <div className="vault-notice vault-notice--success" role="status">{notice}</div>}{vault.entries.length === 0 ? <section className="vault-empty"><div className="vault-empty-icon"><KeyRound size={26} /></div><h2>Your vault is empty</h2><p>Add your first encrypted password or generate a strong one.</p><button className="primary-button" type="button" onClick={openCreate}><Plus size={16} /> Add password</button></section> : visibleEntries.length === 0 ? <section className="vault-empty"><h2>No matching entries</h2><p>Search is performed locally after decryption.</p></section> : <div className="vault-entry-grid">{visibleEntries.map((entry) => <VaultEntryCard key={entry.id} entry={entry} visible={visiblePasswords[entry.id] === true} onToggle={() => setVisiblePasswords((current) => ({ ...current, [entry.id]: !current[entry.id] }))} onCopy={copyValue} onEdit={() => openEdit(entry)} onDelete={() => setDeleteTarget(entry)} />)}</div>}{formOpen && <VaultEntryModal entry={editing} form={form} error={formError} busy={vault.busy} onChange={setForm} onClose={() => { setFormOpen(false); setForm(emptyVaultEntry()); setEditing(null) }} onSubmit={submitEntry} onOpenGenerator={() => setGeneratorOpen(true)} />}{generatorOpen && <PasswordGeneratorModal onClose={() => setGeneratorOpen(false)} onCopy={copyValue} onUse={(password) => { setForm((current) => ({ ...current, password })); setFormOpen(true); setGeneratorOpen(false) }} />}{deleteTarget && <DeleteVaultDialog entry={deleteTarget} busy={vault.busy} onCancel={() => setDeleteTarget(null)} onConfirm={() => void removeEntry()} />}</div>
}

function VaultSetup({ password, confirm, error, busy, onPassword, onConfirm, onSubmit }: { password: string; confirm: string; error: string; busy: boolean; onPassword: (value: string) => void; onConfirm: (value: string) => void; onSubmit: (event: FormEvent) => void }) {
  const mismatch = Boolean(confirm) && password !== confirm
  const passwordError = password ? validateMasterPassword(password) : ''
  return <div className="vault-page"><section className="vault-gate vault-gate--wide"><div className="vault-gate-icon"><KeyRound size={28} /></div><p className="dashboard-eyebrow">Private by design</p><h1>Create your vault</h1><p>Your master password is never stored and cannot be recovered by StudentOS. It only derives the key used to encrypt your vault.</p><form className="vault-gate-form" onSubmit={onSubmit}><label>Master password<input type="password" autoComplete="new-password" value={password} onChange={(event) => onPassword(event.target.value)} autoFocus required /></label><PasswordStrength value={password} />{passwordError && <small className="vault-form-error">{passwordError}</small>}<label>Confirm master password<input type="password" autoComplete="new-password" value={confirm} onChange={(event) => onConfirm(event.target.value)} required /></label>{mismatch && <small className="vault-form-error">Passwords do not match.</small>}{error && <Notice message={error} />}<button className="primary-button" type="submit" disabled={busy || mismatch || Boolean(passwordError)}>{busy ? 'Creating encrypted vault...' : 'Create Vault'}</button></form><p className="vault-recovery-warning">If you forget this password, your encrypted vault cannot be recovered. Resetting deletes the existing vault.</p></section></div>
}

function VaultLocked({ password, error, busy, onPassword, onSubmit }: { password: string; error: string; busy: boolean; onPassword: (value: string) => void; onSubmit: (event: FormEvent) => void }) {
  return <div className="vault-page"><section className="vault-gate"><div className="vault-gate-icon"><LockKeyhole size={28} /></div><p className="dashboard-eyebrow">Password Vault</p><h1>Vault Locked</h1><p>Unlock to decrypt your entries locally. The key will be cleared again when you lock, log out, refresh, or time out.</p><form className="vault-gate-form" onSubmit={onSubmit}><label>Master password<input type="password" autoComplete="current-password" value={password} onChange={(event) => onPassword(event.target.value)} autoFocus required /></label>{error && <Notice message={error} />}<button className="primary-button" type="submit" disabled={busy}>{busy ? 'Unlocking...' : 'Unlock Vault'}</button></form><Link className="vault-settings-link" to="/settings">Vault security settings</Link></section></div>
}

function VaultEntryCard({ entry, visible, onToggle, onCopy, onEdit, onDelete }: { entry: VaultEntry; visible: boolean; onToggle: () => void; onCopy: (value: string, label: string) => void; onEdit: () => void; onDelete: () => void }) {
  const website = safeWebsiteHref(entry.website)
  return <article className="vault-entry-card"><div className="vault-entry-heading"><span className="vault-entry-icon"><KeyRound size={17} /></span><div><h2>{entry.name}</h2>{entry.website && (website ? <a href={website} target="_blank" rel="noopener noreferrer">{entry.website}<ExternalLink size={12} /></a> : <small className="vault-unsafe-url">Website is not a safe link</small>)}</div></div><dl><div><dt>Username</dt><dd>{entry.username || 'No username'}</dd></div><div><dt>Password</dt><dd className="vault-password-value">{visible ? entry.password : '••••••••••••'}<button type="button" aria-label={visible ? 'Hide password' : 'Show password'} onClick={onToggle}>{visible ? <EyeOff size={15} /> : <Eye size={15} />}</button></dd></div></dl><div className="vault-entry-actions"><button className="secondary-button" type="button" onClick={() => onCopy(entry.username, 'Username')} disabled={!entry.username}><Copy size={14} /> Copy username</button><button className="secondary-button" type="button" onClick={() => onCopy(entry.password, 'Password')}><Copy size={14} /> Copy password</button><button className="icon-button" type="button" aria-label="Edit password" onClick={onEdit}><Pencil size={15} /></button><button className="icon-button icon-button--danger" type="button" aria-label="Delete password" onClick={onDelete}><Trash2 size={15} /></button></div>{entry.notes && <p className="vault-entry-notes">{entry.notes}</p>}</article>
}

function VaultEntryModal({ entry, form, error, busy, onChange, onClose, onSubmit, onOpenGenerator }: { entry: VaultEntry | null; form: VaultEntryPayload; error: string; busy: boolean; onChange: (value: VaultEntryPayload) => void; onClose: () => void; onSubmit: (event: FormEvent) => void; onOpenGenerator: () => void }) {
  const set = (key: keyof VaultEntryPayload, value: string) => onChange({ ...form, [key]: value })
  return <div className="modal-layer"><button className="modal-backdrop" type="button" aria-label="Close password form" onClick={busy ? undefined : onClose} /><form className="module-modal vault-entry-modal" onSubmit={onSubmit}><button className="modal-close-button" type="button" aria-label="Close password form" onClick={onClose} disabled={busy}><X size={18} /></button><p className="dashboard-eyebrow">Encrypted entry</p><h2>{entry ? 'Edit password' : 'Add password'}</h2><label>Name<input required autoFocus value={form.name} onChange={(event) => set('name', event.target.value)} disabled={busy} placeholder="Campus Wi-Fi" /></label><div className="vault-form-grid"><label>Username / email<input value={form.username} onChange={(event) => set('username', event.target.value)} disabled={busy} autoComplete="off" /></label><label>Website<input value={form.website} onChange={(event) => set('website', event.target.value)} disabled={busy} placeholder="https://example.com" /></label></div><label>Password<div className="vault-password-input"><input required type="password" value={form.password} onChange={(event) => set('password', event.target.value)} disabled={busy} autoComplete="new-password" /><button className="secondary-button" type="button" onClick={onOpenGenerator} disabled={busy}><WandSparkles size={14} /> Generate</button></div></label><PasswordStrength value={form.password} /><label>Notes<textarea rows={4} value={form.notes} onChange={(event) => set('notes', event.target.value)} disabled={busy} /></label>{error && <Notice message={error} />}<div className="modal-actions"><button className="secondary-button" type="button" onClick={onClose} disabled={busy}>Cancel</button><button className="primary-button" type="submit" disabled={busy}>{busy ? 'Encrypting...' : entry ? 'Save changes' : 'Save password'}</button></div></form></div>
}

function PasswordGeneratorModal({ onClose, onCopy, onUse }: { onClose: () => void; onCopy: (value: string, label: string) => void; onUse: (password: string) => void }) {
  const [options, setOptions] = useState<PasswordGeneratorOptions>({ length: 18, uppercase: true, lowercase: true, numbers: true, symbols: true })
  const [password, setPassword] = useState(() => generateSecurePassword(options))
  const [error, setError] = useState('')
  function generate() { try { setPassword(generateSecurePassword(options)); setError('') } catch (reason) { setError(reason instanceof Error ? reason.message : 'Choose valid password options.') } }
  function setOption(key: keyof PasswordGeneratorOptions, value: boolean | number) { setOptions((current) => ({ ...current, [key]: value } as PasswordGeneratorOptions)) }
  return <div className="modal-layer"><button className="modal-backdrop" type="button" aria-label="Close password generator" onClick={onClose} /><section className="module-modal vault-generator-modal"><button className="modal-close-button" type="button" aria-label="Close password generator" onClick={onClose}><X size={18} /></button><p className="dashboard-eyebrow">Cryptographically random</p><h2>Password Generator</h2><div className="vault-generated-password"><code>{password}</code><button className="secondary-button" type="button" onClick={() => onCopy(password, 'Generated password')}><Copy size={14} /> Copy</button></div><div className="vault-generator-options"><label>Length<input type="number" min="4" max="128" value={options.length} onChange={(event) => setOption('length', Math.max(4, Math.min(128, Number(event.target.value))))} /></label>{(['uppercase', 'lowercase', 'numbers', 'symbols'] as const).map((key) => <label className="vault-check" key={key}><input type="checkbox" checked={options[key]} onChange={(event) => setOption(key, event.target.checked)} /><span>{key === 'uppercase' ? 'Uppercase' : key === 'lowercase' ? 'Lowercase' : key === 'numbers' ? 'Numbers' : 'Symbols'}</span></label>)}</div><PasswordStrength value={password} />{error && <Notice message={error} />}<div className="modal-actions"><button className="secondary-button" type="button" onClick={generate}><RefreshCw size={14} /> Regenerate</button><button className="primary-button" type="button" onClick={() => onUse(password)}>Use Password</button></div></section></div>
}

function DeleteVaultDialog({ entry, busy, onCancel, onConfirm }: { entry: VaultEntry; busy: boolean; onCancel: () => void; onConfirm: () => void }) {
  return <div className="modal-layer"><button className="modal-backdrop" type="button" aria-label="Close delete confirmation" onClick={onCancel} /><section className="delete-dialog" role="dialog" aria-modal="true" aria-labelledby="delete-vault-title"><div className="delete-dialog-icon"><Trash2 size={23} /></div><p className="dashboard-eyebrow">Remove password</p><h2 id="delete-vault-title">Delete this password?</h2><p><strong>{entry.name}</strong> will be permanently removed from the encrypted vault.</p><div className="delete-dialog-actions"><button className="secondary-button" type="button" onClick={onCancel} disabled={busy}>Cancel</button><button className="danger-button" type="button" onClick={onConfirm} disabled={busy}>{busy ? 'Deleting...' : 'Delete'}</button></div></section></div>
}
