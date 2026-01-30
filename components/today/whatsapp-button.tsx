"use client"

import { MessageCircle, ChevronDown, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useWhatsappLink } from "@/hooks"
import type { WhatsappTone } from "@/lib/types"

type WhatsappButtonProps = {
  personId: string
  debtId: string
  hasPhone: boolean
  variant?: "simple" | "dropdown"
  defaultTone?: WhatsappTone
}

const toneLabels: Record<WhatsappTone, string> = {
  soft: "Suave",
  normal: "Normal",
  fuerte: "Fuerte",
}

export function WhatsappButton({
  personId,
  debtId,
  hasPhone,
  variant = "simple",
  defaultTone = "soft",
}: WhatsappButtonProps) {
  const { mutate, isPending } = useWhatsappLink()

  const handleClick = (tone: WhatsappTone) => {
    mutate({ personId, debtId, tone })
  }

  if (!hasPhone) {
    return (
      <Button variant="ghost" size="sm" disabled className="text-muted-foreground">
        <MessageCircle className="h-4 w-4" />
        <span className="hidden sm:inline ml-1">Sin tel.</span>
      </Button>
    )
  }

  if (variant === "simple") {
    return (
      <Button
        variant="outline"
        size="sm"
        onClick={() => handleClick(defaultTone)}
        disabled={isPending}
        className="text-green-600 hover:text-green-700 hover:bg-green-50"
      >
        {isPending ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <MessageCircle className="h-4 w-4" />
        )}
        <span className="hidden sm:inline ml-1">WhatsApp</span>
      </Button>
    )
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          disabled={isPending}
          className="text-green-600 hover:text-green-700 hover:bg-green-50"
        >
          {isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <MessageCircle className="h-4 w-4" />
          )}
          <span className="hidden sm:inline ml-1">WhatsApp</span>
          <ChevronDown className="h-3 w-3 ml-1" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {(Object.keys(toneLabels) as WhatsappTone[]).map((tone) => (
          <DropdownMenuItem key={tone} onClick={() => handleClick(tone)}>
            {toneLabels[tone]}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
