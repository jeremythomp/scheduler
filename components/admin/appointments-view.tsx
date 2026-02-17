"use client"

import { useState, useEffect, useMemo } from "react"
import { ServiceBooking, AppointmentRequest } from "@prisma/client"
import { Calendar as CalendarIcon, List } from "lucide-react"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { AppointmentsCalendar } from "./appointments-calendar"
import { AppointmentsTable } from "./appointments-table"
import { AppointmentDetailsSidebar } from "./appointment-details-sidebar"
import { ServiceFilter } from "./service-filter"
import { getServiceBookings } from "@/app/(staff)/actions"
import { toast } from "sonner"

type ServiceBookingWithRequest = ServiceBooking & {
  appointmentRequest: Pick<
    AppointmentRequest,
    'id' | 'referenceNumber' | 'customerName' | 'customerEmail' | 'customerPhone' | 
    'numberOfVehicles' | 'idNumber' | 'additionalNotes' | 'status' | 'createdAt'
  >
}

interface AppointmentsViewProps {
  initialBookings: ServiceBookingWithRequest[]
  serviceFilter?: string
  onServiceFilterChange?: (value: string) => void
}

export function AppointmentsView({ 
  initialBookings, 
  serviceFilter: controlledServiceFilter,
  onServiceFilterChange 
}: AppointmentsViewProps) {
  const [viewMode, setViewMode] = useState<"calendar" | "table">("calendar")
  const [internalServiceFilter, setInternalServiceFilter] = useState("all")
  
  // Use controlled or uncontrolled mode
  const serviceFilter = controlledServiceFilter ?? internalServiceFilter
  const setServiceFilter = onServiceFilterChange ?? setInternalServiceFilter
  const [selectedBooking, setSelectedBooking] = useState<ServiceBookingWithRequest | null>(null)
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [dayBookings, setDayBookings] = useState<ServiceBookingWithRequest[]>([])
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [bookings, setBookings] = useState<ServiceBookingWithRequest[]>(initialBookings)
  const [isLoading, setIsLoading] = useState(false)

  // Fetch bookings when filter changes
  useEffect(() => {
    const fetchBookings = async () => {
      setIsLoading(true)
      try {
        const filters: any = {}
        
        if (serviceFilter !== "all") {
          filters.serviceType = serviceFilter
        }
        
        // For calendar view, fetch current month
        if (viewMode === "calendar") {
          const now = new Date()
          const start = new Date(now.getFullYear(), now.getMonth(), 1)
          const end = new Date(now.getFullYear(), now.getMonth() + 1, 0)
          filters.startDate = start
          filters.endDate = end
        }
        
        const data = await getServiceBookings(filters)
        setBookings(data as ServiceBookingWithRequest[])
      } catch (error) {
        toast.error("Failed to load appointments")
        console.error(error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchBookings()
  }, [serviceFilter, viewMode])

  const filteredBookings = useMemo(() => {
    if (serviceFilter === "all") {
      return bookings
    }
    return bookings.filter(booking => booking.serviceName === serviceFilter)
  }, [bookings, serviceFilter])

  const handleBookingClick = (booking: ServiceBookingWithRequest) => {
    setSelectedBooking(booking)
    setSelectedDate(null)
    setDayBookings([])
    setSidebarOpen(true)
  }

  const handleDayClick = (date: Date, bookingsForDay: ServiceBookingWithRequest[]) => {
    setSelectedDate(date)
    setDayBookings(bookingsForDay)
    setSelectedBooking(null)
    setSidebarOpen(true)
  }

  const handleRescheduleSuccess = async () => {
    // Refresh bookings after successful reschedule
    try {
      const filters: any = {}
      
      if (serviceFilter !== "all") {
        filters.serviceType = serviceFilter
      }
      
      // For calendar view, fetch current month
      if (viewMode === "calendar") {
        const now = new Date()
        const start = new Date(now.getFullYear(), now.getMonth(), 1)
        const end = new Date(now.getFullYear(), now.getMonth() + 1, 0)
        filters.startDate = start
        filters.endDate = end
      }
      
      const data = await getServiceBookings(filters)
      setBookings(data as ServiceBookingWithRequest[])
      
      // Close the sidebar to show updated data
      setSidebarOpen(false)
      setSelectedBooking(null)
      setSelectedDate(null)
      setDayBookings([])
    } catch (error) {
      console.error("Error refreshing bookings:", error)
    }
  }

  return (
    <>
      <div className="space-y-6">
        {/* View Toggle and Service Filter */}
        <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
          <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as "calendar" | "table")}>
            <TabsList>
              <TabsTrigger value="calendar" className="flex items-center gap-2">
                <CalendarIcon className="h-4 w-4" />
                Calendar View
              </TabsTrigger>
              <TabsTrigger value="table" className="flex items-center gap-2">
                <List className="h-4 w-4" />
                Table View
              </TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="w-full md:w-auto">
            <ServiceFilter value={serviceFilter} onValueChange={setServiceFilter} />
          </div>
        </div>

        {/* Content */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-muted-foreground">Loading appointments...</div>
          </div>
        ) : viewMode === "calendar" ? (
          <AppointmentsCalendar
            bookings={filteredBookings}
            onDayClick={handleDayClick}
          />
        ) : (
          <AppointmentsTable
            bookings={filteredBookings}
            onBookingClick={handleBookingClick}
          />
        )}
      </div>

      {/* Appointment Details Sidebar */}
      <AppointmentDetailsSidebar
        open={sidebarOpen}
        onOpenChange={setSidebarOpen}
        booking={selectedBooking}
        dayBookings={dayBookings}
        selectedDate={selectedDate || undefined}
        onRescheduleSuccess={handleRescheduleSuccess}
      />
    </>
  )
}
