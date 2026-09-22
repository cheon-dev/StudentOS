export function LoadingScreen() {
  return (
    <main className="loading-screen" aria-live="polite">
      <span className="brand-mark brand-mark--small">S</span>
      <span className="loading-spinner" aria-hidden="true" />
      <p>Preparing your workspace...</p>
    </main>
  )
}
