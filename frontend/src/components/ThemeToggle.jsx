import { useTheme } from '../context/ThemeContext'

export default function ThemeToggle({ compact = false }) {
  const { theme, toggleTheme } = useTheme()
  const isDark = theme === 'dark'

  return (
    <button type="button" className={`theme-toggle ${compact ? 'theme-toggle-compact' : ''}`} onClick={toggleTheme} aria-label={`Switch to ${isDark ? 'light' : 'dark'} mode`} title={`Switch to ${isDark ? 'light' : 'dark'} mode`}>
      <span aria-hidden="true">{isDark ? '☼' : '☾'}</span>
      {!compact && <span>{isDark ? 'Light' : 'Dark'}</span>}
    </button>
  )
}
