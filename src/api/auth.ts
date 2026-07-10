import { api } from '@/services/api';
import { Role, User } from '@/types';
import { getAvatarColor } from '@/utils/avatar';

export interface AuthResult {
  user: User;
  token: string;
  /** Backend does not currently issue a refresh token (JWT is short-lived and re-obtained via login). */
  refreshToken?: string;
}

export interface RegisterPayload {
  name: string;
  email: string;
  password: string;
  role: Exclude<Role, 'admin'>;
}

export interface LoginPayload {
  email: string;
  password: string;
}

/** Shape returned by the Node/Oracle backend for a user (see backend/models/userModel.js). */
interface BackendUser {
  id: number;
  fullName: string;
  email: string;
  phoneNumber: string | null;
  role: Role;
  status: 'active' | 'suspended';
  createdAt: string;
}

/** Every backend response is wrapped as { success, message, data }. */
interface BackendEnvelope<T> {
  success: boolean;
  message: string;
  data: T;
}

/**
 * Maps the backend's `users` row onto the frontend `User` type. Profile fields
 * (bio, skills, dayRate, credits, rating) don't live on the user record — they
 * come from `useMyProfile()` / `useMyAnalytics()` and are merged in by the
 * screens that need them (see DashboardView).
 */
function mapBackendUser(u: BackendUser): User {
  return {
    id: String(u.id),
    name: u.fullName,
    email: u.email,
    role: u.role,
    avatarColor: getAvatarColor(u.fullName),
    availability: 'available',
    skills: [],
    credits: [],
    status: u.status,
  };
}

/** POST /api/auth/register — always hits the live backend (auth is real user data). */
export async function register(payload: RegisterPayload): Promise<AuthResult> {
  const { data } = await api.post<BackendEnvelope<{ user: BackendUser; token: string }>>(
    '/api/auth/register',
    { fullName: payload.name, email: payload.email, password: payload.password, role: payload.role },
  );
  return { user: mapBackendUser(data.data.user), token: data.data.token };
}

/** POST /api/auth/login — always hits the live backend (auth is real user data). */
export async function login(payload: LoginPayload): Promise<AuthResult> {
  const { data } = await api.post<BackendEnvelope<{ user: BackendUser; token: string }>>(
    '/api/auth/login',
    payload,
  );
  return { user: mapBackendUser(data.data.user), token: data.data.token };
}
