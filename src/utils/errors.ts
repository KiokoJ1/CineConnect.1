import { AxiosError } from 'axios';

/** Shape of every error response from the backend (see backend/utils/apiResponse.js). */
interface BackendErrorBody {
  success: false;
  message: string;
  errors?: string[] | null;
}

/**
 * Pulls a human-readable message out of an API error. Prefers the backend's
 * validation `errors` array (e.g. "Password must be at least 8 characters
 * long.") over the generic top-level `message`, and falls back to a network
 * hint if the server couldn't be reached at all.
 */
export function extractErrorMessage(error: unknown): string | null {
  const axiosError = error as AxiosError<BackendErrorBody>;
  const body = axiosError?.response?.data;

  if (body?.errors && body.errors.length > 0) return body.errors.join('\n');
  if (body?.message) return body.message;
  if (axiosError?.request && !axiosError?.response) {
    return "Couldn't reach the server. Check your connection and that the backend is running.";
  }
  return null;
}
