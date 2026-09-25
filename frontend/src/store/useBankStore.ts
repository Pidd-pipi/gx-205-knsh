import { create } from 'zustand';
import { api } from '@/api/client';
import type { Dashboard, QuestionReport } from '@/types/bank';

interface BankState {
  loading: boolean;
  error: string;
  dashboard: Dashboard | null;
  token: string;
  username: string;
  isStaff: boolean;
  reports: QuestionReport[];
  pendingReports: QuestionReport[];
  loadDashboard: () => Promise<void>;
  demoLogin: () => Promise<void>;
  opsLogin: () => Promise<void>;
  logout: () => void;
  loadMyReports: () => Promise<void>;
  submitReport: (questionId: number, issueType: string, note: string) => Promise<{ report: QuestionReport; duplicated: boolean }>;
  loadPendingReports: () => Promise<void>;
  resolveReport: (reportId: number, result: 'fixed' | 'nochange', note: string) => Promise<void>;
}

export const useBankStore = create<BankState>((set, get) => ({
  loading: false,
  error: '',
  dashboard: null,
  token: '',
  username: '',
  isStaff: false,
  reports: [],
  pendingReports: [],
  loadDashboard: async () => {
    set({ loading: true, error: '' });
    try {
      set({ dashboard: await api.dashboard() });
      const { token, isStaff } = get();
      if (token) {
        await (isStaff ? get().loadPendingReports() : get().loadMyReports());
      }
    } catch (error) {
      set({ error: error instanceof Error ? error.message : '数据加载失败' });
    } finally {
      set({ loading: false });
    }
  },
  demoLogin: async () => {
    const result = await api.demoLogin();
    set({ token: result.access, username: result.username, isStaff: result.is_staff });
    await get().loadMyReports();
  },
  opsLogin: async () => {
    const result = await api.opsLogin();
    set({ token: result.access, username: result.username, isStaff: result.is_staff });
    await get().loadPendingReports();
  },
  logout: () => {
    set({ token: '', username: '', isStaff: false, reports: [], pendingReports: [] });
  },
  loadMyReports: async () => {
    const { token } = get();
    if (!token) return;
    const result = await api.myReports(token);
    set({ reports: result.reports });
  },
  submitReport: async (questionId, issueType, note) => {
    const { token, reports } = get();
    if (!token) {
      throw new Error('请先登录后再提交报错');
    }
    const result = await api.createReport(token, { question_id: questionId, issue_type: issueType, note });
    const rest = reports.filter((item) => item.id !== result.report.id);
    set({ reports: [result.report, ...rest] });
    return result;
  },
  loadPendingReports: async () => {
    const { token } = get();
    if (!token) return;
    const result = await api.pendingReports(token);
    set({ pendingReports: result.reports });
  },
  resolveReport: async (reportId, result, note) => {
    const { token, pendingReports } = get();
    if (!token) {
      throw new Error('请先登录运营账号');
    }
    await api.resolveReport(token, reportId, { result, note });
    set({ pendingReports: pendingReports.filter((item) => item.id !== reportId) });
  }
}));
