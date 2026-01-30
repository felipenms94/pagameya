"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"

export default function HomePage() {
  const router = useRouter()

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await fetch("/api/auth/me", { cache: "no-store" })
        if (!response.ok) {
          router.replace("/login")
          return
        }
        const workspaceId = localStorage.getItem("workspace_id")
        if (!workspaceId) {
          router.replace("/select-workspace")
          return
        }
        router.replace("/app/dashboard")
      } catch {
        router.replace("/login")
      }
    }

    void checkAuth()
  }, [router])

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-muted border-t-brand" />
    </div>
  )
}
