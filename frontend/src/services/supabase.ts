import { createClient } from '@supabase/supabase-js';

const sanitizeUrl = (url: string): string => {
  let cleaned = (url || '').trim().replace(/^["']|["']$/g, '');
  if (!cleaned) return '';
  if (!cleaned.startsWith('http://') && !cleaned.startsWith('https://')) {
    cleaned = `https://${cleaned}`;
  }
  try {
    const parsed = new URL(cleaned);
    return parsed.origin;
  } catch (e) {
    return cleaned.replace(/\/+$/, '');
  }
};

const rawKey = (import.meta.env.VITE_SUPABASE_ANON_KEY || '').trim().replace(/^["']|["']$/g, '');
const SUPABASE_URL = sanitizeUrl(import.meta.env.VITE_SUPABASE_URL || '');
const SUPABASE_ANON_KEY = rawKey;

export const isSupabaseConfigured = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

export const supabase = isSupabaseConfigured
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  : null;
