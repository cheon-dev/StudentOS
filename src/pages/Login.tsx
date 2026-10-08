import { useState, type FormEvent } from 'react'
import { Capacitor } from '@capacitor/core'
import { FirebaseAuthentication } from '@capacitor-firebase/authentication'
import {
  GoogleAuthProvider,
  sendPasswordResetEmail,
  signInWithCredential,
  signInWithEmailAndPassword,
  signInWithPopup,
} from 'firebase/auth'
import { Link, useNavigate } from 'react-router-dom'
import { AuthLayout } from '../components/AuthLayout.tsx'
import { PasswordField } from '../components/PasswordField.tsx'
import { auth, authPersistenceReady } from '../firebase/config.ts'
import { syncUserDocument } from '../firebase/users.ts'
import { getFirebaseErrorMessage } from '../utils/firebaseError.ts'
import { isValidEmail } from '../utils/validation.ts'

const googleProvider = new GoogleAuthProvider()

export function Login() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleEmailLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setMessage('')

    if (!email.trim() || !password) {
      setError('Enter your email and password to continue.')
      return
    }

    if (!isValidEmail(email.trim())) {
      setError('Enter a valid email address.')
      return
    }

    setIsSubmitting(true)

    try {
      await authPersistenceReady
      const credentials = await signInWithEmailAndPassword(auth, email.trim(), password)
      await syncUserDocument(credentials.user, 'password')
      navigate('/dashboard', { replace: true })
    } catch (loginError) {
      setError(getFirebaseErrorMessage(loginError, 'We could not sign you in. Please try again.'))
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleGoogleLogin() {
    setError('')
    setMessage('')
    setIsSubmitting(true)

    try {
      await authPersistenceReady
      const credentials = Capacitor.isNativePlatform()
        ? await signInWithNativeGoogle()
        : await signInWithPopup(auth, googleProvider)
      await syncUserDocument(credentials.user, 'google')
      navigate('/dashboard', { replace: true })
    } catch (loginError) {
      setError(getFirebaseErrorMessage(loginError, 'Google sign-in did not complete.'))
    } finally {
      setIsSubmitting(false)
    }
  }

  async function signInWithNativeGoogle() {
    const result = await FirebaseAuthentication.signInWithGoogle({ skipNativeAuth: true })
    const idToken = result.credential?.idToken
    if (!idToken) throw new Error('google-credential-missing')
    return signInWithCredential(auth, GoogleAuthProvider.credential(idToken))
  }

  async function handlePasswordReset() {
    setError('')
    setMessage('')

    if (!email.trim()) {
      setError('Enter your email address first, then request a reset link.')
      return
    }

    if (!isValidEmail(email.trim())) {
      setError('Enter a valid email address.')
      return
    }

    setIsSubmitting(true)

    try {
      await sendPasswordResetEmail(auth, email.trim())
      setMessage('Password reset instructions are on their way to your inbox.')
    } catch (resetError) {
      setError(getFirebaseErrorMessage(resetError, 'We could not send a reset email.'))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <AuthLayout
      eyebrow="Welcome back"
      title="Pick up where you left off"
      description="Sign in to keep your plans, priorities, and progress moving forward."
      footer={
        <p>
          New to StudentOS? <Link to="/register">Create an account</Link>
        </p>
      }
    >
      <form className="auth-form" onSubmit={handleEmailLogin} noValidate>
        {error && <div className="form-alert form-alert--error" role="alert">{error}</div>}
        {message && <div className="form-alert form-alert--success" role="status">{message}</div>}
        <label htmlFor="loginEmail">
          Email address
          <input
            id="loginEmail"
            type="email"
            autoComplete="email"
            placeholder="you@university.edu"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            disabled={isSubmitting}
            required
          />
        </label>
        <label htmlFor="loginPassword">
          <span className="label-row">
            Password
            <button className="text-button" type="button" onClick={handlePasswordReset} disabled={isSubmitting}>
              Forgot password?
            </button>
          </span>
          <PasswordField
            id="loginPassword"
            autoComplete="current-password"
            placeholder="Enter your password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            disabled={isSubmitting}
            required
          />
        </label>
        <button className="button button--primary" type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Signing in...' : 'Sign in'}
          {!isSubmitting && <span aria-hidden="true">→</span>}
        </button>
      </form>
      <div className="divider"><span>or continue with</span></div>
      <button className="button button--google" type="button" onClick={handleGoogleLogin} disabled={isSubmitting}>
        <span className="google-icon" aria-hidden="true">G</span>
        Continue with Google
      </button>
    </AuthLayout>
  )
}
