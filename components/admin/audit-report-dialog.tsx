"use client"

import { useState, useTransition, useCallback } from "react"
import { format } from "date-fns"
import type { DateRange } from "react-day-picker"
import {
  ClipboardList,
  Calendar as CalendarIcon,
  Download,
  Search,
  Loader2,
} from "lucide-react"

import { getAuditLogs, type AuditLogRow } from "@/app/(staff)/actions"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { cn } from "@/lib/utils"

// ─── Action badge config ──────────────────────────────────────────────────────

const ACTION_CONFIG: Record<
  string,
  { label: string; className: string }
> = {
  appointment_approved: {
    label: "Approved",
    className:
      "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-200",
  },
  appointment_denied: {
    label: "Denied",
    className:
      "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200",
  },
  appointment_checked_in: {
    label: "Checked In",
    className:
      "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-200",
  },
  appointment_no_show: {
    label: "No Show",
    className:
      "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200",
  },
  booking_shifted: {
    label: "Time Shifted",
    className:
      "bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-200",
  },
  booking_rescheduled: {
    label: "Rescheduled",
    className:
      "bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-200",
  },
  day_blocked: {
    label: "Day Blocked",
    className:
      "bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-200",
  },
  user_created: {
    label: "User Created",
    className:
      "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-200",
  },
  user_updated: {
    label: "User Updated",
    className:
      "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-200",
  },
  user_deleted: {
    label: "User Deleted",
    className:
      "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200",
  },
  password_changed: {
    label: "Password Changed",
    className:
      "bg-muted text-muted-foreground",
  },
}

// ─── Human-readable detail summaries ─────────────────────────────────────────

function buildDetails(action: string, metadata: Record<string, unknown> | null): string {
  if (!metadata) return "—"
  const m = metadata

  switch (action) {
    case "appointment_approved":
    case "appointment_denied":
      return [
        m.referenceNumber ? `Ref #${m.referenceNumber}` : null,
        m.customerName ? `Customer: ${m.customerName}` : null,
        m.staffNotes ? `Notes: ${m.staffNotes}` : null,
      ]
        .filter(Boolean)
        .join(" · ")

    case "appointment_checked_in":
    case "appointment_no_show":
      return [
        m.referenceNumber ? `Ref #${m.referenceNumber}` : null,
        m.customerName ? `Customer: ${m.customerName}` : null,
      ]
        .filter(Boolean)
        .join(" · ")

    case "booking_shifted":
      return [
        m.referenceNumber ? `Ref #${m.referenceNumber}` : null,
        m.serviceName ? String(m.serviceName) : null,
        m.oldTime && m.newTime ? `${m.oldTime} → ${m.newTime}` : null,
        m.date ? String(m.date) : null,
      ]
        .filter(Boolean)
        .join(" · ")

    case "booking_rescheduled":
      return [
        m.referenceNumber ? `Ref #${m.referenceNumber}` : null,
        m.serviceName ? String(m.serviceName) : null,
        m.oldDate && m.newDate ? `${m.oldDate} → ${m.newDate}` : null,
        m.oldTime && m.newTime ? `${m.oldTime} → ${m.newTime}` : null,
      ]
        .filter(Boolean)
        .join(" · ")

    case "day_blocked":
      return [
        m.date ? `Date: ${m.date}` : null,
        m.blockType ? `Type: ${m.blockType}` : null,
        m.reason ? `Reason: ${m.reason}` : null,
        m.cancelledCount != null ? `Cancelled: ${m.cancelledCount} appt(s)` : null,
      ]
        .filter(Boolean)
        .join(" · ")

    case "user_created":
      return [
        m.name ? String(m.name) : null,
        m.email ? String(m.email) : null,
        m.role ? `Role: ${m.role}` : null,
      ]
        .filter(Boolean)
        .join(" · ")

    case "user_updated": {
      const parts: string[] = []
      if (m.name) parts.push(`Name → ${m.name}`)
      if (m.email) parts.push(`Email → ${m.email}`)
      if (m.role) parts.push(`Role → ${m.role}`)
      if (m.passwordChanged) parts.push("Password reset")
      return parts.join(" · ") || "—"
    }

    case "user_deleted":
      return [
        m.name ? String(m.name) : null,
        m.email ? String(m.email) : null,
        m.role ? `Role: ${m.role}` : null,
      ]
        .filter(Boolean)
        .join(" · ")

    case "password_changed":
      return "Staff member changed their own password"

    default:
      return JSON.stringify(metadata)
  }
}

