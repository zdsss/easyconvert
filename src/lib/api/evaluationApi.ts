import type { TaskResponse, EvaluationResult, EvaluationConfig, Resume } from '../types';
import { apiFetch, buildQuery } from './client';

export const evaluationApi = {
  async createTask(data: { name: string; description?: string; type: string; config: EvaluationConfig }, signal?: AbortSignal): Promise<TaskResponse> {
    return apiFetch('/evaluations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
      signal,
    });
  },

  async getTasks(params?: { page?: number; limit?: number; status?: string }, signal?: AbortSignal): Promise<TaskResponse[]> {
    return apiFetch(`/evaluations${buildQuery(params ?? {})}`, { signal });
  },

  async getTask(id: string, signal?: AbortSignal): Promise<TaskResponse> {
    return apiFetch(`/evaluations/${id}`, { signal });
  },

  async updateTask(id: string, data: { status?: string; stats?: Record<string, number> }, signal?: AbortSignal): Promise<TaskResponse> {
    return apiFetch(`/evaluations/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
      signal,
    });
  },

  async getResults(taskId: string, signal?: AbortSignal): Promise<EvaluationResult[]> {
    return apiFetch(`/evaluations/${taskId}/results`, { signal });
  },

  async saveResult(taskId: string, data: EvaluationResult, signal?: AbortSignal): Promise<void> {
    return apiFetch(`/evaluations/${taskId}/results`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
      signal,
    });
  },

  async saveAnnotation(taskId: string, resultId: string, annotation: Resume, signal?: AbortSignal): Promise<void> {
    return apiFetch(`/annotations/${taskId}/annotations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ resultId, annotation }),
      signal,
    });
  },

  async retryFailed(taskId: string, signal?: AbortSignal): Promise<{ retriedCount: number }> {
    return apiFetch(`/evaluations/${taskId}/retry-failed`, { method: 'POST', signal });
  },
};
