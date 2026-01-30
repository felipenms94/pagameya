import { NextResponse } from "next/server"

import { ERROR_CODES } from "@/lib/api/errors"
import { fail } from "@/lib/api/response"
import { createRequestId, runWithRequestId } from "@/lib/api/requestId"

export type ApiError = Error & {
  code?: string
  status?: number
  details?: unknown
}

export function apiError(
  code: string,
  message: string,
  status?: number,
  details?: unknown
): ApiError {
  const error = new Error(message) as ApiError
  error.code = code
  if (status) {
    error.status = status
  }
  if (details !== undefined) {
    error.details = details
  }
  return error
}

function statusForCode(code?: string) {
  switch (code) {
    case ERROR_CODES.UNAUTHORIZED:
      return 401
    case ERROR_CODES.FORBIDDEN:
      return 403
    case ERROR_CODES.NOT_FOUND:
      return 404
    case ERROR_CODES.CONFLICT:
      return 409
    case ERROR_CODES.VALIDATION_ERROR:
      return 400
    default:
      return 500
  }
}

export function withApiHandler<TContext = unknown>(
  handler: (request: Request, context: TContext) => Promise<Response>
) {
  return async (request: Request, context: TContext) => {
    const requestId = createRequestId()
    return runWithRequestId(requestId, async () => {
      try {
        const response = await handler(request, context)
        response.headers.set("x-request-id", requestId)
        console.info(
          `[request] ${requestId} ${request.method} ${request.url} ${response.status}`
        )
        return response
      } catch (error) {
        const appError = error as ApiError
        const code = appError.code ?? ERROR_CODES.INTERNAL_ERROR
        const status = appError.status ?? statusForCode(code)
        const message = appError.message || "Unexpected error"
        const body = fail(code, message)
        const response = NextResponse.json(body, { status })
        response.headers.set("x-request-id", requestId)
        console.error(
          `[request] ${requestId} ${request.method} ${request.url} ${status} ${code} ${message}`
        )
        return response
      }
    })
  }
}
