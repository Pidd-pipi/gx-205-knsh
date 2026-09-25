export interface Category {
  id: number;
  name: string;
  accuracy: number;
  total: number;
}

export interface Question {
  id: number;
  type: string;
  difficulty: string;
  stem: string;
  options: string[];
  answer: string;
  explanation: string;
  knowledge: string;
}

export interface Ranking {
  rank: number;
  name: string;
  tier: string;
  score: number;
  accuracy: number;
}

export interface WrongBookItem {
  id: number;
  title: string;
  type: string;
  mistakes: number;
  lastPracticed: string;
}

export interface Dashboard {
  profile: {
    nickname: string;
    tier: string;
    totalAnswered: number;
    correctRate: number;
    streakDays: number;
    practiceMinutes: number;
  };
  categories: Category[];
  paper: Question[];
  wrongBook: WrongBookItem[];
  rankings: Ranking[];
  radar: { axis: string; value: number }[];
}

export type ReportStatus = 'pending' | 'fixed' | 'nochange';

export interface QuestionReport {
  id: number;
  question_id: number;
  question_stem: string;
  issue_type: string;
  issue_type_label: string;
  note: string;
  status: ReportStatus;
  status_label: string;
  resolution_note: string;
  username: string;
  created_at: string;
  resolved_at: string | null;
}

export interface LoginResult {
  access: string;
  refresh: string;
  username: string;
  is_staff: boolean;
}
