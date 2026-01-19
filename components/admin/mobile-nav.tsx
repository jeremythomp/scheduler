"use client"

import { CalendarDays, ClipboardList, LayoutDashboard } from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
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

export function MobileNav({ open, onOpenChange, pendingCount = 0 }: MobileNavProps) {
  const pathname = usePathname()

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="left" className="w-[280px] sm:w-[320px] overflow-y-auto">
        <SheetHeader className="sr-only">
          <SheetTitle>Navigation Menu</SheetTitle>
          <SheetDescription>Access dashboard navigation</SheetDescription>
        </SheetHeader>

        <div className="mt-12 px-2">
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
        </div>
      </SheetContent>
    </Sheet>
  )
}

