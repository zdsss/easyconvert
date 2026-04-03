const API_BASE = '/api';

export interface ApiKey {
  id: string;
  tenant_id: string;
  name: string;
  key_prefix: string;
  scopes: string[];
  rate_limit: number;
  is_active: boolean;
  expires_at: string | null;
  last_used_at: string | null;
  created_at: string;
  key?: string; // only on create
}

export interface UsageStats {
  totalRequests: number;
  successRate: number;
  avgLatency: number;
  totalTokens: number;
  requestsByEndpoint: { endpoint: string; count: number; avgLatency: number }[];
  requestsByDay: { date: string; count: number }[];
  latencyDistribution: { bucket: string; count: number }[];
}

export interface ApiOverviewData {
  tenantId: string;
  activeKeys: number;
  totalRequests: number;
  rateLimitUsage: number;
  requestTrend: { date: string; count: number }[];
}

export const apiManagementApi = {
  async getKeys(tenantId: string = 'default'): Promise<ApiKey[]> {
    const res = await fetch(`${API_BASE}/keys?tenantId=${tenantId}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);
    return res.json();
  },

  async createKey(data: { name: string; tenantId?: string; scopes?: string[]; rateLimit?: number; expiresAt?: string }): Promise<ApiKey> {
    const res = await fetch(`${API_BASE}/keys`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...data, tenantId: data.tenantId || 'default' }),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);
    return res.json();
  },

  async deleteKey(id: string): Promise<void> {
    const res = await fetch(`${API_BASE}/keys/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);
  },

  async getUsageStats(tenantId: string = 'default', days: number = 7): Promise<UsageStats> {
    const res = await fetch(`${API_BASE}/usage?tenantId=${tenantId}&days=${days}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);
    return res.json();
  },

  async getApiOverview(tenantId: string = 'default'): Promise<ApiOverviewData> {
    const res = await fetch(`${API_BASE}/usage/overview?tenantId=${tenantId}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);
    return res.json();
  },
};
