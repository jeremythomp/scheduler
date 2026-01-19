"use client"

import { useState } from "react"
import { LogOut, Menu } from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { MobileNav } from "./mobile-nav"

interface AdminHeaderProps {
  userName?: string
  userEmail?: string
  userRole?: string
  pendingCount?: number
  todayStats?: {
    processed: number
    total: number
    approved: number
    rejected: number
  }
}

export function AdminHeader({ userName, userEmail, userRole, pendingCount, todayStats }: AdminHeaderProps) {
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  
  const initials = userName
    ?.split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2) || "U"

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border bg-white/90 dark:bg-card/90 backdrop-blur-md">
      <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-4 md:px-8">
        <div className="flex items-center gap-4 text-foreground">
          <Link href="/adminDashboard" className="relative size-12 flex items-center justify-center">
            <Image
              src="/logo.png"
              alt="Barbados Licensing Authority Logo"
              width={48}
              height={48}
              className="object-contain w-full h-full"
              priority
            />
          </Link>
          <div>
            <h2 className="text-lg font-bold leading-none tracking-tight">
              Barbados Licensing Authority
            </h2>
            <span className="text-xs font-medium text-muted-foreground">
              Staff Dashboard
            </span>
          </div>
        </div>

        <nav className="hidden md:flex flex-1 justify-end gap-6 items-center">
          <div className="flex items-center gap-4 bg-muted/50 rounded-full px-4 py-2 border border-border">
            <Avatar className="h-8 w-8">
              <AvatarFallback className="bg-primary text-primary-foreground font-bold text-xs">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="text-sm">
              <p className="font-bold leading-none">{userName || userEmail}</p>
              <p className="text-[10px] text-muted-foreground leading-none mt-0.5">
                {userRole || "Staff"}
              </p>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 ml-2">
                  <LogOut className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Account</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <form action="/api/auth/signout" method="POST" className="w-full">
                    <button type="submit" className="w-full text-left">
                      Sign Out
                    </button>
                  </form>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </nav>

        <Button
          variant="ghost"
          size="icon"
          className="md:hidden"
          onClick={() => setMobileNavOpen(true)}
        >
          <Menu className="h-6 w-6" />
        </Button>
      </div>

      <MobileNav
        open={mobileNavOpen}
        onOpenChange={setMobileNavOpen}
        pendingCount={pendingCount}
      />
    </header>
  )
}

