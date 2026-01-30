import { createRequestId } from "./requestId"

type SuccessResponse<T> = {
  ok: true
  data: T
  meta: { requestId: string; ts: string }
}

type ErrorResponse = {
  ok: false
  error: { code: string; message: string; details?: unknown }
  meta: { requestId: string; ts: string }
}

export function ok<T>(data: T): SuccessResponse<T> {
  return {
    ok: true,
    data,
    meta: { requestId: createRequestId(), ts: new Date().toISOString() },
  }
}

export function fail(
  code: string,
  message: string,
  details?: unknown
): ErrorResponse {
  return {
    ok: false,
    error: details ? { code, message, details } : { code, message },
    meta: { requestId: createRequestId(), ts: new Date().toISOString() },
  }
}
