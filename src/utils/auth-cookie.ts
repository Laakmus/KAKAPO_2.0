const COOKIE_NAME = 'kakapo_access_token';

/**
 * Dodaje httpOnly cookie z tokenem auth do Response.
 */
export function setAuthCookie(response: Response, token: string, maxAgeSeconds: number): Response {
  const cookieValue = [
    `${COOKIE_NAME}=${token}`,
    `HttpOnly`,
    `Secure`,
    `SameSite=Lax`,
    `Path=/`,
    `Max-Age=${maxAgeSeconds}`,
  ].join('; ');

  response.headers.append('Set-Cookie', cookieValue);
  return response;
}

/**
 * Ustawia cookie z Max-Age=0 (usunięcie).
 */
export function clearAuthCookie(response: Response): Response {
  const cookieValue = [`${COOKIE_NAME}=`, `HttpOnly`, `Secure`, `SameSite=Lax`, `Path=/`, `Max-Age=0`].join('; ');

  response.headers.append('Set-Cookie', cookieValue);
  return response;
}

/**
 * Wyciąga token z nagłówka Cookie requestu.
 */
export function getTokenFromCookie(request: Request): string | undefined {
  const cookieHeader = request.headers.get('cookie');
  if (!cookieHeader) return undefined;

  const cookies = cookieHeader.split(';');
  for (const cookie of cookies) {
    const [name, ...valueParts] = cookie.trim().split('=');
    if (name === COOKIE_NAME) {
      const value = valueParts.join('=');
      return value || undefined;
    }
  }
  return undefined;
}
