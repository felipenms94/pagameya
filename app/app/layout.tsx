/* eslint-disable react-hooks/set-state-in-effect */
"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Sidebar } from "@/components/layout/sidebar"
import { Topbar } from "@/components/layout/topbar"

export default function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const [isMounted, setIsMounted] = useState(false)
  const [authState, setAuthState] = useState<{
    isReady: boolean
    isAuthenticated: boolean
    hasWorkspace: boolean
  }>({ isReady: false, isAuthenticated: false, hasWorkspace: false })

  useEffect(() => {
    setIsMounted(true)
    const checkAuth = async () => {
      try {
        const response = await fetch("/api/auth/me", { cache: "no-store" })
        if (!response.ok) {
          setAuthState({ isReady: true, isAuthenticated: false, hasWorkspace: false })
          router.replace("/login")
          return
        }

        const workspaceId = localStorage.getItem("workspace_id")
        if (!workspaceId) {
          setAuthState({ isReady: true, isAuthenticated: true, hasWorkspace: false })
          router.replace("/select-workspace")
          return
        }

        setAuthState({ isReady: true, isAuthenticated: true, hasWorkspace: true })
      } catch {
        setAuthState({ isReady: true, isAuthenticated: false, hasWorkspace: false })
        router.replace("/login")
      }
    }

    void checkAuth()
  }, [router])

  if (
    !isMounted ||
    !authState.isReady ||
    !authState.isAuthenticated ||
    !authState.hasWorkspace
  ) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-muted border-t-brand" />
      </div>
    )
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Topbar />
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
