import axios from 'axios';

const API_BASE_URL = 'http://localhost:8000/api';

export interface ContractMetadata {
  contract_type: string;
  upload_date: string;
  filename: string;
  parties: string;
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

export const getSamples = async (): Promise<string[]> => {
  const res = await axios.get(`${API_BASE_URL}/samples`);
  return res.data.samples;
};

export const selectSample = async (filename: string): Promise<any> => {
  const res = await axios.post(`${API_BASE_URL}/select_sample`, { filename });
  return res.data;
};

export const uploadPdf = async (file: File): Promise<any> => {
  const formData = new FormData();
  formData.append('file', file);
  const res = await axios.post(`${API_BASE_URL}/upload`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return res.data;
};

export const queryRetriever = async (
  query: string,
  mode: string,
  k: number = 3,
  lambdaMult: number = 0.5,
  fullContext: boolean = true
): Promise<QueryResponse> => {
  const res = await axios.post(`${API_BASE_URL}/query`, {
    query,
    mode,
    k,
    lambda_mult: lambdaMult,
    full_context: fullContext,
  });
  return res.data;
};

export const compareRetrievers = async (
  query: string,
  modeA: string,
  modeB: string,
  k: number = 3,
  lambdaMult: number = 0.5,
  fullContext: boolean = true
): Promise<CompareResponse> => {
  const res = await axios.post(`${API_BASE_URL}/compare`, {
    query,
    mode_a: modeA,
    mode_b: modeB,
    k,
    lambda_mult: lambdaMult,
    full_context: fullContext,
  });
  return res.data;
};
