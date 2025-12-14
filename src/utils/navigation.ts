/**
 * Performs a hard navigation (full page load).
 * Wrapped to keep view components testable in JSDOM.
 */
export function hardNavigate(path: string) {
  window.location.assign(path);
}
