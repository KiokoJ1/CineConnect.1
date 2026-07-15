import { Role } from '@/types';

/**
 * Home route for a given role after authentication. There's no separate
 * `(client)` route group — the backend already treats 'client' as a
 * producer-equivalent for project ownership (see
 * backend/services/projectService.js's OWNER_ROLES), so a client uses the
 * same Post-a-Job / manage-applications screens a producer does.
 */
export function homeRouteForRole(role: Role | null): string {
  switch (role) {
    case 'producer':
    case 'client':
      return '/(producer)/home';
    case 'admin':
      return '/(admin)';
    case 'freelancer':
    default:
      return '/(freelancer)/home';
  }
}

/** Roles a signed-in user can self-grant onto their own account (see RoleSwitcher's "Add role"). Deliberately excludes 'admin'. */
export const SELF_SERVICE_ROLES: Role[] = ['producer', 'freelancer', 'client'];

/** Display label for a role, e.g. in the Switch Role list. */
export function roleLabel(role: Role): string {
  switch (role) {
    case 'producer':
      return 'Producer';
    case 'freelancer':
      return 'Freelancer';
    case 'client':
      return 'Client';
    case 'admin':
      return 'Admin';
    default:
      return role;
  }
}
