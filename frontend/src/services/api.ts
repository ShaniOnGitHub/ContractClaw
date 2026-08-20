import axios from 'axios';

/**
 * Resolves the API base URL (mobile & desktop friendly):
 * 1. VITE_API_BASE_URL env var for local overrides or private environments.
 * 2. Same-origin relative path (/api) — works on EVERY device and network
 *    (desktop, mobile, deployed, previews) because the browser sends the
 *    request to the same host as the frontend. Relative URLs never fail
 *    with "Network Error" due to localhost/port guessing.
 * 3. Local dev fallback (localhost:8000) — only when Vite's dev server
 *    is serving the app locally (detected via dev-server-only hostnames).
 */
const getApiBaseUrl = (): string => {
  if (import.meta.env.VITE_API_BASE_URL) {
    return import.meta.env.VITE_API_BASE_URL;
  }
  if (typeof window !== 'undefined' && window.location) {
    const hostname = window.location.hostname;
    // Only guess a :8000 target during LOCAL development (localhost or
    // plain LAN hostnames without a dot, e.g. a phone previewing the
    // desktop's dev server over the same LAN). Deployed hosts ALWAYS use the
    // same-origin relative path. Never guess a port on production — that is what
    // caused "Network Error" on mobile and 405 on production.
    const isLocalDev = hostname === 'localhost' || hostname === '127.0.0.1' || !hostname.includes('.');
    if (isLocalDev) {
      return `${window.location.protocol}//${hostname}:8000/api`;
    }
  }
  // Default: same-origin relative path — safe on every device/network
  return '/api';
};

const API_BASE = getApiBaseUrl();
const V1 = `${API_BASE}/v1`;

// Create axios instance with interceptors for Authorization
export const apiClient = axios.create();

apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('contractclaw_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}, (error) => Promise.reject(error));

// ─── Types ────────────────────────────────────────────────────────────────────

export interface UserProfile {
  id: string;
  email: string;
  credits_remaining: number;
  tier: string;
  created_at: string;
}

export interface AuthResponse {
  token: string;
  user: UserProfile;
  sessionExists?: boolean;
}

export interface ContractMetadata {
  contract_type: string;
  upload_date: string;
  filename: string;
  parties: string;
}

export interface Contract {
  id: string;
  filename: string;
  contract_type: string;
  parties: string;
  upload_date: string;
  status: 'pending' | 'indexing' | 'indexed' | 'error';
  risk_score: number;
  risk_level: 'Low' | 'Medium' | 'High';
  error_message?: string;
  raw_text?: string;
}

export interface RiskFinding {
  finding_type?: 'critical_risk' | 'missing_clause' | 'ambiguous_language' | 'negotiation_opportunity' | 'compliance_check' | 'informational';
  risk_type: string;
  severity: 'Low' | 'Medium' | 'High';
  clause_text: string;
  grounded_citation?: string;
  explanation: string;
  recommendation: string;
  suggested_rewrite?: string;
  detection_confidence?: number;
  assessment_confidence?: number;
  confidence_score?: number;
  confidence_level?: 'HIGH' | 'MEDIUM' | 'LOW';
  playbook_violations?: string[];
}

export interface ClauseCompletenessItem {
  clause_name: string;
  status: 'present_complete' | 'mentioned_incomplete' | 'missing_expected' | 'missing_optional' | 'not_applicable' | 'uncertain' | 'present' | 'needs_attention' | 'missing' | string;
  summary: string;
}

export interface AnalysisResult {
  analysis_id: string;
  contract_id: string;
  retriever_mode: string;
  retrieval_info: Record<string, any>;
  risks: RiskFinding[];
  checklist?: ClauseCompletenessItem[];
  overall_score: number;
  risk_level?: string;
  summary: string;
  credits_remaining: number;
}

export interface UploadResult {
  contract_id: string;
  filename: string;
  status: string;
  message: string;
  contract_type?: string;
}

export interface IndexResult {
  contract_id: string;
  status: string;
  chunks: number;
  parent_docs: number;
  child_docs: number;
}

export interface RetrievedDocument {
  content: string;
  metadata: Record<string, any>;
  score?: number;
}

export interface QueryResponse {
  query: string;
  mode: string;
  metadata: ContractMetadata;
  results: RetrievedDocument[];
  info: Record<string, any>;
}

export interface CompareResponse {
  query: string;
  mode_a: { name: string; results: RetrievedDocument[]; info: Record<string, any> };
  mode_b: { name: string; results: RetrievedDocument[]; info: Record<string, any> };
}

export interface HistoryEntry {
  id: string;
  contract_id: string;
  filename: string;
  contract_type: string;
  query: string;
  retriever_mode: string;
  overall_score: number;
  timestamp: string;
  credits_used: number;
  results: AnalysisResult;
}

export interface DashboardMetrics {
  total_contracts: number;
  high_risk_count: number;
  pending_review: number;
  avg_risk_score: number;
}

export interface UserCredits {
  credits_remaining: number;
  tier: string;
}

import { supabase, isSupabaseConfigured } from './supabase';

// ─── Auth API Calls ───────────────────────────────────────────────────────────

export const signupUser = async (email: string, password: string): Promise<AuthResponse> => {
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) throw error;
    if (!data.user) {
      throw new Error('Account creation failed. Please try again.');
    }
    const token = data.session?.access_token || `active_token_${data.user.id}`;
    const user: UserProfile = {
      id: data.user.id,
      email: data.user.email || email,
      credits_remaining: 15,
      tier: 'free',
      created_at: data.user.created_at || new Date().toISOString()
    };
    return { token, user, sessionExists: true };
  }
  const res = await apiClient.post(`${V1}/auth/signup`, { email, password });
  return res.data;
};

