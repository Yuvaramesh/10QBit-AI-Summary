export interface QuizRequest {
  patient_id: string;
  quiz_id: number;
  uuid: string;
  order_id: number;
  session_answers: string[] | Record<string, any>[];
  callback_url?: string;
}

export interface QuizSummary {
  summary_text: string;
  structured_summary: Record<string, any>;
}

export interface QuizResponse {
  agent: string;
  summary: string;
  structured_summary: Record<string, any>;
  timestamp: string;
}
