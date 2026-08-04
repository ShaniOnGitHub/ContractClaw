import axios from 'axios';

const API_BASE = 'http://localhost:8000/api';
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
  risk_type: string;
  severity: 'Low' | 'Medium' | 'High';
  clause_text: string;
  explanation: string;
  recommendation: string;
}

export interface AnalysisResult {
  analysis_id: string;
  contract_id: string;
  retriever_mode: string;
  retrieval_info: Record<string, any>;
  risks: RiskFinding[];
  overall_score: number;
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

// ─── Auth API Calls ───────────────────────────────────────────────────────────

export const signupUser = async (email: string, password: string): Promise<AuthResponse> => {
  const res = await apiClient.post(`${V1}/auth/signup`, { email, password });
  return res.data;
};

export const loginUser = async (email: string, password: string): Promise<AuthResponse> => {
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
  mode: string,
  k = 5,
  lambdaMult = 0.5,
): Promise<any> => {
  const res = await apiClient.post(`${V1}/contracts/${contractId}/query`, {
    query, mode, k, lambda_mult: lambdaMult, full_context: true,
  });
  return res.data;
};

/** Full risk analysis via GPT-4o-mini */
export const analyzeContract = async (
  contractId: string,
  mode = 'Similarity Search',
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