export const loginUser = async (email: string, password: string): Promise<AuthResponse> => {
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    if (!data.session || !data.user) {
      throw new Error('Invalid login session. Please check your credentials and try again.');
    }
    const token = data.session.access_token;
    const user: UserProfile = {
      id: data.user.id,
      email: data.user.email || email,
      credits_remaining: 15,
      tier: 'free',
      created_at: data.user.created_at || new Date().toISOString()
    };
    return { token, user, sessionExists: true };
  }
  const res = await apiClient.post(`${V1}/auth/login`, { email, password });
  return res.data;
};

export const getMe = async (): Promise<UserProfile> => {
  const res = await apiClient.get(`${V1}/auth/me`);
  return res.data;
};

export const deleteAccount = async (): Promise<{ message: string }> => {
  const res = await apiClient.delete(`${V1}/auth/me`);
  return res.data;
};

// ─── V1 API Calls ─────────────────────────────────────────────────────────────

/** Upload a PDF contract file → returns contract_id & triggers background parsing */
export const uploadContract = async (file: File): Promise<UploadResult> => {
  const form = new FormData();
  form.append('file', file);
  const res = await apiClient.post(`${V1}/contracts/upload`, form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return res.data;
};

/** Index contract (optional manual trigger if needed) */
export const indexContract = async (contractId: string): Promise<IndexResult> => {
  const res = await apiClient.post(`${V1}/contracts/${contractId}/index`);
  return res.data;
};

/** List user's contracts from SQLite */
export const listContracts = async (): Promise<{ contracts: Contract[]; total: number }> => {
  const res = await apiClient.get(`${V1}/contracts/`);
  return res.data;
};

/** Get a single contract (includes raw_text for analysis pane) */
export const getContract = async (contractId: string): Promise<Contract> => {
  const res = await apiClient.get(`${V1}/contracts/${contractId}`);
  return res.data;
};

/** Retrieval-only query (no LLM) */
export const queryContract = async (
  contractId: string,
  query: string,
  mode = 'claw_1_0',
  k = 5,
  lambdaMult = 0.5,
): Promise<any> => {
  const res = await apiClient.post(`${V1}/contracts/${contractId}/query`, {
    query, mode, k, lambda_mult: lambdaMult, full_context: true,
  });
  return res.data;
};

/** Full risk analysis via Groq / OpenAI */
export const analyzeContract = async (
  contractId: string,
  mode = 'claw_1_0',
  k = 8,
): Promise<AnalysisResult> => {
  const res = await apiClient.post(`${V1}/contracts/${contractId}/analyze`, {
    mode, k, lambda_mult: 0.5,
  });
  return res.data;
};

/** Analysis history */
export const listHistory = async (): Promise<{ history: HistoryEntry[]; total: number }> => {
  const res = await apiClient.get(`${V1}/history/`);
  return res.data;
};

/** User credits */
export const getCredits = async (): Promise<UserCredits> => {
  const res = await apiClient.get(`${V1}/user/credits`);
  return res.data;
};

/** Dashboard summary metrics */
export const getDashboardMetrics = async (): Promise<DashboardMetrics> => {
  const res = await apiClient.get(`${V1}/metrics/dashboard`);
  return res.data;
};


export interface ClauseAnnotation {
  id?: string;
  contract_id?: string;
  user_id?: string;
  clause_index: number;
  flagged: boolean;
  note: string;
}

/** Get clause annotations for contract */
export const getAnnotations = async (contractId: string): Promise<{ annotations: ClauseAnnotation[] }> => {
  const res = await apiClient.get(`${V1}/contracts/${contractId}/annotations`);
  return res.data;
};

/** Save clause annotation (flag / note) for contract */
export const saveAnnotation = async (
  contractId: string,
  clauseIndex: number,
  flagged: boolean,
  note: string,
): Promise<{ message: string }> => {
  const res = await apiClient.post(`${V1}/contracts/${contractId}/annotations`, {
    clause_index: clauseIndex,
    flagged,
    note,
  });
  return res.data;
};

export interface RedlinePosition {
  proposed_text: string;
  diff_html: string;
  rationale: string;
}

export interface RedlineResponse {
  clause_type: string;
  original_text: string;
  positions: {
    balanced: RedlinePosition;
    buyer_friendly: RedlinePosition;
    vendor_friendly: RedlinePosition;
  };
}

export interface PlaybookRule {
  rule_id: string;
  category: string;
  description: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  disallowed_phrases?: string[];
  preferred_standard?: string;
}

export interface Playbook {
  id: string;
  name: string;
  description: string;
  rules: PlaybookRule[];
}

export interface PlaybookCheckResult {
  compliance_score: number;
  status: 'PASS' | 'WARNING' | 'FAIL';
  total_rules_checked: number;
  violations_count: number;
  violations: Array<{
    rule_id: string;
    category: string;
    severity: string;
    description: string;
    matched_disallowed: string[];
    preferred_standard?: string;
  }>;
}

/** Generate AI redlines for a clause */
export const generateRedlines = async (
  contractId: string,
  clauseCategory: string,
  originalText: string,
): Promise<RedlineResponse> => {
  const res = await apiClient.post(`${V1}/redline/generate`, {
    contract_id: contractId,
    clause_category: clauseCategory,
    original_text: originalText,
  });
  return res.data;
};

/** Get list of playbooks */
export const getPlaybooks = async (): Promise<{ playbooks: Playbook[] }> => {
  const res = await apiClient.get(`${V1}/playbooks`);
  return res.data;
};

/** Create custom playbook */
export const createPlaybook = async (name: string, description: string, rules: PlaybookRule[]): Promise<Playbook> => {
  const res = await apiClient.post(`${V1}/playbooks`, { name, description, rules });
  return res.data;
};

/** Check contract against playbook rules */
export const checkPlaybook = async (contractId: string, playbookId?: string): Promise<PlaybookCheckResult> => {
  const res = await apiClient.post(`${V1}/analysis/playbook-check`, { contract_id: contractId, playbook_id: playbookId });
  return res.data;
};

export interface ContractDeadline {
  id: string;
  contract_id: string;
  filename?: string;
  title: string;
  deadline_date: string;
  obligation_type: string;
  summary: string;
  days_remaining?: number;
}

/** Get upcoming contractual deadlines & notice windows */
export const getDeadlines = async (): Promise<{ deadlines: ContractDeadline[] }> => {
  const res = await apiClient.get(`${V1}/deadlines`);
  return res.data;
};

/** Get run observability stage trace details */
export const getRunTrace = async (runId: string): Promise<any> => {
  const res = await apiClient.get(`${V1}/runs/${runId}`);
  return res.data;
};



