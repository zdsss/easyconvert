import { create } from 'zustand';
import { apiManagementApi, type ApiKey, type UsageStats, type ApiOverviewData } from '../api/apiManagementApi';

interface ApiState {
  keys: ApiKey[];
  overview: ApiOverviewData | null;
  usage: UsageStats | null;
  isLoading: boolean;
  error: string | null;
  loadKeys: (tenantId?: string) => Promise<void>;
  createKey: (data: { name: string; scopes?: string[]; rateLimit?: number; expiresAt?: string }) => Promise<ApiKey>;
  deleteKey: (id: string) => Promise<void>;
  loadOverview: (tenantId?: string) => Promise<void>;
  loadUsage: (tenantId?: string, days?: number) => Promise<void>;
}

export const useApiStore = create<ApiState>((set, get) => ({
  keys: [],
  overview: null,
  usage: null,
  isLoading: false,
  error: null,

  loadKeys: async (tenantId) => {
    set({ isLoading: true, error: null });
    try {
      const keys = await apiManagementApi.getKeys(tenantId);
      set({ keys, isLoading: false });
    } catch (e) {
      set({ isLoading: false, error: (e as Error).message });
    }
  },

  createKey: async (data) => {
    const key = await apiManagementApi.createKey(data);
    set({ keys: [...get().keys, key] });
    return key;
  },

  deleteKey: async (id) => {
    await apiManagementApi.deleteKey(id);
    set({ keys: get().keys.filter(k => k.id !== id) });
  },

  loadOverview: async (tenantId) => {
    set({ isLoading: true, error: null });
    try {
      const overview = await apiManagementApi.getApiOverview(tenantId);
      set({ overview, isLoading: false });
    } catch (e) {
      set({ isLoading: false, error: (e as Error).message });
    }
  },

  loadUsage: async (tenantId, days) => {
    set({ isLoading: true, error: null });
    try {
      const usage = await apiManagementApi.getUsageStats(tenantId, days);
      set({ usage, isLoading: false });
    } catch (e) {
      set({ isLoading: false, error: (e as Error).message });
    }
  },
}));
