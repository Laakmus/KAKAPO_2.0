/**
 * Performs a hard navigation (full page load).
 * Wrapped to keep view components testable in JSDOM.
 *
 * Uses setTimeout(0) to defer navigation outside React's render/commit phase,
 * preventing race conditions with Astro Islands and React Strict Mode.
 */
export function hardNavigate(path: string) {
  const url = new URL(path, window.location.origin);

  // Security guard: never navigate cross-origin from this helper
  if (url.origin !== window.location.origin) {
    return;
  }

  // Avoid no-op navigations (can leave UI stuck in "redirecting" state)
  if (url.href === window.location.href) {
    return;
  }

  const targetHref = url.href;

  // Defer navigation outside React callstack to avoid race conditions
  // with React Strict Mode and Astro Islands/View Transitions
  setTimeout(() => {
    window.location.replace(targetHref);
  }, 0);
}
