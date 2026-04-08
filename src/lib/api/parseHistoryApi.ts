const API_BASE = '/api/parse-history';

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
  async list(page = 1, limit = 20, status?: string, search?: string): Promise<ParseHistoryListResponse> {
    const params = new URLSearchParams({ page: String(page), limit: String(limit) });
    if (status) params.set('status', status);
    if (search) params.set('search', search);
    const res = await fetch(`${API_BASE}?${params}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);
    return res.json();
  },

  async get(id: string): Promise<ParseHistoryItem> {
    const res = await fetch(`${API_BASE}/${id}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);
    return res.json();
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
  }): Promise<ParseHistoryItem> {
    const res = await fetch(API_BASE, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);
    return res.json();
  },

  async remove(id: string): Promise<void> {
    const res = await fetch(`${API_BASE}/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);
  },

  async clearAll(): Promise<void> {
    const res = await fetch(API_BASE, { method: 'DELETE' });
    if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);
  },
};
