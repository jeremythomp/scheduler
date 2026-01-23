"use client"

import { Menu, Calendar, ClipboardList, LogIn } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import Link from "next/link"
import Image from "next/image"
import { useState } from "react"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"

export function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const pathname = usePathname()

  const navItems = [
    {
      title: "Book an Appointment",
      href: "/request",
      icon: Calendar,
    },
    {
      title: "Manage Appointment",
      href: "/manage",
      icon: ClipboardList,
    },
    {
      title: "Staff Login",
      href: "/login",
      icon: LogIn,
    },
  ]

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border bg-white/90 dark:bg-card/90 backdrop-blur-md">
      <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-4 md:px-8">
        <Link href="/" className="flex items-center gap-4 text-foreground hover:opacity-80 transition-opacity">
          <div className="relative size-12 flex items-center justify-center">
            <Image 
              src="/logo.png" 
              alt="Barbados Licensing Authority Logo" 
              width={48} 
              height={48}
              className="object-contain w-full h-full"
              priority
            />
          </div>
          <div>
            <h2 className="text-lg font-bold leading-none tracking-tight">
              Barbados Licensing Authority
            </h2>
            <span className="text-xs font-medium text-muted-foreground">
              Appointment Portal
            </span>
          </div>
        </Link>
        
        <nav className="hidden md:flex flex-1 justify-end gap-8 items-center">
          <Link
            href="/request"
            className="text-sm font-medium hover:text-primary transition-colors"
          >
            Book an Appointment
          </Link>
          <Link
            href="/manage"
            className="text-sm font-medium hover:text-primary transition-colors"
          >
            Manage Appointment
          </Link>
          <Button variant="outline" asChild>
            <Link href="/login">Staff Login</Link>
          </Button>
        </nav>
        
        <button 
          className="md:hidden p-2 text-foreground"
          onClick={() => setMobileMenuOpen(true)}
          aria-label="Open menu"
        >
          <Menu className="h-6 w-6" />
        </button>
      </div>

      {/* Mobile Menu */}
      <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
        <SheetContent side="left" className="w-[280px] sm:w-[320px] overflow-y-auto">
          <SheetHeader className="sr-only">
            <SheetTitle>Navigation Menu</SheetTitle>
            <SheetDescription>Access appointment portal navigation</SheetDescription>
          </SheetHeader>

          <div className="mt-12 px-2">
            <Card className="rounded-2xl p-3 shadow-sm">
              <nav className="space-y-1">
                {navItems.map((item) => {
                  const Icon = item.icon
                  const isActive = pathname === item.href

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setMobileMenuOpen(false)}
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
          </div>
        </SheetContent>
      </Sheet>
    </header>
  )
}

