export type ErrorEnvelope = {
  error: {
    code: string;
    message: string;
    details?: any;
  };
  request_id: string;
};

export function isErrorEnvelope(x: unknown): x is ErrorEnvelope {
  if (!x || typeof x !== "object") return false;
  const anyX = x as any;
  if (!anyX.error || typeof anyX.error !== "object") return false;
  if (typeof anyX.error.code !== "string") return false;
  if (typeof anyX.error.message !== "string") return false;
  if (typeof anyX.request_id !== "string") return false;
  return true;
}

export class ApiError extends Error {
  code: string;
  status: number;
  requestId: string;
  details?: unknown;

  constructor(args: { code: string; message: string; status: number; requestId: string; details?: unknown }) {
    super(args.message);
    this.name = "ApiError";
    this.code = args.code;
    this.status = args.status;
    this.requestId = args.requestId;
    this.details = args.details;
  }
}
