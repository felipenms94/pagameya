import { nanoid } from "nanoid"

export function createRequestId(): string {
  return nanoid(12)
}
