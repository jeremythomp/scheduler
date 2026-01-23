"use client"

import { useState, useMemo } from "react"
import { ServiceBooking, AppointmentRequest } from "@prisma/client"
import { Search, ChevronLeft, ChevronRight, ChevronUp, ChevronDown } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"

type ServiceBookingWithRequest = ServiceBooking & {
  appointmentRequest: Pick<
    AppointmentRequest,
    'id' | 'referenceNumber' | 'customerName' | 'customerEmail' | 'customerPhone' | 
    'additionalNotes' | 'status' | 'createdAt'
  >
}

interface AppointmentsTableProps {
  bookings: ServiceBookingWithRequest[]
  onBookingClick: (booking: ServiceBookingWithRequest) => void
}

type SortField = "date" | "customer" | "service"
type SortDirection = "asc" | "desc"

const serviceColors: Record<string, string> = {
  "Vehicle Inspection": "bg-orange-50 text-orange-700 ring-orange-600/20 dark:bg-orange-900/20 dark:text-orange-300",
  "Vehicle Weighing": "bg-gray-100 text-gray-700 ring-gray-600/20 dark:bg-gray-800 dark:text-gray-300",
  "Vehicle Registration": "bg-blue-50 text-blue-700 ring-blue-600/20 dark:bg-blue-900/20 dark:text-blue-300"
}

export function AppointmentsTable({ bookings, onBookingClick }: AppointmentsTableProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [sortField, setSortField] = useState<SortField>("date")
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc")
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 10

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2)
  }

  const getAvatarColor = (name: string) => {
    const colors = [
      "bg-blue-100 text-blue-600",
      "bg-purple-100 text-purple-600",
      "bg-yellow-100 text-yellow-700",
      "bg-pink-100 text-pink-600",
      "bg-green-100 text-green-600",
    ]
    const index = name.charCodeAt(0) % colors.length
    return colors[index]
  }

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc")
    } else {
      setSortField(field)
      setSortDirection("asc")
    }
  }

  const filteredAndSortedBookings = useMemo(() => {
    let result = [...bookings]

    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      result = result.filter(booking =>
        booking.appointmentRequest.customerName.toLowerCase().includes(query) ||
        booking.appointmentRequest.referenceNumber.toLowerCase().includes(query)
      )
    }

    // Apply sorting
    result.sort((a, b) => {
      let comparison = 0

      switch (sortField) {
        case "date":
          const dateA = new Date(a.scheduledDate).getTime()
          const dateB = new Date(b.scheduledDate).getTime()
          comparison = dateA - dateB
          break
        case "customer":
          comparison = a.appointmentRequest.customerName.localeCompare(
            b.appointmentRequest.customerName
          )
          break
        case "service":
          comparison = a.serviceName.localeCompare(b.serviceName)
          break
      }

      return sortDirection === "asc" ? comparison : -comparison
    })

    return result
  }, [bookings, searchQuery, sortField, sortDirection])

  const totalPages = Math.ceil(filteredAndSortedBookings.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const currentBookings = filteredAndSortedBookings.slice(startIndex, endIndex)

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return null
    return sortDirection === "asc" ? (
      <ChevronUp className="h-4 w-4 inline ml-1" />
    ) : (
      <ChevronDown className="h-4 w-4 inline ml-1" />
    )
  }

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric"
    })
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-4">
          <CardTitle>All Appointments</CardTitle>
          <div className="relative w-64">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search customer or reference..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value)
                setCurrentPage(1)
              }}
              className="pl-10"
            />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>
                  <button
                    onClick={() => handleSort("date")}
                    className="flex items-center font-bold hover:text-foreground"
                  >
                    Date & Time
                    <SortIcon field="date" />
                  </button>
                </TableHead>
                <TableHead>
                  <button
                    onClick={() => handleSort("customer")}
                    className="flex items-center font-bold hover:text-foreground"
                  >
                    Customer
                    <SortIcon field="customer" />
                  </button>
                </TableHead>
                <TableHead>
                  <button
                    onClick={() => handleSort("service")}
                    className="flex items-center font-bold hover:text-foreground"
                  >
                    Service
                    <SortIcon field="service" />
                  </button>
                </TableHead>
                <TableHead>Reference</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {currentBookings.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    No appointments found
                  </TableCell>
                </TableRow>
              ) : (
                currentBookings.map((booking) => (
                  <TableRow
                    key={booking.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => onBookingClick(booking)}
                  >
                    <TableCell>
                      <div>
                        <div className="font-medium">
                          {formatDate(booking.scheduledDate)}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {booking.scheduledTime}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback className={cn("font-bold text-xs", getAvatarColor(booking.appointmentRequest.customerName))}>
                            {getInitials(booking.appointmentRequest.customerName)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-medium">
                            {booking.appointmentRequest.customerName}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {booking.appointmentRequest.customerEmail}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={cn("ring-1 ring-inset", serviceColors[booking.serviceName] || "")}>
                        {booking.serviceName.replace("Vehicle ", "")}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <span className="font-mono text-sm">
                        {booking.appointmentRequest.referenceNumber}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation()
                          onBookingClick(booking)
                        }}
                      >
                        View Details
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between mt-4">
          <div className="text-sm text-muted-foreground">
            Showing <strong>{startIndex + 1}-{Math.min(endIndex, filteredAndSortedBookings.length)}</strong> of{" "}
            <strong>{filteredAndSortedBookings.length}</strong> appointments
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </Button>
            <div className="text-sm">
              Page {currentPage} of {totalPages || 1}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages || totalPages === 0}
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
