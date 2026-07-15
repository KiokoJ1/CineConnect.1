/** Pragmatic email check — one @, a dot in the domain, no whitespace. */
export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/**
 * Login accepts either a real email address, or the literal "admin"
 * username used by the fixed admin account (email = 'admin' in the
 * `users` table — see backend/scripts/seedAdmin.js). Registration is
 * unaffected and still requires a real email via `isValidEmail`.
 */
export function isValidLoginIdentifier(value: string): boolean {
  return isValidEmail(value) || value.trim().toLowerCase() === 'admin';
}
