"use client"

import { X, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import type { TagSummary } from "@/lib/types"

type TagBadgeProps = {
  tag: TagSummary
  onRemove?: () => void
  removable?: boolean
  loading?: boolean
  size?: "sm" | "default"
}

export function TagBadge({
  tag,
  onRemove,
  removable = false,
  loading = false,
  size = "default",
}: TagBadgeProps) {
  const bgColor = tag.color || "#6b7280"

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full font-medium text-white",
        size === "sm" ? "px-2 py-0.5 text-xs" : "px-2.5 py-0.5 text-xs",
        loading && "opacity-70"
      )}
      style={{ backgroundColor: bgColor }}
    >
      {tag.name}
      {removable && onRemove && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            if (!loading) onRemove()
          }}
          disabled={loading}
          className="ml-0.5 rounded-full p-0.5 hover:bg-white/20 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <X className="h-3 w-3" />
          )}
        </button>
      )}
    </span>
  )
}
