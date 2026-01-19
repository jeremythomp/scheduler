"use client"

import { BarChart3, CalendarDays, ClipboardList, LayoutDashboard, Users } from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { Progress } from "@/components/ui/progress"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

interface AdminSidebarProps {
  pendingCount?: number
  todayStats?: {
    today: number
    thisWeek: number
    total: number
  }
  userRole?: string
}

const getNavItems = (userRole?: string) => {
  const items = [
    {
      title: "Appointments",
      href: "/adminDashboard",
      icon: CalendarDays,
    },
    {
      title: "Analytics",
      href: "/adminDashboard/analytics",
      icon: BarChart3,
      disabled: true,
    },
  ]

  // Only show Users for admin role
  if (userRole === "admin") {
    items.push({
      title: "Users",
      href: "/adminDashboard/users",
      icon: Users,
    })
  }

  return items
}

export function AdminSidebar({ pendingCount = 0, todayStats, userRole }: AdminSidebarProps) {
  const pathname = usePathname()
  const navItems = getNavItems(userRole)

  const stats = todayStats || {
    today: 0,
    thisWeek: 0,
    total: 0,
  }

  return (
    <aside className="lg:col-span-3 space-y-6">
      {/* Navigation Card */}
      <Card className="hidden lg:block rounded-3xl p-4 shadow-sm">
        <nav className="space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon
            const isActive = pathname === item.href
            const isDisabled = item.disabled
            
            if (isDisabled) {
              return (
                <div
                  key={item.href}
                  className={cn(
                    "flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-2xl",
                    "text-muted-foreground opacity-50 cursor-not-allowed pointer-events-none"
                  )}
                >
                  <Icon className="h-5 w-5" />
                  {item.title}
                </div>
              )
            }
            
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-2xl transition-colors",
                  isActive
                    ? "bg-foreground text-primary-foreground font-bold"
                    : "text-muted-foreground hover:bg-muted"
                )}
              >
                <Icon className={cn("h-5 w-5", isActive && "fill-current")} />
                {item.title}
              </Link>
            )
          })}
        </nav>
      </Card>

      {/* Appointments Overview Card */}
      <div className="bg-primary/5 dark:bg-primary/10 rounded-3xl p-6 ring-1 ring-primary/10">
        <h3 className="text-sm font-bold mb-4 flex items-center gap-2">
          <CalendarDays className="h-4 w-4 text-primary" />
          Appointments Overview
        </h3>
        <div className="space-y-3">
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs uppercase font-bold text-muted-foreground">
                Today
              </span>
              <span className="text-2xl font-bold text-primary">
                {stats.today}
              </span>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs uppercase font-bold text-muted-foreground">
                This Week
              </span>
              <span className="text-2xl font-bold text-blue-600">
                {stats.thisWeek}
              </span>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs uppercase font-bold text-muted-foreground">
                This Month
              </span>
              <span className="text-2xl font-bold text-foreground">
                {stats.total}
              </span>
            </div>
          </Card>
        </div>
      </div>
    </aside>
  )
}

