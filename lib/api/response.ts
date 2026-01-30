import { getRequestId } from "./requestId"

type SuccessResponse<T> = {
  ok: true
  data: T
  meta: { requestId: string; ts: string }
}

type ErrorResponse = {
  ok: false
  code: string
  message: string
  requestId: string
}

export function ok<T>(data: T): SuccessResponse<T> {
  const requestId = getRequestId()
  return {
    ok: true,
    data,
    meta: { requestId, ts: new Date().toISOString() },
  }
}

export function fail(code: string, message: string): ErrorResponse {
  return { ok: false, code, message, requestId: getRequestId() }
}
