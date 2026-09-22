import { useEffect, useState, type ReactNode } from 'react'
import { ThemeContext, type ThemePreference } from './ThemeContext.ts'

const themeStorageKey = 'studentos-theme'

function getInitialPreference(): ThemePreference {
  const storedPreference = window.localStorage.getItem(themeStorageKey)

  return storedPreference === 'light' || storedPreference === 'dark' || storedPreference === 'system'
    ? storedPreference
    : 'system'
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [preference, setPreference] = useState<ThemePreference>(getInitialPreference)

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')

    function updateTheme() {
      const resolvedTheme = preference === 'system'
        ? mediaQuery.matches ? 'dark' : 'light'
        : preference

      document.documentElement.dataset.theme = resolvedTheme
      window.localStorage.setItem(themeStorageKey, preference)
    }

    updateTheme()

    if (preference === 'system') {
      mediaQuery.addEventListener('change', updateTheme)

      return () => mediaQuery.removeEventListener('change', updateTheme)
    }
  }, [preference])

  return (
    <ThemeContext.Provider value={{ preference, setPreference }}>
      {children}
    </ThemeContext.Provider>
  )
}
