const button = document.querySelector('[data-theme-toggle]');
const root = document.documentElement;
const preferenceKey = 'dyson-air-studio-theme';

function applyTheme(theme) {
  root.dataset.theme = theme;
  button.dataset.scheme = theme;
  button.setAttribute('aria-label', theme === 'dark' ? 'Activar modo claro' : 'Activar modo oscuro');
}

if (button) {
  let initialTheme = 'light';
  try {
    if (localStorage.getItem(preferenceKey) === 'dark') initialTheme = 'dark';
  } catch {
    // The control can still work for this page when storage is unavailable.
  }
  applyTheme(initialTheme);

  button.addEventListener('click', () => {
    const theme = root.dataset.theme === 'dark' ? 'light' : 'dark';
    applyTheme(theme);
    try {
      localStorage.setItem(preferenceKey, theme);
    } catch {
      // Keep the applied theme until the page is closed.
    }
  });
}
