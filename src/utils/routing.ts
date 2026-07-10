import { Role } from '@/types';

/** Home route for a given role after authentication. */
export function homeRouteForRole(role: Role | null): string {
  switch (role) {
    case 'producer':
      return '/(producer)/home';
    case 'admin':
      return '/(admin)';
    case 'freelancer':
    default:
      return '/(freelancer)/home';
  }
}