// ─── Component ────────────────────────────────────────────────────────────────

export function AuditReportDialog() {
  const [open, setOpen] = useState(false)
  const [dateRange, setDateRange] = useState<DateRange | undefined>()
  const [calendarOpen, setCalendarOpen] = useState(false)
  const [staffNameFilter, setStaffNameFilter] = useState("")
  const [rows, setRows] = useState<AuditLogRow[] | null>(null)
  const [isPending, startTransition] = useTransition()

  const formatDateRange = () => {
    if (!dateRange?.from) return "Pick a date range"
    if (dateRange.to && dateRange.from.getTime() !== dateRange.to.getTime()) {
      return `${format(dateRange.from, "MMM d, yyyy")} – ${format(dateRange.to, "MMM d, yyyy")}`
    }
    return format(dateRange.from, "MMM d, yyyy")
  }

  const handleGenerate = () => {
    startTransition(async () => {
      const data = await getAuditLogs({
        startDate: dateRange?.from,
        endDate: dateRange?.to ?? dateRange?.from,
        staffName: staffNameFilter || undefined,
      })
      setRows(data)
    })
  }

  const handleExportCSV = useCallback(() => {
    if (!rows || rows.length === 0) return
    const headers = ["Date/Time", "Staff Member", "Action", "Target Type", "Target ID", "Details"]
    const lines = rows.map((r) => {
      const details = buildDetails(r.action, r.metadata)
      return [
        format(new Date(r.createdAt), "yyyy-MM-dd HH:mm:ss"),
        `"${r.staffName.replace(/"/g, '""')}"`,
        ACTION_CONFIG[r.action]?.label ?? r.action,
        r.targetType ?? "",
        r.targetId ?? "",
        `"${details.replace(/"/g, '""')}"`,
      ].join(",")
    })
    const csv = [headers.join(","), ...lines].join("\n")
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `audit-log-${format(new Date(), "yyyy-MM-dd")}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }, [rows])

  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen)
    if (!isOpen) {
      // Reset state when dialog closes
      setRows(null)
      setDateRange(undefined)
      setStaffNameFilter("")
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline" size="default" className="gap-2">
          <ClipboardList className="h-4 w-4" />
          Audit Report
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-5xl w-full max-h-[90vh] flex flex-col gap-0 p-0 overflow-hidden">
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-border shrink-0">
          <DialogTitle className="text-lg font-bold flex items-center gap-2">
            <ClipboardList className="h-5 w-5" />
            Staff Activity Audit Report
          </DialogTitle>
          <p className="text-sm text-muted-foreground mt-1">
            Filter by date range and staff member to generate a report of all staff actions.
          </p>
        </DialogHeader>

        {/* Filters */}
        <div className="px-6 py-4 border-b border-border bg-muted/30 shrink-0">
          <div className="flex flex-col sm:flex-row gap-3 items-end">
            {/* Date Range Picker */}
            <div className="flex flex-col gap-1.5 flex-1">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Date Range
              </label>
              <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal bg-background",
                      !dateRange?.from && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4 shrink-0" />
                    {formatDateRange()}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="range"
                    captionLayout="dropdown"
                    selected={dateRange}
                    onSelect={(range) => {
                      setDateRange(range)
                      if (range?.from && range?.to && range.from.getTime() !== range.to.getTime()) setCalendarOpen(false)
                    }}
                    numberOfMonths={2}
                    startMonth={new Date(2024, 0)}
                    endMonth={new Date(2030, 11)}
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Staff Name Filter */}
            <div className="flex flex-col gap-1.5 flex-1">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Staff Member
              </label>
              <Input
                placeholder="Search by name…"
                value={staffNameFilter}
                onChange={(e) => setStaffNameFilter(e.target.value)}
                className="bg-background"
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleGenerate()
                }}
              />
            </div>

            {/* Generate Button */}
            <Button
              onClick={handleGenerate}
              disabled={isPending}
              className="gap-2 shrink-0"
            >
              {isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Search className="h-4 w-4" />
              )}
              Generate
            </Button>
          </div>
        </div>

        {/* Results */}
        <div className="flex-1 overflow-auto">
          {rows === null && !isPending && (
            <div className="flex flex-col items-center justify-center h-48 text-muted-foreground gap-2">
              <ClipboardList className="h-10 w-10 opacity-30" />
              <p className="text-sm">Set your filters and click Generate to view the audit log.</p>
            </div>
          )}

          {isPending && (
            <div className="flex items-center justify-center h-48 gap-3 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
              <span className="text-sm">Loading…</span>
            </div>
          )}

          {rows !== null && !isPending && rows.length === 0 && (
            <div className="flex flex-col items-center justify-center h-48 text-muted-foreground gap-2">
              <ClipboardList className="h-10 w-10 opacity-30" />
              <p className="text-sm">No activity found for the selected filters.</p>
            </div>
          )}

          {rows !== null && !isPending && rows.length > 0 && (
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50 hover:bg-muted/50">
                  <TableHead className="px-4 py-3 text-muted-foreground uppercase font-medium whitespace-nowrap">
                    Date / Time
                  </TableHead>
                  <TableHead className="px-4 py-3 text-muted-foreground uppercase font-medium">
                    Staff Member
                  </TableHead>
                  <TableHead className="px-4 py-3 text-muted-foreground uppercase font-medium">
                    Action
                  </TableHead>
                  <TableHead className="px-4 py-3 text-muted-foreground uppercase font-medium">
                    Target
                  </TableHead>
                  <TableHead className="px-4 py-3 text-muted-foreground uppercase font-medium">
                    Details
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row) => {
                  const cfg = ACTION_CONFIG[row.action]
                  return (
                    <TableRow key={row.id} className="transition-colors">
                      <TableCell className="px-4 py-3 text-muted-foreground whitespace-nowrap text-xs">
                        {format(new Date(row.createdAt), "MMM d, yyyy")}
                        <span className="block text-muted-foreground/70">
                          {format(new Date(row.createdAt), "HH:mm:ss")}
                        </span>
                      </TableCell>
                      <TableCell className="px-4 py-3 font-medium text-foreground">
                        {row.staffName}
                      </TableCell>
                      <TableCell className="px-4 py-3">
                        <Badge
                          variant="secondary"
                          className={cn(
                            "text-xs whitespace-nowrap",
                            cfg?.className ?? "bg-muted text-muted-foreground"
                          )}
                        >
                          {cfg?.label ?? row.action}
                        </Badge>
                      </TableCell>
                      <TableCell className="px-4 py-3 text-muted-foreground text-xs">
                        {row.targetType && (
                          <span className="capitalize">{row.targetType.replace(/_/g, " ")}</span>
                        )}
                        {row.targetId && (
                          <span className="block text-muted-foreground/70">#{row.targetId}</span>
                        )}
                        {!row.targetType && "—"}
                      </TableCell>
                      <TableCell className="px-4 py-3 text-muted-foreground text-xs max-w-[280px]">
                        {buildDetails(row.action, row.metadata)}
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
        </div>

        {/* Footer */}
        {rows !== null && rows.length > 0 && (
          <div className="px-6 py-4 border-t border-border bg-muted/30 shrink-0 flex items-center justify-between gap-4">
            <span className="text-sm text-muted-foreground">
              {rows.length} record{rows.length !== 1 ? "s" : ""} found
            </span>
            <Button
              variant="secondary"
              size="sm"
              className="gap-1.5 border border-border"
              onClick={handleExportCSV}
            >
              <Download className="h-4 w-4" />
              Export CSV
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
