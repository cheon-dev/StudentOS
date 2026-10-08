import { useState, type FormEvent } from 'react'
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth'
import { Link, useNavigate } from 'react-router-dom'
import { AuthLayout } from '../components/AuthLayout.tsx'
import { PasswordField } from '../components/PasswordField.tsx'
import { auth, authPersistenceReady } from '../firebase/config.ts'
import { syncUserDocument } from '../firebase/users.ts'
import { getFirebaseErrorMessage } from '../utils/firebaseError.ts'
import { isValidEmail } from '../utils/validation.ts'

export function Register() {
  const navigate = useNavigate()
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')

    if (!fullName.trim() || !email.trim() || !password || !confirmPassword) {
      setError('Complete all fields to create your account.')
      return
    }

    if (!isValidEmail(email.trim())) {
      setError('Enter a valid email address.')
      return
    }

    if (password.length < 6) {
      setError('Your password must be at least 6 characters.')
      return
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }

    setIsSubmitting(true)

    try {
      await authPersistenceReady
      const credentials = await createUserWithEmailAndPassword(
        auth,
        email.trim(),
        password,
      )
      await updateProfile(credentials.user, { displayName: fullName.trim() })
      await syncUserDocument(credentials.user, 'password', fullName)
      navigate('/dashboard', { replace: true })
    } catch (registrationError) {
      setError(
        getFirebaseErrorMessage(
          registrationError,
          'We could not create your account. Please try again.',
        ),
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <AuthLayout
      eyebrow="Get started"
      title="Create your space"
      description="Set up your StudentOS account and make this semester feel lighter."
      footer={
        <p>
          Already have an account? <Link to="/login">Sign in</Link>
        </p>
      }
    >
      <form className="auth-form" onSubmit={handleSubmit} noValidate>
        {error && <div className="form-alert form-alert--error" role="alert">{error}</div>}
        <label htmlFor="fullName">
          Full name
          <input
            id="fullName"
            type="text"
            autoComplete="name"
            placeholder="Alex Johnson"
            value={fullName}
            onChange={(event) => setFullName(event.target.value)}
            disabled={isSubmitting}
            required
          />
        </label>
        <label htmlFor="registerEmail">
          Email address
          <input
            id="registerEmail"
            type="email"
            autoComplete="email"
            placeholder="you@university.edu"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            disabled={isSubmitting}
            required
          />
        </label>
        <div className="form-grid">
          <label htmlFor="registerPassword">
            Password
            <PasswordField
              id="registerPassword"
              autoComplete="new-password"
              placeholder="6+ characters"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              disabled={isSubmitting}
              minLength={6}
              required
            />
          </label>
          <label htmlFor="confirmPassword">
            Confirm password
            <PasswordField
              id="confirmPassword"
              autoComplete="new-password"
              placeholder="Repeat password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              disabled={isSubmitting}
              minLength={6}
              required
            />
          </label>
        </div>
        <button className="button button--primary" type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Creating account...' : 'Create account'}
          {!isSubmitting && <span aria-hidden="true">→</span>}
        </button>
      </form>
    </AuthLayout>
  )
}
