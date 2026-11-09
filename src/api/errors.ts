export type ApiErrorKind = 'network' | 'timeout' | 'unauthorized' | 'http';

interface ApiErrorInit {
  kind: ApiErrorKind;
  status?: number;
  serverMessage?: string;
  details?: unknown;
}

/** خطأ موحّد لكل طلبات الـ API */
export class ApiError extends Error {
  kind: ApiErrorKind;
  status?: number;
  /** الرسالة القادمة من الـ Backend (قد تكون بالعربية فقط) */
  serverMessage?: string;
  details?: unknown;

  constructor({ kind, status, serverMessage, details }: ApiErrorInit) {
    super(serverMessage ?? `API error (${kind}${status ? ` ${status}` : ''})`);
    this.name = 'ApiError';
    this.kind = kind;
    this.status = status;
    this.serverMessage = serverMessage;
    this.details = details;
  }
}
