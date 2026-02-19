"use client"

import { useState, useEffect } from "react"
import { Download, ChevronLeft, ChevronRight } from "lucide-react"
import type { CompanyReportRow } from "@/app/(staff)/actions"

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

const PAGE_SIZE = 10

export interface CompaniesReportTableProps {
  data: CompanyReportRow[]
  onExportCSV?: () => void
}

export function CompaniesReportTable({ data, onExportCSV }: CompaniesReportTableProps) {
  const [page, setPage] = useState(1)

  // Reset to page 1 whenever the data changes (filter update)
  useEffect(() => {
    setPage(1)
  }, [data])

  const totalPages = Math.max(1, Math.ceil(data.length / PAGE_SIZE))
  const pageRows = data.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  return (
    <Card className="overflow-hidden">
      <div className="p-6 border-b border-border flex justify-between items-center">
        <div className="flex flex-col">
          <h3 className="text-lg font-bold text-foreground">
            Companies and Vehicles Report
          </h3>
          <p className="text-xs text-muted-foreground mt-1">
            Sorted descending by total vehicles
          </p>
        </div>
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
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50 hover:bg-muted/50">
              <TableHead className="px-6 py-4 text-muted-foreground uppercase font-medium">
                Company Name
              </TableHead>
              <TableHead className="px-6 py-4 text-center text-muted-foreground uppercase font-medium">
                Number of Appointments
              </TableHead>
              <TableHead className="px-6 py-4 text-center text-muted-foreground uppercase font-medium">
                Total Vehicles
              </TableHead>
              <TableHead className="px-6 py-4 text-right text-muted-foreground uppercase font-medium">
                Avg Vehicles per Visit
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="px-6 py-8 text-center text-muted-foreground">
                  No data for the selected filters.
                </TableCell>
              </TableRow>
            ) : (
              pageRows.map((row) => (
                <TableRow key={row.companyName} className="transition-colors">
                  <TableCell className="px-6 py-4 font-medium text-foreground">
                    {row.companyName}
                  </TableCell>
                  <TableCell className="px-6 py-4 text-center text-muted-foreground">
                    {row.appointmentCount}
                  </TableCell>
                  <TableCell className="px-6 py-4 text-center font-bold text-primary">
                    {row.totalVehicles}
                  </TableCell>
                  <TableCell className="px-6 py-4 text-right text-muted-foreground">
                    {row.avgVehiclesPerVisit.toFixed(2)}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
      {totalPages > 1 && (
        <div className="px-6 py-4 border-t border-border flex items-center justify-between gap-4">
          <span className="text-sm text-muted-foreground">
            Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, data.length)} of {data.length}
          </span>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              className="h-8 w-8 p-0"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
            >
              <ChevronLeft className="h-4 w-4" />
              <span className="sr-only">Previous page</span>
            </Button>
            <span className="text-sm text-muted-foreground px-2">
              {page} / {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              className="h-8 w-8 p-0"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
            >
              <ChevronRight className="h-4 w-4" />
              <span className="sr-only">Next page</span>
            </Button>
          </div>
        </div>
      )}
    </Card>
  )
}
