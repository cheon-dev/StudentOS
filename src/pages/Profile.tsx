import { useRef, useState, type ChangeEvent, type FormEvent } from 'react'
import { Camera, ImageOff, Save, UserRound } from 'lucide-react'
import { updateProfile } from 'firebase/auth'
import { useAuth } from '../context/useAuth.ts'
import { saveUserProfile } from '../firebase/users.ts'
import { getFirebaseErrorMessage } from '../utils/firebaseError.ts'
import { getUserInitials } from '../utils/user.ts'
import { removeProfileImage, saveProfileImage } from '../services/profileImageService.ts'
import type { UserProfile, UserProfileInput } from '../types/userProfile.ts'

const emptyProfile: UserProfileInput = { displayName: '', studentId: '', school: '', course: '', yearLevel: '', section: '', bio: '' }

export function Profile() {
  const { user, profile, profileLoading, avatarUrl, refreshProfile } = useAuth()
  const profileKey = profile ? `${profile.updatedAt?.toMillis() ?? 'saved'}-${profile.displayName}` : 'loading'

  return <div className="profile-page">
    <section className="module-page-header"><div><p className="dashboard-eyebrow">Your academic identity</p><h1>Profile</h1><p>Keep the details that shape your StudentOS workspace up to date.</p></div></section>
    {user && <ProfileEditor key={profileKey} user={user} profile={profile} profileLoading={profileLoading} avatarUrl={avatarUrl} refreshProfile={refreshProfile} />}
  </div>
}

function ProfileEditor({ user, profile, profileLoading, avatarUrl, refreshProfile }: { user: NonNullable<ReturnType<typeof useAuth>['user']>; profile: UserProfile | null; profileLoading: boolean; avatarUrl: string | null; refreshProfile: () => Promise<void> }) {
  const [form, setForm] = useState<UserProfileInput>(() => profile ? { displayName: profile.displayName, studentId: profile.studentId, school: profile.school, course: profile.course, yearLevel: profile.yearLevel, section: profile.section, bio: profile.bio } : emptyProfile)
  const [notice, setNotice] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  function updateField(field: keyof UserProfileInput, value: string) {
    setForm((current) => ({ ...current, [field]: value }))
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setNotice('')
    if (!form.displayName.trim()) { setError('Enter a display name.'); return }
    setSaving(true)
    try {
      await updateProfile(user, { displayName: form.displayName.trim() })
      await saveUserProfile(user.uid, form)
      await refreshProfile()
      setNotice('Profile saved.')
    } catch (reason) {
      setError(getFirebaseErrorMessage(reason, 'Your profile could not be saved.'))
    } finally {
      setSaving(false)
    }
  }

  async function handlePhotoChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return
    setError('')
    setNotice('')
    try {
      await saveProfileImage(user.uid, file)
      await refreshProfile()
      setNotice('Profile photo updated on this device.')
    } catch (reason) {
      setError(getFirebaseErrorMessage(reason, 'The profile photo could not be saved.'))
    } finally {
      event.target.value = ''
    }
  }

  async function handleRemovePhoto() {
    setError('')
    setNotice('')
    try {
      await removeProfileImage(user.uid)
      await refreshProfile()
      setNotice('Custom profile photo removed. Firebase or Google photo will be used if available.')
    } catch (reason) {
      setError(getFirebaseErrorMessage(reason, 'The profile photo could not be removed.'))
    }
  }

  const photoSource = avatarUrl || user.photoURL
  const initials = getUserInitials(form.displayName || user.displayName, user.email)

  return <>
    {(error || notice) && <div className={error ? 'profile-notice profile-notice--error' : 'profile-notice'} role={error ? 'alert' : 'status'}>{error || notice}</div>}
    <form className="profile-layout" onSubmit={handleSubmit}>
      <section className="profile-card profile-card--identity">
        <div className="profile-card-heading"><span className="settings-card-icon"><UserRound size={19} /></span><div><h2>Profile photo</h2><p>Your custom photo is stored only in this browser and is not uploaded to Firebase Storage.</p></div></div>
        <div className="profile-photo-area">
          {photoSource ? <img className="profile-avatar-large" src={photoSource} alt="" /> : <span className="profile-avatar-large profile-avatar-large--fallback">{initials}</span>}
          <div><strong>{form.displayName || 'Student'}</strong><small>{user.email}</small><div className="profile-photo-actions"><button className="secondary-button" type="button" onClick={() => fileInputRef.current?.click()}><Camera size={15} /> {photoSource ? 'Change photo' : 'Upload photo'}</button>{avatarUrl && <button className="text-button profile-remove-photo" type="button" onClick={() => void handleRemovePhoto()}><ImageOff size={14} /> Remove</button>}</div></div>
        </div>
        <input ref={fileInputRef} className="visually-hidden" type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => void handlePhotoChange(event)} />
        <p className="profile-help">JPG, PNG, or WebP. Maximum 5 MB. Device-local only.</p>
      </section>
      <section className="profile-card">
        <div className="profile-card-heading"><span className="settings-card-icon"><UserRound size={19} /></span><div><h2>Profile details</h2><p>Email is provided by Firebase Authentication and cannot be edited here.</p></div></div>
        {profileLoading && <p className="profile-help">Loading your saved profile...</p>}
        <div className="profile-form-grid">
          <label>Display name<input value={form.displayName} onChange={(event) => updateField('displayName', event.target.value)} maxLength={80} required /></label>
          <label>Email<input value={user.email ?? ''} readOnly disabled /></label>
          <label>Student ID <span className="profile-optional">Optional</span><input value={form.studentId} onChange={(event) => updateField('studentId', event.target.value)} maxLength={80} /></label>
          <label>School / University<input value={form.school} onChange={(event) => updateField('school', event.target.value)} maxLength={120} /></label>
          <label>Course / Program<input value={form.course} onChange={(event) => updateField('course', event.target.value)} maxLength={120} /></label>
          <label>Year level<input value={form.yearLevel} onChange={(event) => updateField('yearLevel', event.target.value)} maxLength={40} /></label>
          <label>Section<input value={form.section} onChange={(event) => updateField('section', event.target.value)} maxLength={80} /></label>
          <label className="profile-form-wide">Bio <span className="profile-optional">Optional</span><textarea value={form.bio} onChange={(event) => updateField('bio', event.target.value)} rows={5} maxLength={500} /></label>
        </div>
        <div className="profile-form-actions"><span>{form.bio.length}/500</span><button className="primary-button" type="submit" disabled={saving || profileLoading}><Save size={16} /> {saving ? 'Saving...' : 'Save profile'}</button></div>
      </section>
    </form>
  </>
}
