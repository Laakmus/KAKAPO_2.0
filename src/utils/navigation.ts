/**
 * Performs a hard navigation (full page load).
 * Wrapped to keep view components testable in JSDOM.
 */
export function hardNavigate(path: string) {
  console.warn('[hardNavigate] Rozpoczynam przekierowanie do:', path);
  console.warn('[hardNavigate] Current location:', window.location.href);

  // Zbuduj pełny URL (nie relative path)
  const currentHref = window.location.href;
  const url = new URL(path, window.location.origin);

  // Security guard: never navigate cross-origin from this helper
  if (url.origin !== window.location.origin) {
    console.warn('[hardNavigate] Zablokowano przekierowanie na inny origin:', url.href);
    return;
  }

  const fullUrl = url.href;
  console.warn('[hardNavigate] Pełny URL:', fullUrl);

  // Avoid no-op navigations (can leave UI stuck in "redirecting" state)
  if (fullUrl === currentHref) {
    console.warn('[hardNavigate] Docelowy URL jest identyczny jak bieżący — pomijam nawigację');
    return;
  }

  // CRITICAL: Wywołaj nawigację poza React callstack (setTimeout), żeby uniknąć blokowania przez React batching/hydration
  // React Strict Mode + Astro Islands mogą blokować synchroniczną nawigację podczas render/commit phase
  console.warn('[hardNavigate] Planuję nawigację asynchronicznie (setTimeout 0)');

  setTimeout(() => {
    try {
      console.warn('[hardNavigate] Wykonuję window.location.replace()');
      window.location.replace(fullUrl);
      console.warn('[hardNavigate] Replace wywołane');

      // Watchdog: if replace() doesn't work, force href after short delay
      setTimeout(() => {
        if (window.location.href === currentHref) {
          console.warn('[hardNavigate] Replace nie zadziałało — wymuszam window.location.href');
          window.location.href = fullUrl;
        }
      }, 100);
    } catch (error) {
      console.error('[hardNavigate] BŁĄD podczas replace:', error);
      // Fallback - spróbuj href
      console.warn('[hardNavigate] Fallback do window.location.href');
      window.location.href = fullUrl;
    }
  }, 0);
}
