import { useEffect, useState, type FormEvent } from 'react'
import { deleteUser, EmailAuthProvider, GoogleAuthProvider, reauthenticateWithCredential, reauthenticateWithPopup, signOut, updatePassword } from 'firebase/auth'
import { AlertTriangle, Bell, Check, KeyRound, LockKeyhole, LogOut, Palette, ShieldCheck, Trash2, UserRound } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/useAuth.ts'
import { useTheme } from '../context/useTheme.ts'
import { useVault } from '../context/useVault.ts'
import { auth } from '../firebase/config.ts'
import { deleteUserFirestoreData } from '../services/accountService.ts'
import { clearUserFiles } from '../services/fileService.ts'
import { getNotificationPreferences, saveNotificationPreferences } from '../services/notificationService.ts'
import { getNotificationAccess, requestNotificationAccess, type NotificationAccessState } from '../services/nativeNotificationService.ts'
import { removeProfileImage } from '../services/profileImageService.ts'
import { autoLockDurations, type AutoLockDuration } from '../types/vault.ts'
import type { NotificationPreferences } from '../types/notification.ts'
import { getFirebaseErrorMessage } from '../utils/firebaseError.ts'
import { validateMasterPassword } from '../utils/password.ts'

const googleProvider = new GoogleAuthProvider()
const deleteConfirmationText = 'DELETE MY ACCOUNT'

