/**
 * Shared theme switcher utility.
 */
export function applyTheme(theme: string) {
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem('app_theme', theme);
}
