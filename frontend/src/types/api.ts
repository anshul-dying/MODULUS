// API Request and Response Types

export interface TrainingJob {
  job_id: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  dataset_name: string;
  algorithm: string;
  target_column: string;
  task_type: string;
  accuracy?: number;
  error?: string;
  created_at: string;
}

export interface Dataset {
  name: string;
  size: number;
  rows: number;
  columns: number;
  upload_date: number;
  file_type?: string;
}

export interface TrainingRequest {
  dataset_name: string;
  target_column: string;
  task_type: 'classification' | 'regression';
  algorithm: string;
  test_size?: number;
  random_state?: number;
  exclude_columns?: string[];
  ohe_columns?: string[];
  scale_columns?: string[];
  null_handling?: string;
  null_fill_value?: string | number;
  separator?: string;
  preprocessing?: {
    exclude_columns?: string[];
    ohe_columns?: string[];
    scale_columns?: string[];
    null_handling?: string;
    null_fill_value?: string;
  };
}

export interface ExportRequest {
  job_id: string;
  format?: string;
}

export interface PreprocessingRequest {
  dataset_name: string;
  preprocessing_options?: Record<string, unknown>;
  ai_analysis?: boolean;
  selected_suggestions?: unknown[];
  separator?: string;
}

export interface ImageTrainingRequest {
  dataset_name: string;
  task_type: string;
  model_name?: string;
  epochs?: number;
  batch_size?: number;
  learning_rate?: number;
  [key: string]: unknown;
}

export interface AIAnalysisResponse {
  dataset_name: string;
  separator?: string;
  analysis?: {
    ai_analysis?: {
      target_suggestions?: Array<{
        column: string;
        task_type: string;
        algorithms: string[];
        reasoning?: string;
      }>;
      preprocessing_suggestions?: string[];
      dataset_type?: string;
      data_quality_score?: number;
      business_context?: string;
    };
  };
  status?: string;
}

export interface AxiosErrorResponse {
  response?: {
    data?: {
      detail?: string;
    };
  };
  message?: string;
}

