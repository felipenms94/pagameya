import { AsyncLocalStorage } from "async_hooks"
import { nanoid } from "nanoid"

const requestIdStorage = new AsyncLocalStorage<string>()

export function createRequestId(): string {
  return nanoid(12)
}

export function runWithRequestId<T>(requestId: string, fn: () => T): T {
  return requestIdStorage.run(requestId, fn)
}

export function getRequestId(): string {
  return requestIdStorage.getStore() ?? createRequestId()
}
