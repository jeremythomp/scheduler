"use client"

import { Menu } from "lucide-react"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import Image from "next/image"

export function Header() {
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
          <Button variant="outline" asChild>
            <Link href="/login">Staff Login</Link>
          </Button>
        </nav>
        
        <button className="md:hidden p-2 text-foreground">
          <Menu className="h-6 w-6" />
        </button>
      </div>
    </header>
  )
}

