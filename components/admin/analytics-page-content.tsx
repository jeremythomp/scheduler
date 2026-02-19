"use client"

import { useState, useTransition, useCallback, useEffect, useRef } from "react"
import type { DateRange } from "react-day-picker"
import { CalendarDays, XCircle, Car } from "lucide-react"

import {
  getAnalyticsData,
  getCancellationsReport,
  getCompaniesReport,
  type AnalyticsSummary,
  type CompanyReportRow,
  type CancellationReportRow,
} from "@/app/(staff)/actions"
import { AnalyticsHeader } from "./analytics-header"
import { StatCard } from "./stat-card"
import { CompaniesReportTable } from "./companies-report-table"
import { CancellationsReportTable } from "./cancellations-report-table"
import dynamic from "next/dynamic"
import { Card } from "@/components/ui/card"

const AuditReportDialog = dynamic(
  () => import("./audit-report-dialog").then((m) => ({ default: m.AuditReportDialog })),
  { ssr: false }
)

function getDefaultDateRange(): DateRange | undefined {
  const now = new Date()
  const start = new Date(now.getFullYear(), now.getMonth(), 1)
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0)
  return { from: start, to: end }
}

export interface AnalyticsPageContentProps {
  initialSummary: AnalyticsSummary
  initialCompanies: CompanyReportRow[]
  initialCancellations: CancellationReportRow[]
  cancellationStats: { today: number; thisWeek: number; thisMonth: number }
  userRole?: string
}

export function AnalyticsPageContent({
  initialSummary,
  initialCompanies,
  initialCancellations,
  cancellationStats,
  userRole,
}: AnalyticsPageContentProps) {
  const [serviceFilter, setServiceFilter] = useState("all")
  const [dateRange, setDateRange] = useState<DateRange | undefined>(getDefaultDateRange())
  const [summary, setSummary] = useState<AnalyticsSummary>(initialSummary)
  const [companies, setCompanies] = useState<CompanyReportRow[]>(initialCompanies)
  const [cancellations, setCancellations] = useState<CancellationReportRow[]>(initialCancellations)
  const [isPending, startTransition] = useTransition()
  const isInitialMount = useRef(true)

  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false
      return
    }
    const start = dateRange?.from
    const end = dateRange?.to ?? dateRange?.from
    if (!start) return
    startTransition(async () => {
      const [newSummary, newCompanies, newCancellations] = await Promise.all([
        getAnalyticsData({
          serviceType: serviceFilter,
          startDate: start,
          endDate: end,
        }),
        getCompaniesReport({
          serviceType: serviceFilter,
          startDate: start,
          endDate: end,
        }),
        getCancellationsReport({ startDate: start, endDate: end }),
      ])
      setSummary(newSummary)
      setCompanies(newCompanies)
      setCancellations(newCancellations)
    })
  }, [serviceFilter, dateRange?.from?.getTime(), dateRange?.to?.getTime()])

  const handleServiceChange = (value: string) => {
    setServiceFilter(value)
  }

  const handleDateRangeChange = (range: DateRange | undefined) => {
    setDateRange(range)
  }

  const exportCompaniesCSV = useCallback(() => {
    const headers = ["Company Name", "Number of Appointments", "Total Vehicles", "Avg Vehicles per Visit"]
    const rows = companies.map((r) =>
      [r.companyName, r.appointmentCount, r.totalVehicles, r.avgVehiclesPerVisit.toFixed(2)].join(",")
    )
    const csv = [headers.join(","), ...rows].join("\n")
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `companies-report-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }, [companies])

  const exportCancellationsCSV = useCallback(() => {
    const headers = ["Ref #", "Customer Name", "Services", "Scheduled Date", "Reason"]
    const rows = cancellations.map((r) => {
      const date = r.scheduledDates?.[0] ? new Date(r.scheduledDates[0]).toLocaleDateString() : ""
      return [
        r.referenceNumber,
        `"${r.customerName.replace(/"/g, '""')}"`,
        (r.servicesRequested ?? []).join("; "),
        date,
        `"${(r.reason ?? "").replace(/"/g, '""')}"`,
      ].join(",")
    })
    const csv = [headers.join(","), ...rows].join("\n")
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `cancellations-report-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }, [cancellations])

  const exportAllCSV = useCallback(() => {
    exportCompaniesCSV()
    setTimeout(exportCancellationsCSV, 300)
  }, [exportCompaniesCSV, exportCancellationsCSV])

  const exportPDF = useCallback(() => {
    window.print()
  }, [])

  const maxStat = Math.max(
    summary.totalAppointments || 1,
    summary.totalCancellations || 1,
    summary.totalVehicles || 1
  )
  const appointmentsProgress = maxStat ? ((summary.totalAppointments ?? 0) / maxStat) * 100 : 0
  const cancellationsProgress = maxStat ? ((summary.totalCancellations ?? 0) / maxStat) * 100 : 0
  const vehiclesProgress = maxStat ? ((summary.totalVehicles ?? 0) / maxStat) * 100 : 0

  return (
    <div className="space-y-6">
      <Card className="p-6 flex flex-col gap-4">
        <AnalyticsHeader
          serviceFilter={serviceFilter}
          onServiceFilterChange={handleServiceChange}
          dateRange={dateRange}
          onDateRangeChange={handleDateRangeChange}
          onExportCSV={exportAllCSV}
          onExportPDF={exportPDF}
        />
        {userRole === "admin" && (
          <div className="flex justify-end border-t border-border pt-4">
            <AuditReportDialog />
          </div>
        )}
      </Card>

      {isPending && (
        <div className="text-sm text-muted-foreground animate-pulse">Updating…</div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard
          title="Total Appointments"
          value={summary.totalAppointments?.toLocaleString() ?? 0}
          trend={summary.appointmentsTrend != null ? { value: summary.appointmentsTrend, direction: "up" } : undefined}
          progress={appointmentsProgress}
          accent="blue"
          icon={CalendarDays}
        />
        <StatCard
          title="Total Cancellations"
          value={summary.totalCancellations?.toLocaleString() ?? 0}
          trend={
            summary.cancellationsTrend != null
              ? { value: summary.cancellationsTrend, direction: "up" }
              : undefined
          }
          progress={cancellationsProgress}
          accent="red"
          icon={XCircle}
        />
        <StatCard
          title="Total Vehicles"
          value={summary.totalVehicles?.toLocaleString() ?? 0}
          trend={summary.vehiclesTrend != null ? { value: summary.vehiclesTrend, direction: "up" } : undefined}
          progress={vehiclesProgress}
          accent="orange"
          icon={Car}
        />
      </div>

      <CompaniesReportTable data={companies} onExportCSV={exportCompaniesCSV} />
      <CancellationsReportTable
        data={cancellations}
        summary={cancellationStats}
        onExportCSV={exportCancellationsCSV}
      />
    </div>
  )
}
