"use client"

import { LucideIcon, TrendingUp, ArrowUp } from "lucide-react"

import { Card } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { cn } from "@/lib/utils"

export interface StatCardProps {
  title: string
  value: string | number
  trend?: {
    value: number
    direction?: "up" | "down"
    label?: string
  }
  progress?: number
  accent?: "blue" | "red" | "orange"
  icon: LucideIcon
  className?: string
}

const accentStyles = {
  blue: {
    icon: "text-blue-500",
    border: "hover:border-blue-300",
    progress: "bg-blue-500",
    trendUp: "text-green-600 bg-green-100 dark:bg-green-900/30",
    trendDown: "text-red-600 bg-red-100 dark:bg-red-900/30",
  },
  red: {
    icon: "text-red-500",
    border: "hover:border-red-300",
    progress: "bg-red-500",
    trendUp: "text-red-600 bg-red-100 dark:bg-red-900/30",
    trendDown: "text-green-600 bg-green-100 dark:bg-green-900/30",
  },
  orange: {
    icon: "text-orange-500",
    border: "hover:border-orange-300",
    progress: "bg-orange-500",
    trendUp: "text-green-600 bg-green-100 dark:bg-green-900/30",
    trendDown: "text-red-600 bg-red-100 dark:bg-red-900/30",
  },
} as const

export function StatCard({
  title,
  value,
  trend,
  progress = 0,
  accent = "blue",
  icon: Icon,
  className,
}: StatCardProps) {
  const styles = accentStyles[accent]
  const isPositiveTrend = trend?.direction === "up"
  const trendStyle = trend
    ? isPositiveTrend
      ? styles.trendUp
      : styles.trendDown
    : ""

  return (
    <Card
      className={cn(
        "relative overflow-hidden group transition-colors p-6",
        styles.border,
        className
      )}
    >
      <div
        className={cn(
          "absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity",
          styles.icon
        )}
      >
        <Icon className="h-12 w-12" />
      </div>
      <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
        {title}
      </p>
      <div className="flex items-end mt-2 space-x-2">
        <h3 className="text-3xl font-bold text-foreground">{value}</h3>
        {trend && (
          <span
            className={cn(
              "flex items-center text-sm font-medium px-1.5 py-0.5 rounded mb-1",
              trendStyle
            )}
          >
            {isPositiveTrend ? (
              <TrendingUp className="mr-0.5 h-4 w-4" />
            ) : (
              <ArrowUp className="mr-0.5 h-4 w-4 rotate-180" />
            )}
            {trend.value}%
          </span>
        )}
      </div>
      {progress !== undefined && (
        <div className="mt-4 w-full bg-muted rounded-full h-1.5">
          <div
            className={cn("h-1.5 rounded-full transition-all", styles.progress)}
            style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
          />
        </div>
      )}
    </Card>
  )
}
