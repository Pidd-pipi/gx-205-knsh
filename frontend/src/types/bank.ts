export interface Category {
  id: number;
  name: string;
  accuracy: number;
  total: number;
}

export type IssueType = 'stem' | 'answer' | 'explanation' | 'other';
export type ReportStatusValue = 'pending' | 'resolved' | 'rejected';

export interface QuestionReportStatus {
  code: string;
  issueType: IssueType;
  issueTypeLabel: string;
  status: ReportStatusValue;
  statusLabel: string;
  handlingNote: string;
  createdAt: string;
  handledAt: string | null;
}

export interface AdminQuestionReport extends QuestionReportStatus {
  id: number;
  questionId: number;
  detail: string;
  reporter: string;
  handledBy: string | null;
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
  reportStatus: QuestionReportStatus | null;
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
