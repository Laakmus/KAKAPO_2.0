/**
 * Props dla komponentu FooterLinks
 */
type FooterLinksProps = {
  /**
   * URL do strony logowania
   * @default "/login"
   */
  href?: string;
  /**
   * Dodatkowe klasy CSS
   */
  className?: string;
};

/**
 * Komponent FooterLinks
 *
 * Wyświetla link do strony logowania dla użytkowników którzy już posiadają konto.
 * Używany w stopce formularza rejestracji.
 *
 * @param props - Props komponentu
 */
export function FooterLinks({ href = '/login', className = '' }: FooterLinksProps) {
  return (
    <p className={`text-center text-sm text-gray-600 ${className}`}>
      Masz już konto?{' '}
      <a href={href} className="font-medium text-primary hover:underline focus:underline focus:outline-none">
        Zaloguj się
      </a>
    </p>
  );
}
