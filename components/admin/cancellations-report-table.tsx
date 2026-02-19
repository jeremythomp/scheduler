"use client"

import { Download } from "lucide-react"
import type { CancellationReportRow } from "@/app/(staff)/actions"
import { format } from "date-fns"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

const SERVICE_LABELS: Record<string, string> = {
  "Vehicle Inspection": "Insp",
  "Vehicle Weighing": "Wei",
  "Vehicle Registration/Customer Service Center": "Reg",
}

const SERVICE_BADGE_CLASSES: Record<string, string> = {
  "Vehicle Inspection": "bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-200",
  "Vehicle Weighing": "bg-primary/10 text-primary dark:bg-primary/40 dark:text-red-200",
  "Vehicle Registration/Customer Service Center": "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-200",
}

function formatScheduledDate(value?: string): string {
  if (!value) return "—"

  const parsed = new Date(value)
  if (!Number.isNaN(parsed.getTime())) {
    return format(parsed, "MMM d, yyyy")
  }

  // Legacy cancellation snapshots store strings like:
  // "Vehicle Inspection: 2/18/2026 at 08:30 AM"
  const slashDateMatch = value.match(/\b\d{1,2}\/\d{1,2}\/\d{4}\b/)
  if (slashDateMatch) {
    const legacyParsed = new Date(slashDateMatch[0])
    if (!Number.isNaN(legacyParsed.getTime())) {
      return format(legacyParsed, "MMM d, yyyy")
    }
    return slashDateMatch[0]
  }

  return value
}

export interface CancellationsReportTableProps {
  data: CancellationReportRow[]
  summary?: { today: number; thisWeek: number; thisMonth: number }
  onExportCSV?: () => void
}

export function CancellationsReportTable({
  data,
  summary,
  onExportCSV,
}: CancellationsReportTableProps) {
  return (
    <Card className="overflow-hidden">
      <div className="p-6 border-b border-border flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h3 className="text-lg font-bold text-foreground">Cancellations Report</h3>
        <Button
          variant="secondary"
          size="sm"
          className="gap-1.5 border border-border"
          onClick={onExportCSV}
        >
          <Download className="h-4 w-4" />
          Export CSV
        </Button>
      </div>
      {summary && (
        <div className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-border bg-muted/30 border-b border-border">
          <div className="p-4 flex flex-col items-center">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Today
            </span>
            <span className="text-2xl font-bold text-destructive mt-1">
              {summary.today}
            </span>
          </div>
          <div className="p-4 flex flex-col items-center">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              This Week
            </span>
            <span className="text-2xl font-bold text-destructive mt-1">
              {summary.thisWeek}
            </span>
          </div>
          <div className="p-4 flex flex-col items-center">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              This Month
            </span>
            <span className="text-2xl font-bold text-destructive mt-1">
              {summary.thisMonth}
            </span>
          </div>
        </div>
      )}
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50 hover:bg-muted/50">
              <TableHead className="px-6 py-4 w-24 text-muted-foreground uppercase font-medium">
                Ref #
              </TableHead>
              <TableHead className="px-6 py-4 text-muted-foreground uppercase font-medium">
                Customer Name
              </TableHead>
              <TableHead className="px-6 py-4 text-muted-foreground uppercase font-medium">
                Services
              </TableHead>
              <TableHead className="px-6 py-4 text-muted-foreground uppercase font-medium">
                Scheduled Date
              </TableHead>
              <TableHead className="px-6 py-4 w-1/3 text-muted-foreground uppercase font-medium">
                Reason
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="px-6 py-8 text-center text-muted-foreground">
                  No cancellations for the selected filters.
                </TableCell>
              </TableRow>
            ) : (
              data.map((row) => (
                <TableRow key={`${row.referenceNumber}-${row.cancelledAt.getTime()}`} className="transition-colors">
                  <TableCell className="px-6 py-4 font-medium text-foreground">
                    #{row.referenceNumber}
                  </TableCell>
                  <TableCell className="px-6 py-4 text-muted-foreground">
                    {row.customerName}
                  </TableCell>
                  <TableCell className="px-6 py-4">
                    <div className="flex flex-wrap gap-1">
                      {(row.servicesRequested ?? []).map((s) => (
                        <Badge
                          key={s}
                          variant="secondary"
                          className={SERVICE_BADGE_CLASSES[s] ?? "bg-muted text-muted-foreground"}
                        >
                          {SERVICE_LABELS[s] ?? s}
                        </Badge>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell className="px-6 py-4 text-muted-foreground">
                    {formatScheduledDate(row.scheduledDates?.[0])}
                  </TableCell>
                  <TableCell className="px-6 py-4 text-muted-foreground">
                    {row.reason ?? "—"}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </Card>
  )
}
