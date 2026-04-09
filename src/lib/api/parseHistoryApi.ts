import { apiFetch, buildQuery } from './client';

export interface ParseHistoryItem {
  id: string;
  status: string;
  file_name: string;
  file_hash: string | null;
  file_size: number;
  mime_type: string;
  result: unknown;
  error: string | null;
  processing_time: number | null;
  created_at: string;
  completed_at: string | null;
}

export interface ParseHistoryListResponse {
  items: ParseHistoryItem[];
  total: number;
  page: number;
  limit: number;
}

export const parseHistoryApi = {
  async list(page = 1, limit = 20, status?: string, search?: string, signal?: AbortSignal): Promise<ParseHistoryListResponse> {
    return apiFetch(`/parse-history${buildQuery({ page, limit, status, search })}`, { signal });
  },

  async get(id: string, signal?: AbortSignal): Promise<ParseHistoryItem> {
    return apiFetch(`/parse-history/${id}`, { signal });
  },

  async save(data: {
    fileName: string;
    fileHash?: string;
    fileSize?: number;
    mimeType?: string;
    status: string;
    result?: unknown;
    error?: string;
    processingTime?: number;
  }, signal?: AbortSignal): Promise<ParseHistoryItem> {
    return apiFetch('/parse-history', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
      signal,
    });
  },

  async remove(id: string, signal?: AbortSignal): Promise<void> {
    return apiFetch(`/parse-history/${id}`, { method: 'DELETE', signal });
  },

  async clearAll(signal?: AbortSignal): Promise<void> {
    return apiFetch('/parse-history', { method: 'DELETE', signal });
  },
};
