const API_BASE_URL = "/api"

type ApiResponse<T> = {
  ok: true
  data: T
  meta: { requestId: string; ts: string }
} | {
  ok: false
  code: string
  message: string
  requestId: string
}

type RequestOptions = {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE"
  body?: unknown
  params?: Record<string, string | number | boolean | undefined>
  headers?: Record<string, string>
  includeWorkspace?: boolean
}

class ApiError extends Error {
  code: string
  requestId?: string

  constructor(code: string, message: string, requestId?: string) {
    super(message)
    this.name = "ApiError"
    this.code = code
    this.requestId = requestId
  }
}

function getWorkspaceId(): string | null {
  if (typeof window === "undefined") return null
  return localStorage.getItem("workspace_id")
}

function redirectToLogin() {
  if (typeof window !== "undefined") {
    window.location.href = "/login"
  }
}

function redirectToSelectWorkspace() {
  if (typeof window !== "undefined") {
    window.location.href = "/select-workspace"
  }
}

async function apiRequest<T>(
  endpoint: string,
  options: RequestOptions = {}
): Promise<T> {
  const {
    method = "GET",
    body,
    params = {},
    headers = {},
    includeWorkspace = true,
  } = options

  // Check for user ID
  // Check for workspace ID if needed
  if (includeWorkspace) {
    const workspaceId = getWorkspaceId()
    if (!workspaceId) {
      redirectToSelectWorkspace()
      throw new ApiError("NO_WORKSPACE", "No workspace selected")
    }
    params.workspaceId = workspaceId
  }

  // Build URL with query params
  const url = new URL(`${API_BASE_URL}${endpoint}`, window.location.origin)
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined) {
      url.searchParams.append(key, String(value))
    }
  })

  // Build headers
  const requestHeaders: Record<string, string> = {
    "Content-Type": "application/json",
    ...headers,
  }

  // Make request (disable Next.js cache to always get fresh data)
  const response = await fetch(url.toString(), {
    method,
    headers: requestHeaders,
    body: body ? JSON.stringify(body) : undefined,
    cache: "no-store",
  })

  const contentType = response.headers.get("content-type") ?? ""
  if (!contentType.includes("application/json")) {
    throw new ApiError(
      "INVALID_RESPONSE",
      `Unexpected content type: ${contentType || "unknown"}`,
      response.headers.get("x-request-id") ?? undefined
    )
  }

  let json: ApiResponse<T>
  try {
    json = await response.json()
  } catch {
    throw new ApiError(
      "INVALID_JSON",
      "Response body is not valid JSON",
      response.headers.get("x-request-id") ?? undefined
    )
  }

  // Handle errors
  if (!json.ok) {
    // Handle unauthorized - redirect to login
    if (json.code === "UNAUTHORIZED") {
      redirectToLogin()
    }

    throw new ApiError(json.code, json.message, json.requestId)
  }

  return json.data
}

// Convenience methods
export const api = {
  get: <T>(endpoint: string, options?: Omit<RequestOptions, "method" | "body">) =>
    apiRequest<T>(endpoint, { ...options, method: "GET" }),

  post: <T>(endpoint: string, body?: unknown, options?: Omit<RequestOptions, "method" | "body">) =>
    apiRequest<T>(endpoint, { ...options, method: "POST", body }),

  put: <T>(endpoint: string, body?: unknown, options?: Omit<RequestOptions, "method" | "body">) =>
    apiRequest<T>(endpoint, { ...options, method: "PUT", body }),

  patch: <T>(endpoint: string, body?: unknown, options?: Omit<RequestOptions, "method" | "body">) =>
    apiRequest<T>(endpoint, { ...options, method: "PATCH", body }),

  delete: <T>(endpoint: string, options?: Omit<RequestOptions, "method" | "body">) =>
    apiRequest<T>(endpoint, { ...options, method: "DELETE" }),
}

export { ApiError, getWorkspaceId }
