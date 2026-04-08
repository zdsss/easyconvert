import { create } from 'zustand';
import { parseHistoryApi, type ParseHistoryItem, type ParseHistoryListResponse } from '../api/parseHistoryApi';

interface ParseHistoryState {
  items: ParseHistoryItem[];
  total: number;
  currentPage: number;
  selectedItem: ParseHistoryItem | null;
  isLoading: boolean;
  error: string | null;

  loadList: (page?: number, status?: string, search?: string) => Promise<void>;
  loadDetail: (id: string) => Promise<void>;
  removeItem: (id: string) => Promise<void>;
  clearAll: () => Promise<void>;
  setPage: (page: number) => void;
  setSelectedItem: (item: ParseHistoryItem | null) => void;
}

export const useParseHistoryStore = create<ParseHistoryState>((set, get) => ({
  items: [],
  total: 0,
  currentPage: 1,
  selectedItem: null,
  isLoading: false,
  error: null,

  loadList: async (page, status, search) => {
    set({ isLoading: true, error: null });
    try {
      const p = page ?? get().currentPage;
      const data: ParseHistoryListResponse = await parseHistoryApi.list(p, 20, status, search);
      set({ items: data.items, total: data.total, currentPage: p, isLoading: false });
    } catch (e) {
      set({ isLoading: false, error: e instanceof Error ? e.message : 'Unknown error' });
    }
  },

  loadDetail: async (id) => {
    try {
      const item = await parseHistoryApi.get(id);
      set({ selectedItem: item });
    } catch (e) {
      set({ error: e instanceof Error ? e.message : 'Unknown error' });
    }
  },

  removeItem: async (id) => {
    await parseHistoryApi.remove(id);
    const { items, total } = get();
    set({ items: items.filter(i => i.id !== id), total: total - 1, selectedItem: null });
  },

  clearAll: async () => {
    await parseHistoryApi.clearAll();
    set({ items: [], total: 0, currentPage: 1, selectedItem: null });
  },

  setPage: (page) => set({ currentPage: page }),
  setSelectedItem: (item) => set({ selectedItem: item }),
}));
