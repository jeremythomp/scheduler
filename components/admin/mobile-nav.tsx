"use client"

import { CalendarDays, ClipboardList, LayoutDashboard, LogOut } from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"

interface MobileNavProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  pendingCount?: number
  userName?: string
  userEmail?: string
  userRole?: string
}

const navItems = [
  {
    title: "Overview",
    href: "/adminDashboard",
    icon: LayoutDashboard,
  },
  {
    title: "Approvals",
    href: "/adminDashboard/approvals",
    icon: ClipboardList,
    badge: true,
  },
  {
    title: "Schedule",
    href: "/adminDashboard/schedule",
    icon: CalendarDays,
  },
]

export function MobileNav({ open, onOpenChange, pendingCount = 0, userName, userEmail, userRole }: MobileNavProps) {
  const pathname = usePathname()
  
  const initials = userName
    ?.split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2) || "U"

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="left" className="w-[280px] sm:w-[320px] overflow-y-auto">
        <SheetHeader className="sr-only">
          <SheetTitle>Navigation Menu</SheetTitle>
          <SheetDescription>Access dashboard navigation</SheetDescription>
        </SheetHeader>

        <div className="mt-12 px-2 space-y-4">
          {/* User Info */}
          {(userName || userEmail) && (
            <Card className="rounded-2xl p-4 shadow-sm">
              <div className="flex items-center gap-3">
                <Avatar className="h-10 w-10">
                  <AvatarFallback className="bg-primary text-primary-foreground font-bold text-sm">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-sm leading-none truncate">{userName || userEmail}</p>
                  <p className="text-xs text-muted-foreground leading-none mt-1">
                    {userRole || "Staff"}
                  </p>
                </div>
              </div>
            </Card>
          )}

          {/* Navigation */}
          <Card className="rounded-2xl p-3 shadow-sm">
            <nav className="space-y-1">
              {navItems.map((item) => {
                const Icon = item.icon
                const isActive = pathname === item.href

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => onOpenChange(false)}
                    className={cn(
                      "flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-2xl transition-colors",
                      isActive
                        ? "bg-foreground text-primary-foreground font-bold"
                        : "text-muted-foreground hover:bg-muted"
                    )}
                  >
                    <Icon className={cn("h-5 w-5", isActive && "fill-current")} />
                    {item.title}
                    {item.badge && pendingCount > 0 && (
                      <Badge className="ml-auto bg-primary text-primary-foreground text-[10px] font-bold px-2 py-0.5">
                        {pendingCount}
                      </Badge>
                    )}
                  </Link>
                )
              })}
            </nav>
          </Card>

          {/* Logout */}
          <Card className="rounded-2xl p-3 shadow-sm">
            <form action="/api/auth/signout" method="POST" className="w-full">
              <Button
                type="submit"
                variant="ghost"
                className="w-full justify-start gap-3 px-4 py-3 text-sm font-medium text-muted-foreground hover:bg-muted rounded-2xl"
              >
                <LogOut className="h-5 w-5" />
                Sign Out
              </Button>
            </form>
          </Card>
        </div>
      </SheetContent>
    </Sheet>
  )
}

