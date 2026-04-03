import { TaskResponse, EvaluationResult } from '../types';

const API_BASE = '/api';

export const evaluationApi = {
  async createTask(data: { name: string; description?: string; type: string; config: any }): Promise<TaskResponse> {
    const res = await fetch(`${API_BASE}/evaluations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}: ${await res.text()}`);
    }
    return res.json();
  },

  async getTasks(params?: { page?: number; limit?: number; status?: string }): Promise<TaskResponse[]> {
    const query = new URLSearchParams(params as any).toString();
    const res = await fetch(`${API_BASE}/evaluations?${query}`);
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}: ${await res.text()}`);
    }
    return res.json();
  },

  async getTask(id: string): Promise<TaskResponse> {
    const res = await fetch(`${API_BASE}/evaluations/${id}`);
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}: ${await res.text()}`);
    }
    return res.json();
  },

  async updateTask(id: string, data: { status?: string; stats?: any }): Promise<TaskResponse> {
    const res = await fetch(`${API_BASE}/evaluations/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}: ${await res.text()}`);
    }
    return res.json();
  },

  async getResults(taskId: string): Promise<EvaluationResult[]> {
    const res = await fetch(`${API_BASE}/evaluations/${taskId}/results`);
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}: ${await res.text()}`);
    }
    return res.json();
  },

  async saveResult(taskId: string, data: EvaluationResult): Promise<void> {
    const res = await fetch(`${API_BASE}/evaluations/${taskId}/results`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}: ${await res.text()}`);
    }
    return res.json();
  },

  async saveAnnotation(taskId: string, resultId: string, annotation: any): Promise<void> {
    const res = await fetch(`${API_BASE}/annotations/${taskId}/annotations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ resultId, annotation }),
    });
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}: ${await res.text()}`);
    }
    return res.json();
  },

  async retryFailed(taskId: string): Promise<{ retriedCount: number }> {
    const res = await fetch(`${API_BASE}/evaluations/${taskId}/retry-failed`, {
      method: 'POST',
    });
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}: ${await res.text()}`);
    }
    return res.json();
  },
};
