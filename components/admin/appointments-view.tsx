"use client"

import { useState, useEffect, useMemo } from "react"
import { ServiceBooking, AppointmentRequest } from "@prisma/client"
import { Calendar as CalendarIcon, List } from "lucide-react"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { AppointmentsCalendar } from "./appointments-calendar"
import { AppointmentsTable } from "./appointments-table"
import { AppointmentDetailsSidebar, type DayBlockInfo } from "./appointment-details-sidebar"
import { ServiceFilter } from "./service-filter"
import { getServiceBookings, getActiveBlocks } from "@/app/(staff)/actions"
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
  refreshToken?: number
}

export function AppointmentsView({ 
  initialBookings, 
  serviceFilter: controlledServiceFilter,
  onServiceFilterChange,
  refreshToken = 0,
}: AppointmentsViewProps) {
  const [viewMode, setViewMode] = useState<"calendar" | "table">("calendar")
  const [internalServiceFilter, setInternalServiceFilter] = useState("all")
  const [currentDate, setCurrentDate] = useState(new Date())
  
  // Use controlled or uncontrolled mode
  const serviceFilter = controlledServiceFilter ?? internalServiceFilter
  const setServiceFilter = onServiceFilterChange ?? setInternalServiceFilter
  const [selectedBooking, setSelectedBooking] = useState<ServiceBookingWithRequest | null>(null)
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [dayBookings, setDayBookings] = useState<ServiceBookingWithRequest[]>([])
  const [selectedDayBlock, setSelectedDayBlock] = useState<DayBlockInfo | null>(null)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [bookings, setBookings] = useState<ServiceBookingWithRequest[]>(initialBookings)
  const [dayBlocks, setDayBlocks] = useState<DayBlockInfo[]>([])
  const [isLoading, setIsLoading] = useState(false)

  // Fetch bookings and day blocks when filter, displayed month, or refreshToken changes
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true)
      try {
        const filters: any = {}
        
        if (serviceFilter !== "all") {
          filters.serviceType = serviceFilter
        }
        
        let start: Date | undefined
        let end: Date | undefined
        if (viewMode === "calendar") {
          start = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1)
          end = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0)
          filters.startDate = start
          filters.endDate = end
        }
        
        const [bookingsData, blocksData] = await Promise.all([
          getServiceBookings(filters),
          viewMode === "calendar" && start && end
            ? getActiveBlocks(start.toISOString().split("T")[0], end.toISOString().split("T")[0])
            : Promise.resolve([]),
        ])
        
        setBookings(bookingsData as ServiceBookingWithRequest[])
        setDayBlocks(
          (blocksData as { date: Date; blockType: string; publicNote: string }[]).map((b) => ({
            date: new Date(b.date).toISOString().split("T")[0],
            blockType: b.blockType,
            publicNote: b.publicNote,
          }))
        )
      } catch (error) {
        toast.error("Failed to load appointments")
        console.error(error)
        setDayBlocks([])
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [serviceFilter, viewMode, currentDate, refreshToken])

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

  const handleDayClick = (date: Date, bookingsForDay: ServiceBookingWithRequest[], dayBlock?: DayBlockInfo | null) => {
    setSelectedDate(date)
    setDayBookings(bookingsForDay)
    setSelectedDayBlock(dayBlock ?? null)
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
      
      // For calendar view, fetch the displayed month's data
      if (viewMode === "calendar") {
        const start = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1)
        const end = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0)
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
      setSelectedDayBlock(null)
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
            dayBlocks={dayBlocks}
            onDayClick={handleDayClick}
            currentDate={currentDate}
            onMonthChange={setCurrentDate}
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
        selectedDayBlock={selectedDayBlock}
        onRescheduleSuccess={handleRescheduleSuccess}
      />
    </>
  )
}
