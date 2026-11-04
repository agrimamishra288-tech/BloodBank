import { createContext, useContext, useEffect, useState } from 'react'

const ThemeContext = createContext(null)

function initialTheme() {
  try {
    const saved = localStorage.getItem('hemora-theme')
    if (saved === 'dark' || saved === 'light') return saved
  } catch { /* Storage may be unavailable in private browsing. */ }
  return 'light'
}

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(initialTheme)

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    document.documentElement.style.colorScheme = theme
    try { localStorage.setItem('hemora-theme', theme) } catch { /* Keep the current session usable. */ }
  }, [theme])

  const toggleTheme = () => setTheme((current) => current === 'light' ? 'dark' : 'light')

  return <ThemeContext.Provider value={{ theme, toggleTheme }}>{children}</ThemeContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useTheme() {
  const context = useContext(ThemeContext)
  if (!context) throw new Error('useTheme must be used inside ThemeProvider')
  return context
}
