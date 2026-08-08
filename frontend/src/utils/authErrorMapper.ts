/**
 * authErrorMapper.ts — Standardized Supabase Auth Error Code Mapper
 * Converts raw Supabase error codes & messages into clear, actionable user messages.
 */

export interface MappedAuthError {
  message: string;
  isLeakedPassword?: boolean;
  isRateLimit?: boolean;
  isEmailUnconfirmed?: boolean;
  cooldownSeconds?: number;
}

export const mapSupabaseAuthError = (error: any): MappedAuthError => {
  if (!error) {
    return { message: 'An unexpected authentication error occurred. Please try again.' };
  }

  console.error('[Supabase Auth Diagnostic Log]', error);

  const rawMessage = (error.message || error.msg || error.error_description || String(error)).toLowerCase();
  const errorCode = String(error.code || error.status || '').toLowerCase();

  // 1. Leaked Password Protection Check
  if (
    errorCode === 'weak_password' ||
    rawMessage.includes('leak') ||
    rawMessage.includes('breach') ||
    rawMessage.includes('pwned') ||
    rawMessage.includes('not safe') ||
    rawMessage.includes('appeared in')
  ) {
    return {
      message: 'This password has appeared in a public data breach. Please choose a different, stronger password for your account security.',
      isLeakedPassword: true,
    };
  }

  // 2. Email Rate Limit Exceeded
  if (
    errorCode === 'over_email_send_rate_limit' ||
    errorCode === '429' ||
    rawMessage.includes('rate limit') ||
    rawMessage.includes('too many requests') ||
    rawMessage.includes('email rate limit')
  ) {
    return {
      message: 'Email rate limit exceeded. Please wait a moment before trying again.',
      isRateLimit: true,
      cooldownSeconds: 60,
    };
  }

  // 3. Invalid Login Credentials
  if (
    errorCode === 'invalid_credentials' ||
    rawMessage.includes('invalid login credentials') ||
    rawMessage.includes('invalid credentials') ||
    rawMessage.includes('wrong password')
  ) {
    return {
      message: 'Incorrect email or password. Please check your credentials and try again.',
    };
  }

  // 4. User Already Exists
  if (
    errorCode === 'user_already_exists' ||
    rawMessage.includes('already registered') ||
    rawMessage.includes('already exists')
  ) {
    return {
      message: 'An account with this email address already exists. Please sign in instead.',
    };
  }

  // 5. Email Not Confirmed
  if (
    errorCode === 'email_not_confirmed' ||
    rawMessage.includes('email not confirmed')
  ) {
    return {
      message: 'Your email address has not been confirmed yet. Please check your inbox for the confirmation link.',
      isEmailUnconfirmed: true,
    };
  }

  // 6. Weak Password Length
  if (rawMessage.includes('password should be at least') || rawMessage.includes('short')) {
    return {
      message: 'Password must be at least 8 characters long and contain letters and numbers.',
    };
  }

  // Fallback
  return {
    message: error.message || 'Authentication failed. Please try again.',
  };
};