export function Settings() {
  const { user } = useAuth()
  const { preference, setPreference } = useTheme()
  const vault = useVault()
  const navigate = useNavigate()
  const passwordUser = Boolean(user?.providerData.some((provider) => provider.providerId === 'password'))
  const [notificationPreferences, setNotificationPreferences] = useState<NotificationPreferences | null>(null)
  const [notificationAccess, setNotificationAccess] = useState<NotificationAccessState>('unsupported')
  const [requestingNotificationAccess, setRequestingNotificationAccess] = useState(false)
  const [notificationError, setNotificationError] = useState('')
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [accountCurrentPassword, setAccountCurrentPassword] = useState('')
  const [accountNewPassword, setAccountNewPassword] = useState('')
  const [accountConfirmPassword, setAccountConfirmPassword] = useState('')
  const [changeError, setChangeError] = useState('')
  const [changeNotice, setChangeNotice] = useState('')
  const [changingPassword, setChangingPassword] = useState(false)
  const [resetOpen, setResetOpen] = useState(false)
  const [resetConfirmation, setResetConfirmation] = useState('')
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleteConfirmation, setDeleteConfirmation] = useState('')
  const [deletePassword, setDeletePassword] = useState('')
  const [deleteError, setDeleteError] = useState('')
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    if (!user) return
    void getNotificationPreferences(user.uid).then(setNotificationPreferences).catch(() => setNotificationError('Notification preferences could not be loaded.'))
    void getNotificationAccess().then(setNotificationAccess).catch(() => setNotificationAccess('denied'))
  }, [user])

  useEffect(() => {
    if (vault.status === 'unlocked') return
    queueMicrotask(() => {
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
    })
  }, [vault.status])

  async function changeMasterPassword(event: FormEvent) {
    event.preventDefault()
    setChangeError('')
    setChangeNotice('')
    const validation = validateMasterPassword(newPassword)
    if (validation) { setChangeError(validation); return }
    if (newPassword !== confirmPassword) { setChangeError('New passwords do not match.'); return }
    try {
      const cleanupPending = await vault.changeMasterPassword(currentPassword, newPassword)
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
      setChangeNotice(cleanupPending ? 'Master password changed. Old encrypted records are pending cleanup.' : 'Master password changed successfully.')
    } catch {
      // The vault provider exposes a friendly error.
    }
  }

  async function changeAccountPassword(event: FormEvent) {
    event.preventDefault()
    if (!user?.email) return
    setChangeError('')
    setChangeNotice('')
    if (accountNewPassword.length < 6) { setChangeError('Use at least 6 characters for your new password.'); return }
    if (accountNewPassword !== accountConfirmPassword) { setChangeError('New passwords do not match.'); return }
    setChangingPassword(true)
    try {
      await reauthenticateWithCredential(user, EmailAuthProvider.credential(user.email, accountCurrentPassword))
      await updatePassword(user, accountNewPassword)
      setAccountCurrentPassword('')
      setAccountNewPassword('')
      setAccountConfirmPassword('')
      setChangeNotice('Account password changed successfully.')
    } catch (reason) {
      setChangeError(getFirebaseErrorMessage(reason, 'Your account password could not be changed.'))
    } finally {
      setChangingPassword(false)
    }
  }

  async function updateNotificationPreference(key: keyof NotificationPreferences, value: boolean) {
    if (!user || !notificationPreferences) return
    const next = { ...notificationPreferences, [key]: value }
    setNotificationPreferences(next)
    setNotificationError('')
    try {
      await saveNotificationPreferences(user.uid, next)
    } catch (reason) {
      setNotificationError(getFirebaseErrorMessage(reason, 'Notification preferences could not be saved.'))
    }
  }

  async function enablePhoneNotifications() {
    setRequestingNotificationAccess(true)
    try {
      setNotificationAccess(await requestNotificationAccess())
    } catch (reason) {
      setNotificationError(getFirebaseErrorMessage(reason, 'Phone notifications could not be enabled.'))
    } finally {
      setRequestingNotificationAccess(false)
    }
  }

  async function resetVault() {
    if (resetConfirmation !== 'RESET VAULT') return
    try {
      await vault.resetVault()
      setResetOpen(false)
      setResetConfirmation('')
    } catch {
      // The vault provider exposes a friendly error.
    }
  }

  async function handleDeleteAccount(event: FormEvent) {
    event.preventDefault()
    if (!user || deleteConfirmation !== deleteConfirmationText) return
    setDeleteError('')
    setDeleting(true)
    try {
      if (passwordUser) {
        if (!user.email || !deletePassword) { setDeleteError('Enter your current password to confirm deletion.'); return }
        await reauthenticateWithCredential(user, EmailAuthProvider.credential(user.email, deletePassword))
      } else {
        await reauthenticateWithPopup(user, googleProvider)
      }
      await deleteUserFirestoreData(user.uid)
      await clearUserFiles(user.uid)
      await removeProfileImage(user.uid)
      await deleteUser(user)
      navigate('/login', { replace: true })
    } catch (reason) {
      setDeleteError(getFirebaseErrorMessage(reason, 'The account could not be deleted. No further action was taken.'))
    } finally {
      setDeleting(false)
    }
  }

  async function handleLogout() {
    await signOut(auth)
    navigate('/login', { replace: true })
  }

  return <div className="settings-page">
    <section className="module-page-header"><div><p className="dashboard-eyebrow">Make StudentOS yours</p><h1>Settings</h1><p>Control appearance, notifications, security, and your account.</p></div></section>
    {vault.error && <div className="vault-notice" role="alert">{vault.error}</div>}

    <section className="settings-card">
      <div className="settings-card-heading"><span className="settings-card-icon"><Palette size={19} /></span><div><h2>Appearance</h2><p>Choose how StudentOS looks on this device.</p></div></div>
      <div className="settings-theme-options" role="radiogroup" aria-label="Theme preference">{(['light', 'dark', 'system'] as const).map((option) => <button key={option} className={preference === option ? 'settings-theme-option settings-theme-option--active' : 'settings-theme-option'} type="button" role="radio" aria-checked={preference === option} onClick={() => setPreference(option)}><span>{option === 'light' ? 'Light' : option === 'dark' ? 'Dark' : 'System'}</span>{preference === option && <Check size={15} />}</button>)}</div>
    </section>

    <section className="settings-card">
      <div className="settings-card-heading"><span className="settings-card-icon"><Bell size={19} /></span><div><h2>Notifications</h2><p>Choose which workspace reminders StudentOS creates for you.</p></div></div>
      {notificationError && <div className="profile-notice profile-notice--error" role="alert">{notificationError}</div>}
      <div className="settings-row notification-access-row"><div><strong>Phone notifications</strong><small>{notificationAccess === 'granted' ? 'StudentOS can alert you about upcoming deadlines.' : notificationAccess === 'unsupported' ? 'Install the Android app to enable phone notifications.' : notificationAccess === 'denied' ? 'Notifications are blocked. Allow them in Android system settings.' : 'Allow StudentOS to notify you about upcoming deadlines.'}</small></div>{notificationAccess === 'granted' ? <span className="notification-access-status">Enabled</span> : notificationAccess === 'unsupported' ? <span className="notification-access-status">Android only</span> : <button className="secondary-button" type="button" onClick={() => void enablePhoneNotifications()} disabled={requestingNotificationAccess}>{requestingNotificationAccess ? 'Requesting...' : 'Allow notifications'}</button>}</div>
      {notificationPreferences && <div className="settings-preference-list">{([['taskReminders', 'Task reminders', 'Upcoming and due task notifications.'], ['overdueAlerts', 'Overdue alerts', 'Alerts for incomplete tasks past their due date.'], ['calendarReminders', 'Calendar reminders', 'Reminders for events starting soon.'], ['projectReminders', 'Project reminders', 'Alerts for projects approaching their deadline.']] as const).map(([key, title, description]) => <label className="settings-preference-row" key={key}><span><strong>{title}</strong><small>{description}</small></span><input type="checkbox" checked={notificationPreferences[key]} onChange={(event) => void updateNotificationPreference(key, event.target.checked)} /></label>)}</div>}
    </section>

    <section className="settings-card">
      <div className="settings-card-heading"><span className="settings-card-icon"><ShieldCheck size={19} /></span><div><h2>Vault security</h2><p>The vault master password is never stored, and the derived key is cleared when the vault locks.</p></div></div>
      <div className="settings-row"><div><strong>Auto-lock duration</strong><small>Activity resets the timer while the vault is unlocked.</small></div><select value={vault.autoLockDuration} onChange={(event) => vault.setAutoLockDuration(event.target.value === 'never' ? 'never' : Number(event.target.value) as AutoLockDuration)}>{autoLockDurations.map((option) => <option value={option.value} key={option.label}>{option.label}</option>)}</select></div>
      <div className="settings-row"><div><strong>Vault state</strong><small>{vault.status === 'unlocked' ? 'Unlocked in memory for this session.' : vault.status === 'setup' ? 'No vault has been created yet.' : 'Locked. Decrypted entries are not rendered.'}</small></div>{vault.status === 'unlocked' ? <button className="secondary-button" type="button" onClick={vault.lockVault}><LockKeyhole size={15} /> Lock Vault</button> : <Link className="secondary-button" to="/vault"><KeyRound size={15} /> Open Vault</Link>}</div>
    </section>

    {vault.config && <section className="settings-card"><div className="settings-card-heading"><span className="settings-card-icon"><KeyRound size={19} /></span><div><h2>Change vault master password</h2><p>Entries are decrypted locally and re-encrypted with a new key.</p></div></div><form className="settings-form" onSubmit={changeMasterPassword}><label>Current master password<input type="password" autoComplete="current-password" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} required /></label><label>New master password<input type="password" autoComplete="new-password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} required /></label><label>Confirm new master password<input type="password" autoComplete="new-password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} required /></label>{changeError && <p className="form-alert form-alert--error" role="alert">{changeError}</p>}{changeNotice && <p className="form-alert form-alert--success" role="status">{changeNotice}</p>}<button className="primary-button" type="submit" disabled={vault.busy}><KeyRound size={15} /> {vault.busy ? 'Changing...' : 'Change master password'}</button></form></section>}

    <section className="settings-card">
      <div className="settings-card-heading"><span className="settings-card-icon"><UserRound size={19} /></span><div><h2>Account</h2><p>Manage your profile, authentication, and session.</p></div></div>
      <div className="settings-row"><div><strong>Profile</strong><small>Update your display name and academic details.</small></div><Link className="secondary-button" to="/profile">Open profile</Link></div>
      {passwordUser ? <form className="settings-form account-password-form" onSubmit={changeAccountPassword}><h3>Change account password</h3><label>Current password<input type="password" autoComplete="current-password" value={accountCurrentPassword} onChange={(event) => setAccountCurrentPassword(event.target.value)} required /></label><label>New password<input type="password" autoComplete="new-password" value={accountNewPassword} onChange={(event) => setAccountNewPassword(event.target.value)} minLength={6} required /></label><label>Confirm new password<input type="password" autoComplete="new-password" value={accountConfirmPassword} onChange={(event) => setAccountConfirmPassword(event.target.value)} minLength={6} required /></label>{changeError && <p className="form-alert form-alert--error" role="alert">{changeError}</p>}{changeNotice && <p className="form-alert form-alert--success" role="status">{changeNotice}</p>}<button className="secondary-button" type="submit" disabled={changingPassword}>{changingPassword ? 'Changing...' : 'Change account password'}</button></form> : <div className="settings-card--muted account-provider-note"><strong>Password managed by Google</strong><span>This account uses Google sign-in, so StudentOS does not show a password form.</span></div>}
      <div className="settings-row"><div><strong>Session</strong><small>Sign out of StudentOS on this device.</small></div><button className="secondary-button" type="button" onClick={() => void handleLogout()}><LogOut size={15} /> Log out</button></div>
    </section>

    <section className="settings-card settings-card--danger"><div className="settings-card-heading"><span className="settings-card-icon"><Trash2 size={19} /></span><div><h2>Delete account</h2><p>This permanently deletes your account, StudentOS Firestore data, vault records, and device-local files and profile photo.</p></div></div>{!deleteOpen ? <button className="danger-button" type="button" onClick={() => { setDeleteOpen(true); setDeleteError('') }}><Trash2 size={15} /> Delete account</button> : <form className="reset-confirmation" onSubmit={handleDeleteAccount}><div className="danger-warning"><AlertTriangle size={17} /><span>This cannot be undone. Existing tasks, notes, projects, reviewer questions, vault data, and notifications will be permanently deleted.</span></div><label>Type {deleteConfirmationText} to continue<input value={deleteConfirmation} onChange={(event) => setDeleteConfirmation(event.target.value)} autoComplete="off" /></label>{passwordUser && <label>Current password<input type="password" value={deletePassword} onChange={(event) => setDeletePassword(event.target.value)} autoComplete="current-password" /></label>}{deleteError && <p className="form-alert form-alert--error" role="alert">{deleteError}</p>}<div className="modal-actions"><button className="secondary-button" type="button" onClick={() => { setDeleteOpen(false); setDeleteConfirmation(''); setDeletePassword('') }}>Cancel</button><button className="danger-button" type="submit" disabled={deleting || deleteConfirmation !== deleteConfirmationText}>{deleting ? 'Deleting...' : 'Permanently delete account'}</button></div></form>}</section>

    {vault.config && <section className="settings-card settings-card--danger"><div className="settings-card-heading"><span className="settings-card-icon"><AlertTriangle size={19} /></span><div><h2>Reset vault</h2><p>Delete all encrypted vault entries and start the vault setup again. This does not delete your StudentOS account.</p></div></div>{!resetOpen ? <button className="danger-button" type="button" onClick={() => setResetOpen(true)}><AlertTriangle size={15} /> Reset vault</button> : <div className="reset-confirmation"><label>Type RESET VAULT to continue<input value={resetConfirmation} onChange={(event) => setResetConfirmation(event.target.value)} /></label><div className="modal-actions"><button className="secondary-button" type="button" onClick={() => { setResetOpen(false); setResetConfirmation('') }}>Cancel</button><button className="danger-button" type="button" disabled={resetConfirmation !== 'RESET VAULT'} onClick={() => void resetVault()}>Reset encrypted vault</button></div></div>}</section>}
  </div>
}
