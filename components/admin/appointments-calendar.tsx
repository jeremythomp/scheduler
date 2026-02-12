"use client"

import { useState, useMemo } from "react"
import { ServiceBooking, AppointmentRequest } from "@prisma/client"
import { ChevronLeft, ChevronRight, Car } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

type ServiceBookingWithRequest = ServiceBooking & {
  appointmentRequest: Pick<
    AppointmentRequest,
    'id' | 'referenceNumber' | 'customerName' | 'customerEmail' | 'customerPhone' | 
    'numberOfVehicles' | 'idNumber' | 'additionalNotes' | 'status' | 'createdAt'
  > & {
    serviceBookings?: Array<Pick<ServiceBooking, 'id' | 'serviceName' | 'scheduledDate' | 'scheduledTime' | 'location' | 'vehicleCount'>>
  }
}

interface AppointmentsCalendarProps {
  bookings: ServiceBookingWithRequest[]
  onDayClick: (date: Date, bookings: ServiceBookingWithRequest[]) => void
}

interface CalendarDay {
  date: Date
  day: number
  isCurrentMonth: boolean
  isToday: boolean
  bookings: ServiceBookingWithRequest[]
}

const serviceColors: Record<string, string> = {
  "Vehicle Inspection": "bg-orange-100 text-orange-700 border-orange-300 dark:bg-orange-900/20 dark:text-orange-300 dark:border-orange-700",
  "Vehicle Weighing": "bg-gray-100 text-gray-700 border-gray-300 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700",
  "Vehicle Registration/Customer Service Center": "bg-blue-100 text-blue-700 border-blue-300 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-700"
}

export function AppointmentsCalendar({ bookings, onDayClick }: AppointmentsCalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date())

  const calendar = useMemo(() => {
    const year = currentDate.getFullYear()
    const month = currentDate.getMonth()

    // Get first day of month
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)

    // Get starting day (go back to Sunday)
    const startingDayOfWeek = firstDay.getDay()
    const startDate = new Date(firstDay)
    startDate.setDate(startDate.getDate() - startingDayOfWeek)

    // Generate 42 days (6 weeks)
    const days: CalendarDay[] = []
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    for (let i = 0; i < 42; i++) {
      const date = new Date(startDate)
      date.setDate(startDate.getDate() + i)

      const dateStr = date.toISOString().split('T')[0]
      const dayBookings = bookings.filter(booking => {
        const bookingDate = new Date(booking.scheduledDate)
        const bookingDateStr = bookingDate.toISOString().split('T')[0]
        return bookingDateStr === dateStr
      })

      days.push({
        date: new Date(date),
        day: date.getDate(),
        isCurrentMonth: date.getMonth() === month,
        isToday: date.toISOString().split('T')[0] === today.toISOString().split('T')[0],
        bookings: dayBookings
      })
    }

    return days
  }, [currentDate, bookings])

  const monthName = currentDate.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric"
  })

  const goToPreviousMonth = () => {
    setCurrentDate(prev => {
      const newDate = new Date(prev)
      newDate.setMonth(newDate.getMonth() - 1)
      return newDate
    })
  }

  const goToNextMonth = () => {
    setCurrentDate(prev => {
      const newDate = new Date(prev)
      newDate.setMonth(newDate.getMonth() + 1)
      return newDate
    })
  }

  const goToToday = () => {
    setCurrentDate(new Date())
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>{monthName}</CardTitle>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={goToToday}>
              Today
            </Button>
            <Button variant="outline" size="icon" onClick={goToPreviousMonth}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon" onClick={goToNextMonth}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Legend */}
        <div className="mb-4 flex items-center justify-center gap-4 text-xs flex-wrap">
          <div className="flex items-center gap-1.5">
            <div className="h-3 w-3 rounded bg-orange-100 border border-orange-300" />
            <span className="text-muted-foreground">Inspection</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="h-3 w-3 rounded bg-gray-100 border border-gray-300" />
            <span className="text-muted-foreground">Weighing</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="h-3 w-3 rounded bg-blue-100 border border-blue-300" />
            <span className="text-muted-foreground">Registration</span>
          </div>
        </div>

        <div className="grid grid-cols-7 gap-px bg-border rounded-lg overflow-hidden">
          {/* Day headers */}
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
            <div
              key={day}
              className="bg-muted p-2 text-center text-xs font-bold text-muted-foreground"
            >
              {day}
            </div>
          ))}

          {/* Calendar days */}
          {calendar.map((day, idx) => (
            <button
              key={idx}
              onClick={() => day.bookings.length > 0 && onDayClick(day.date, day.bookings)}
              disabled={day.bookings.length === 0}
              className={cn(
                "bg-card min-h-[120px] p-3 relative transition-all text-left",
                !day.isCurrentMonth && "bg-muted/30 text-muted-foreground",
                day.isToday && "ring-2 ring-primary ring-inset",
                day.bookings.length > 0 && "hover:bg-muted/50 cursor-pointer",
                day.bookings.length === 0 && "cursor-default"
              )}
            >
              <div className="flex items-start justify-between">
                <span
                  className={cn(
                    "text-sm font-medium",
                    day.isToday && "bg-primary text-primary-foreground rounded-full h-6 w-6 flex items-center justify-center"
                  )}
                >
                  {day.day}
                </span>
                <div className="flex flex-col items-end gap-1">
                  {day.bookings.length > 0 && (
                    <Badge 
                      variant="secondary" 
                      className="h-6 px-2 text-xs font-bold bg-primary/10 text-primary hover:bg-primary/20"
                    >
                      {day.bookings.length}
                    </Badge>
                  )}
                  {day.bookings.length > 0 && (() => {
                    // Count unique vehicles per appointment request, not per service booking
                    const uniqueRequests = new Map<number, number>()
                    day.bookings.forEach(b => {
                      if (!uniqueRequests.has(b.appointmentRequest.id)) {
                        uniqueRequests.set(b.appointmentRequest.id, b.appointmentRequest.numberOfVehicles)
                      }
                    })
                    const totalVehicles = Array.from(uniqueRequests.values()).reduce((sum, count) => sum + count, 0)
                    return totalVehicles > 0 && (
                      <div className="flex items-center gap-0.5 text-[10px] text-muted-foreground">
                        <Car className="h-2.5 w-2.5" />
                        <span>{totalVehicles}</span>
                      </div>
                    )
                  })()}
                </div>
              </div>

              {/* Service type indicators */}
              {day.bookings.length > 0 && (
                <div className="absolute bottom-2 left-2 flex gap-1">
                  {Array.from(new Set(day.bookings.map(b => b.serviceName))).map((serviceName, i) => (
                    <div
                      key={i}
                      className={cn(
                        "h-2 w-2 rounded-full",
                        serviceName === "Vehicle Inspection" && "bg-orange-500",
                        serviceName === "Vehicle Weighing" && "bg-gray-500",
                        serviceName === "Vehicle Registration/Customer Service Center" && "bg-blue-500"
                      )}
                      title={serviceName}
                    />
                  ))}
                </div>
              )}
            </button>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
