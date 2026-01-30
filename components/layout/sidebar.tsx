"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useState } from "react"
import {
  LayoutDashboard,
  Users,
  Receipt,
  CalendarCheck,
  Download,
  LogOut,
  Settings,
  CreditCard,
  ChevronDown,
  ChevronRight,
  Mail,
  UsersRound,
  BellRing,
  FileText,
  History,
  Settings2,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"

type NavItem = {
  title: string
  href?: string
  icon?: React.ElementType
  children?: Array<{ title: string; href: string; icon: React.ElementType }>
}

const navItems: NavItem[] = [
  {
    title: "Dashboard",
    href: "/app/dashboard",
    icon: LayoutDashboard,
  },
  {
    title: "Personas",
    href: "/app/personas",
    icon: Users,
  },
  {
    title: "Deudas",
    href: "/app/deudas",
    icon: Receipt,
  },
  {
    title: "Cobrar Hoy",
    href: "/app/cobrar-hoy",
    icon: CalendarCheck,
  },
  {
    title: "Recordatorios",
    href: "/app/recordatorios",
    icon: BellRing,
  },
  {
    title: "Exportar",
    href: "/app/exportar",
    icon: Download,
  },
  {
    title: "Invitaciones",
    href: "/app/invitaciones",
    icon: Mail,
  },
  {
    title: "Configuracion",
    icon: Settings,
    children: [
      {
        title: "Pagos",
        href: "/app/configuracion/pagos",
        icon: CreditCard,
      },
      {
        title: "Equipo",
        href: "/app/configuracion/equipo",
        icon: UsersRound,
      },
      {
        title: "Plantillas",
        href: "/app/configuracion/plantillas",
        icon: FileText,
      },
      {
        title: "Emails",
        href: "/app/configuracion/emails",
        icon: Settings2,
      },
      {
        title: "Historial Emails",
        href: "/app/configuracion/email-logs",
        icon: History,
      },
    ],
  },
]

export function Sidebar() {
  const pathname = usePathname()
  const [isConfigOpen, setIsConfigOpen] = useState(true)

  const handleLogout = async () => {
    localStorage.removeItem("workspace_id")
    localStorage.removeItem("workspace_name")
    localStorage.removeItem("workspace_mode")
    try {
      await fetch("/api/auth/logout", { method: "POST" })
    } finally {
      window.location.href = "/login"
    }
  }

  return (
    <aside className="flex h-screen w-16 flex-col items-center border-r border-border bg-card py-4 lg:w-64">
      {/* Logo */}
      <div className="flex h-12 items-center justify-center px-4">
        <Link href="/app/dashboard" className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand text-brand-foreground font-bold text-sm">
            P
          </div>
          <span className="hidden text-lg font-semibold lg:block">
            PagameYA
          </span>
        </Link>
      </div>

      <Separator className="my-4" />

      {/* Navigation */}
      <nav className="flex flex-1 flex-col gap-1 px-2 w-full">
        {navItems.map((item) => {
          if (item.children && item.icon) {
            const GroupIcon = item.icon
            const isOpen = item.title === "Configuracion" ? isConfigOpen : true
            const ToggleIcon = isOpen ? ChevronDown : ChevronRight
            return (
              <div key={item.title} className="mt-2">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      onClick={() =>
                        setIsConfigOpen((prev) =>
                          item.title === "Configuracion" ? !prev : prev
                        )
                      }
                      className="flex w-full items-center justify-between gap-3 px-3 py-2 text-xs font-semibold uppercase text-muted-foreground"
                    >
                      <span className="flex items-center gap-3">
                        <GroupIcon className="h-4 w-4" />
                        <span className="hidden lg:block">{item.title}</span>
                      </span>
                      <ToggleIcon className="h-4 w-4 hidden lg:block" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="right" className="lg:hidden">
                    {item.title}
                  </TooltipContent>
                </Tooltip>
                {isOpen && (
                  <div className="flex flex-col gap-1">
                    {item.children.map((child) => {
                      const isActive =
                        pathname === child.href ||
                        pathname.startsWith(child.href + "/")
                      const Icon = child.icon
                      return (
                        <Tooltip key={child.href}>
                          <TooltipTrigger asChild>
                            <Link
                              href={child.href}
                              className={cn(
                                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                                isActive
                                  ? "bg-accent text-accent-foreground"
                                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                              )}
                            >
                              <Icon className="h-5 w-5 shrink-0" />
                              <span className="hidden lg:block">{child.title}</span>
                            </Link>
                          </TooltipTrigger>
                          <TooltipContent side="right" className="lg:hidden">
                            {child.title}
                          </TooltipContent>
                        </Tooltip>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          }

          const isActive =
            item.href && (pathname === item.href || pathname.startsWith(item.href + "/"))
          const Icon = item.icon

          return (
            <Tooltip key={item.href}>
              <TooltipTrigger asChild>
                <Link
                  href={item.href ?? "/app/dashboard"}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-accent text-accent-foreground"
                      : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                  )}
                >
                  {Icon && <Icon className="h-5 w-5 shrink-0" />}
                  <span className="hidden lg:block">{item.title}</span>
                </Link>
              </TooltipTrigger>
              <TooltipContent side="right" className="lg:hidden">
                {item.title}
              </TooltipContent>
            </Tooltip>
          )
        })}
      </nav>

      <Separator className="my-4" />

      {/* Logout */}
      <div className="px-2 w-full">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              className="w-full justify-start gap-3 text-muted-foreground hover:text-destructive"
              onClick={handleLogout}
            >
              <LogOut className="h-5 w-5 shrink-0" />
              <span className="hidden lg:block">Salir</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent side="right" className="lg:hidden">
            Salir
          </TooltipContent>
        </Tooltip>
      </div>
    </aside>
  )
}
