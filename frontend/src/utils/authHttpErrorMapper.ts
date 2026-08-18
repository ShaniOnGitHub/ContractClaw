/**
 * authHttpErrorMapper.ts — Friendly error messages for backend (SQLite/JWT) auth errors.
 *
 * When Supabase is not configured, signup/login hit our FastAPI backend directly.
 * Axios rejects non-2xx responses with errors whose message is the raw
 * "Request failed with status code XXX", hiding the useful `detail` text the
 * backend returns. This mapper extracts that detail and converts it into a
 * clear, actionable message for the login page.
 */

export interface MappedHttpAuthError {
  message: string;
  isRateLimit?: boolean;
  cooldownSeconds?: number;
  suggestSignIn?: boolean;
}

export const mapHttpAuthError = (err: any): MappedHttpAuthError => {
  // Prefer the backend's own error detail if axios attached the response
  const detail = err?.response?.data?.detail;
  const status = err?.response?.status;

  if (detail) {
    const text = String(detail).trim();
    const lower = text.toLowerCase();

    // 400 — user already exists
    if (status === 400 || lower.includes('already exists') || lower.includes('already registered')) {
      return {
        message: 'An account with this email already exists. Please sign in instead.',
        suggestSignIn: true,
      };
    }

    // 401 — wrong password
    if (status === 401 || lower.includes('invalid email') || lower.includes('invalid credentials')) {
      return { message: 'Incorrect email or password. Please check your credentials and try again.' };
    }

    // 429 — rate limit
    if (status === 429 || lower.includes('rate limit') || lower.includes('too many requests')) {
      return { message: 'Too many attempts. Please wait a moment and try again.', isRateLimit: true, cooldownSeconds: 60 };
    }

    // 422 — validation issues
    if (status === 422) {
      if (lower.includes('password')) {
        return { message: 'Password must be at least 6 characters long.' };
      }
      return { message: 'Please provide a valid email address and password.' };
    }

    return { message: text };
  }

  const msg = (err?.message || '').toLowerCase();

  // Network-level failures (no response at all) — common on mobile
  if (status === undefined && (msg.includes('network error') || msg.includes('failed') || !msg)) {
    return {
      message: 'Network error. Please check your internet connection and try again.',
    };
  }

  if (status === 429) {
    return { message: 'Too many attempts. Please wait a moment and try again.', isRateLimit: true, cooldownSeconds: 60 };
  }

  if (status === 400) {
    return { message: 'Unable to create account. Please check your details and try again.' };
  }

  if (status === 401) {
    return { message: 'Incorrect email or password. Please check your credentials and try again.' };
  }

  if (status) {
    return { message: `Server returned status code ${status}. Please try again in a moment.` };
  }

  return { message: err?.message || 'An unexpected error occurred. Please try again.' };
};
