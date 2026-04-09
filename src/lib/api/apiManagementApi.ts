import { apiFetch, buildQuery } from './client';

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
  async getKeys(tenantId = 'default', signal?: AbortSignal): Promise<ApiKey[]> {
    return apiFetch(`/keys${buildQuery({ tenantId })}`, { signal });
  },

  async createKey(data: { name: string; tenantId?: string; scopes?: string[]; rateLimit?: number; expiresAt?: string }, signal?: AbortSignal): Promise<ApiKey> {
    return apiFetch('/keys', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...data, tenantId: data.tenantId || 'default' }),
      signal,
    });
  },

  async deleteKey(id: string, signal?: AbortSignal): Promise<void> {
    return apiFetch(`/keys/${id}`, { method: 'DELETE', signal });
  },

  async getUsageStats(tenantId = 'default', days = 7, signal?: AbortSignal): Promise<UsageStats> {
    return apiFetch(`/usage${buildQuery({ tenantId, days })}`, { signal });
  },

  async getApiOverview(tenantId = 'default', signal?: AbortSignal): Promise<ApiOverviewData> {
    return apiFetch(`/usage/overview${buildQuery({ tenantId })}`, { signal });
  },
};
