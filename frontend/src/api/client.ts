import type { AdminQuestionReport, Dashboard, IssueType, QuestionReportStatus, ReportStatusValue } from '@/types/bank';

const API_BASE = '/api';

export class ApiError extends Error {
  fields: Record<string, string>;

  constructor(message: string, fields: Record<string, string> = {}) {
    super(message);
    this.fields = fields;
  }
}

function extractError(data: unknown): { message: string; fields: Record<string, string> } {
  if (data && typeof data === 'object') {
    const bag = data as Record<string, unknown>;
    const fields: Record<string, string> = {};
    for (const [key, value] of Object.entries(bag)) {
      if (key === 'detail' && typeof value === 'string') {
        return { message: value, fields };
      }
      if (Array.isArray(value)) {
        fields[key] = value.map((item) => String(item)).join('；');
      } else if (typeof value === 'string') {
        fields[key] = value;
      }
    }
    const first = Object.values(fields)[0];
    if (first) {
      return { message: first, fields };
    }
  }
  return { message: '请求失败，请稍后重试', fields: {} };
}

async function request<T>(path: string, init?: RequestInit, token?: string | null): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init?.headers ?? {})
    },
    ...init
  });

  if (!response.ok) {
    let data: unknown = null;
    try {
      data = await response.json();
    } catch {
      data = null;
    }
    const { message, fields } = extractError(data);
    throw new ApiError(response.status === 401 ? '请先登录后再操作' : message, fields);
  }
  return response.json() as Promise<T>;
}

export const api = {
  health: () => request<{ status: string; service: string }>('/health/'),
  dashboard: (token?: string | null) => request<Dashboard>('/dashboard/', undefined, token),
  generatePaper: (difficulty: string, amount: number, token?: string | null) =>
    request<{ paper: Dashboard['paper'] }>('/papers/generate/', {
      method: 'POST',
      body: JSON.stringify({ difficulty, amount })
    }, token),
  submitExam: (answers: Record<number, string>) =>
    request<{ score: number; rank_hint: string; analysis: string[] }>('/exams/submit/', {
      method: 'POST',
      body: JSON.stringify({ answers })
    }),
  demoLogin: () =>
    request<{ access: string; refresh: string }>('/auth/demo-login/', {
      method: 'POST'
    }),
  login: (username: string, password: string) =>
    request<{ access: string; refresh: string }>('/auth/token/', {
      method: 'POST',
      body: JSON.stringify({ username, password })
    }),
  createReport: (
    payload: { question_id: number; issue_type: IssueType; detail: string },
    token: string
  ) =>
    request<{ duplicated: boolean; report: QuestionReportStatus }>('/reports/', {
      method: 'POST',
      body: JSON.stringify(payload)
    }, token),
  adminListReports: (filters: { status?: ReportStatusValue; question_id?: number }, token: string) => {
    const params = new URLSearchParams();
    if (filters.status) {
      params.set('status', filters.status);
    }
    if (filters.question_id) {
      params.set('question_id', String(filters.question_id));
    }
    const query = params.toString();
    return request<{ results: AdminQuestionReport[] }>(`/admin/reports/${query ? `?${query}` : ''}`, undefined, token);
  },
  adminReviewReport: (
    reportId: number,
    payload: { status: Extract<ReportStatusValue, 'resolved' | 'rejected'>; handling_note: string },
    token: string
  ) =>
    request<AdminQuestionReport>(`/admin/reports/${reportId}/review/`, {
      method: 'POST',
      body: JSON.stringify(payload)
    }, token)
};
