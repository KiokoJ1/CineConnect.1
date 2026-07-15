import { Role } from '@/types';

/**
 * Home route for a given role after authentication (or after switching
 * active role — see MULTI_ROLE_SYSTEM.md).
 *
 * Known gap: there's no dedicated 'client' experience anywhere in the app
 * yet (no (client) route group) — a client-role account falls back to the
 * freelancer home like any other unrecognized role, which is functional but
 * not a real client UI. Documented rather than silently left ambiguous.
 */
export function homeRouteForRole(role: Role | null): string {
  switch (role) {
    case 'producer':
      return '/(producer)/home';
    case 'admin':
      return '/(admin)';
    case 'client':
    case 'freelancer':
    default:
      return '/(freelancer)/home';
  }
}
