"use client"

import { useState, useMemo } from "react"
import { Calendar as CalendarIcon, Filter, Download, FileDown } from "lucide-react"
import { format, subDays, startOfYear, endOfYear } from "date-fns"
import type { DateRange } from "react-day-picker"

import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Separator } from "@/components/ui/separator"
import { Calendar } from "@/components/ui/calendar"
import { cn } from "@/lib/utils"

const PRESET_YEARS = [2026, 2025, 2024] as const

function getPresetRanges(now: Date) {
  return [
    ...PRESET_YEARS.map((year) => ({
      id: `year-${year}` as const,
      label: String(year),
      getRange: (): DateRange => ({
        from: startOfYear(new Date(year, 0, 1)),
        to: endOfYear(new Date(year, 11, 31)),
      }),
    })),
    {
      id: "ytd" as const,
      label: "Year to Date",
      getRange: (): DateRange => ({
        from: startOfYear(now),
        to: now,
      }),
    },
    {
      id: "last30" as const,
      label: "Last 30 Days",
      getRange: (): DateRange => ({
        from: subDays(now, 30),
        to: now,
      }),
    },
    {
      id: "last90" as const,
      label: "Last 90 Days",
      getRange: (): DateRange => ({
        from: subDays(now, 90),
        to: now,
      }),
    },
    {
      id: "last6m" as const,
      label: "Last 6 Months",
      getRange: (): DateRange => ({
        from: subDays(now, 30 * 6),
        to: now,
      }),
    },
    {
      id: "last12m" as const,
      label: "Last 12 Months",
      getRange: (): DateRange => ({
        from: subDays(now, 365),
        to: now,
      }),
    },
  ]
}

function toStartOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate())
}

function rangesEqual(a: DateRange | undefined, b: DateRange | undefined): boolean {
  if (!a?.from || !b?.from) return false
  const aFrom = toStartOfDay(a.from)
  const bFrom = toStartOfDay(b.from)
  const aTo = toStartOfDay(a.to ?? a.from)
  const bTo = toStartOfDay(b.to ?? b.from)
  return aFrom.getTime() === bFrom.getTime() && aTo.getTime() === bTo.getTime()
}

const SERVICE_OPTIONS = [
  { value: "all", label: "All Services" },
  { value: "Vehicle Inspection", label: "Inspection" },
  { value: "Vehicle Weighing", label: "Weighing" },
  { value: "Vehicle Registration/Customer Service Center", label: "Registration" },
] as const

export interface AnalyticsHeaderProps {
  serviceFilter: string
  onServiceFilterChange: (value: string) => void
  dateRange: DateRange | undefined
  onDateRangeChange: (range: DateRange | undefined) => void
  onExportCSV?: () => void
  onExportPDF?: () => void
}

export function AnalyticsHeader({
  serviceFilter,
  onServiceFilterChange,
  dateRange,
  onDateRangeChange,
  onExportCSV,
  onExportPDF,
}: AnalyticsHeaderProps) {
  const [calendarOpen, setCalendarOpen] = useState(false)
  const now = useMemo(() => new Date(), [])
  const presets = useMemo(() => getPresetRanges(now), [now])

  const activePresetId = useMemo(() => {
    if (!dateRange?.from) return null
    for (const preset of presets) {
      const presetRange = preset.getRange()
      if (rangesEqual(dateRange, presetRange)) return preset.id
    }
    return null
  }, [dateRange, presets])

  const formatDateRange = () => {
    if (!dateRange?.from) return "Custom Range"
    if (dateRange.to && dateRange.from.getTime() !== dateRange.to.getTime()) {
      return `${format(dateRange.from, "MMM d, yyyy")} - ${format(dateRange.to, "MMM d, yyyy")}`
    }
    return format(dateRange.from, "MMM d, yyyy")
  }

  return (
    <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
      <div>
        <h2 className="text-2xl font-bold text-foreground">Service Analytics</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Track trends for inspections, weighings, and registrations.
        </p>
      </div>
      <div className="flex flex-col md:flex-row gap-3 items-start xl:items-center">
        <div className="flex flex-col sm:flex-row gap-3">
          <Select value={serviceFilter} onValueChange={onServiceFilterChange}>
            <SelectTrigger
              className={cn(
                "w-[180px] bg-muted/80 border-muted-foreground/20",
                "flex items-center gap-2"
              )}
            >
              <Filter className="h-4 w-4 shrink-0 text-muted-foreground" />
              <SelectValue placeholder="All Services" />
            </SelectTrigger>
            <SelectContent>
              {SERVICE_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "min-w-[200px] justify-start text-left font-normal",
                  "bg-muted/80 border-muted-foreground/20"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {formatDateRange()}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <div className="flex">
                <div className="flex flex-col gap-0.5 p-2 border-r border-border">
                  {presets.map((preset) => {
                    const isActive = activePresetId === preset.id
                    return (
                      <Button
                        key={preset.id}
                        variant={isActive ? "secondary" : "ghost"}
                        size="sm"
                        className={cn(
                          "justify-start font-normal w-full",
                          isActive && "bg-accent text-accent-foreground"
                        )}
                        onClick={() => {
                          onDateRangeChange(preset.getRange())
                          setCalendarOpen(false)
                        }}
                      >
                        {preset.label}
                      </Button>
                    )
                  })}
                </div>
                <Separator orientation="vertical" />
                <Calendar
                  mode="range"
                  captionLayout="dropdown"
                  defaultMonth={dateRange?.from}
                  selected={dateRange}
                  onSelect={(range) => {
                    onDateRangeChange(range)
                    if (range?.from && range?.to && range.from.getTime() !== range.to.getTime()) setCalendarOpen(false)
                  }}
                  numberOfMonths={2}
                  startMonth={new Date(2024, 0)}
                  endMonth={new Date(2030, 11)}
                />
              </div>
            </PopoverContent>
          </Popover>
        </div>

        <div className="flex flex-row gap-3">
          <Button
            variant="secondary"
            size="default"
            className="gap-2"
            onClick={onExportCSV}
          >
            <Download className="h-4 w-4" />
            CSV
          </Button>
          <Button
            variant="default"
            size="default"
            className="gap-2 bg-primary hover:bg-primary/90"
            onClick={onExportPDF}
          >
            <FileDown className="h-4 w-4" />
            PDF
          </Button>
        </div>
      </div>
    </div>
  )
}
