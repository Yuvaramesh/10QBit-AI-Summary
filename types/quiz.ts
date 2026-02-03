export interface QuizRequest {
  patient_id: string | number;
  main_quiz?: {
    updated_at: string;
    answers: Array<{
      question_id: number;
      question_title: string;
      answer_text: string;
    }>;
  };
  order_quiz?: {
    updated_at: string;
    answers: Array<{
      question_id: number;
      question_title: string;
      answer_text: string;
    }>;
  };
  order_history?: {
    total_orders: number;
    orders: Array<{
      order_id: number;
      product: string;
      product_plan: string;
      dosage: string;
      order_created_at: string;
      order_state: string;
    }>;
  };
}

export interface ValidationStatus {
  bmi_check: {
    validated: boolean;
    present_in_summary: boolean;
    calculated_values?: Array<{
      weight_kg: number;
      height_cm: number;
      bmi: number;
      category: string;
      context?: string;
    }>;
    issues?: string[];
  };
  dosage_check: {
    validated: boolean;
    present_in_summary: boolean;
    found_dosages?: string[];
    issues?: string[];
  };
  medicine_check: {
    validated: boolean;
    present_in_summary: boolean;
    found_medications?: string[];
    standardized_names?: string[];
    issues?: string[];
  };
  id_check: {
    validated: boolean;
    present_in_summary: boolean;
    patient_id?: string | number;
    quiz_id?: number;
    uuid?: string;
    order_id?: number;
    issues?: string[];
  };
}

export interface QuizResponse {
  agent: string;
  summary: string;
  structured_summary: Record<string, any>;
  validation_status: ValidationStatus;
  timestamp: string;
}
