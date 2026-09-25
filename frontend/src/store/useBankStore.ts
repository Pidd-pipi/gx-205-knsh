import { create } from 'zustand';
import { api } from '@/api/client';
import type { Dashboard, Question, QuestionReportStatus } from '@/types/bank';

const TOKEN_KEY = 'gx_logic_token';

interface BankState {
  loading: boolean;
  error: string;
  dashboard: Dashboard | null;
  token: string;
  loadDashboard: () => Promise<void>;
  demoLogin: () => Promise<void>;
  logout: () => void;
  /** 用某道题的最新报错状态就地更新试卷，保证卡片即时反映处理中/处理结果 */
  patchQuestionReport: (questionId: number, reportStatus: QuestionReportStatus) => void;
  replacePaper: (paper: Question[]) => void;
}

function readToken(): string {
  try {
    return localStorage.getItem(TOKEN_KEY) ?? '';
  } catch {
    return '';
  }
}

export const useBankStore = create<BankState>((set, get) => ({
  loading: false,
  error: '',
  dashboard: null,
  token: readToken(),
  loadDashboard: async () => {
    set({ loading: true, error: '' });
    try {
      set({ dashboard: await api.dashboard(get().token || null) });
    } catch (error) {
      set({ error: error instanceof Error ? error.message : '数据加载失败' });
    } finally {
      set({ loading: false });
    }
  },
  demoLogin: async () => {
    const result = await api.demoLogin();
    try {
      localStorage.setItem(TOKEN_KEY, result.access);
    } catch {
      /* 隐私模式等场景下忽略持久化失败 */
    }
    set({ token: result.access });
    await get().loadDashboard();
  },
  logout: () => {
    try {
      localStorage.removeItem(TOKEN_KEY);
    } catch {
      /* ignore */
    }
    set({ token: '' });
    void get().loadDashboard();
  },
  patchQuestionReport: (questionId, reportStatus) => {
    const dashboard = get().dashboard;
    if (!dashboard) {
      return;
    }
    set({
      dashboard: {
        ...dashboard,
        paper: dashboard.paper.map((question) =>
          question.id === questionId ? { ...question, reportStatus } : question
        )
      }
    });
  },
  replacePaper: (paper) => {
    const dashboard = get().dashboard;
    if (dashboard) {
      set({ dashboard: { ...dashboard, paper } });
    }
  }
}));
