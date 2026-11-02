// Run before styles load so the saved theme is applied before the first paint.
(() => {
  const key = 'atelier-theme-v1';
  const choices = ['system', 'light', 'dark'];
  const media = typeof window.matchMedia === 'function' ? window.matchMedia('(prefers-color-scheme: dark)') : null;
  let preference = 'system';
  try {
    const stored = localStorage.getItem(key);
    if (choices.includes(stored)) preference = stored;
  } catch { /* System detection still works when storage is unavailable. */ }
  function apply() {
    const dark = preference === 'dark' || (preference === 'system' && !!media?.matches);
    document.documentElement.dataset.theme = dark ? 'dark' : 'light';
    document.documentElement.style.colorScheme = dark ? 'dark' : 'light';
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', dark ? '#171e19' : '#f7f8f2');
    window.dispatchEvent(new Event('atelier-theme-change'));
  }
  window.atelierTheme = {
    get preference() { return preference; },
    get detectsSystem() { return !!media; },
    setPreference(value) {
      if (!choices.includes(value)) return false;
      preference = value;
      apply();
      try { localStorage.setItem(key, value); return true; }
      catch { return false; }
    }
  };
  if (media?.addEventListener) media.addEventListener('change', apply);
  else if (media?.addListener) media.addListener(apply);
  window.addEventListener('storage', event => {
    if (event.key === key || event.key === null) {
      preference = choices.includes(event.newValue) ? event.newValue : 'system';
      apply();
    }
  });
  apply();
})();
