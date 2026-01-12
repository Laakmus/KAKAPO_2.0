/**
 * Performs a hard navigation (full page load).
 * Wrapped to keep view components testable in JSDOM.
 */
export function hardNavigate(path: string) {
  console.log('[hardNavigate] Rozpoczynam przekierowanie do:', path);
  console.log('[hardNavigate] Current location:', window.location.href);

  // Zbuduj pełny URL (nie relative path)
  const fullUrl = new URL(path, window.location.origin).href;
  console.log('[hardNavigate] Pełny URL:', fullUrl);

  // Użyj window.location.replace() - jest bardziej "agresywne" niż href
  // i usuwa current page z historii, co zapobiega pętlom przekierowań
  try {
    console.log('[hardNavigate] Wykonuję window.location.replace()');
    window.location.replace(fullUrl);
    console.log('[hardNavigate] Replace wykonane');
  } catch (error) {
    console.error('[hardNavigate] BŁĄD podczas replace:', error);
    // Fallback - spróbuj href
    console.warn('[hardNavigate] Fallback do window.location.href');
    window.location.href = fullUrl;
  }
}
