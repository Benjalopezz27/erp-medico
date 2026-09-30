export interface ApiFieldError {
  field: string;
  constraints: string[];
}

export interface ApiErrorResponse {
  statusCode: number;
  message: string | string[];
  error: string;
  code?: string;
  details?: ApiFieldError[] | unknown;
  requestId: string;
  timestamp: string;
  path: string;
}
