import { useTheme } from './ThemeContext';

export function ThemeToggle({ className = '' }: { className?: string }) {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <button
      type="button"
      className={`icon-btn theme-toggle${className ? ` ${className}` : ''}`}
      onClick={toggleTheme}
      aria-label={isDark ? 'تفعيل الوضع النهاري' : 'تفعيل الوضع الليلي'}
      title={isDark ? 'الوضع النهاري' : 'الوضع الليلي'}
    >
      <span className="material-symbols-outlined">{isDark ? 'light_mode' : 'dark_mode'}</span>
    </button>
  );
}
