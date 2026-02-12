"use client"

import { Download } from "lucide-react"
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

export interface CompaniesReportTableProps {
  data: CompanyReportRow[]
  onExportCSV?: () => void
}

export function CompaniesReportTable({ data, onExportCSV }: CompaniesReportTableProps) {
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
              data.map((row) => (
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
    </Card>
  )
}
