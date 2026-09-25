import type { Dashboard, LoginResult, QuestionReport } from '@/types/bank';

const API_BASE = '/api';

async function request<T>(path: string, init?: RequestInit, token?: string): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(init?.headers as Record<string, string> | undefined)
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE}${path}`, { ...init, headers });

  if (!response.ok) {
    throw new Error(`请求失败：${response.status}`);
  }
  return response.json() as Promise<T>;
}

export const api = {
  health: () => request<{ status: string; service: string }>('/health/'),
  dashboard: () => request<Dashboard>('/dashboard/'),
  generatePaper: (difficulty: string, amount: number) =>
    request<{ paper: Dashboard['paper'] }>('/papers/generate/', {
      method: 'POST',
      body: JSON.stringify({ difficulty, amount })
    }),
  submitExam: (answers: Record<number, string>) =>
    request<{ score: number; rank_hint: string; analysis: string[] }>('/exams/submit/', {
      method: 'POST',
      body: JSON.stringify({ answers })
    }),
  demoLogin: () => request<LoginResult>('/auth/demo-login/', { method: 'POST' }),
  opsLogin: () => request<LoginResult>('/auth/ops-login/', { method: 'POST' }),
  createReport: (token: string, payload: { question_id: number; issue_type: string; note: string }) =>
    request<{ report: QuestionReport; duplicated: boolean; message?: string }>(
      '/reports/',
      { method: 'POST', body: JSON.stringify(payload) },
      token
    ),
  myReports: (token: string) => request<{ reports: QuestionReport[] }>('/reports/mine/', undefined, token),
  pendingReports: (token: string) => request<{ reports: QuestionReport[] }>('/reports/pending/', undefined, token),
  resolveReport: (token: string, reportId: number, payload: { result: 'fixed' | 'nochange'; note: string }) =>
    request<{ report: QuestionReport }>(
      `/reports/${reportId}/resolve/`,
      { method: 'POST', body: JSON.stringify(payload) },
      token
    )
};
