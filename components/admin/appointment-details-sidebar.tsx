"use client"

import { useState, useEffect } from "react"
import { ServiceBooking, AppointmentRequest } from "@prisma/client"
import { X, User, Mail, Phone, Calendar, Clock, FileText, Hash, ChevronRight } from "lucide-react"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Separator } from "@/components/ui/separator"
import { cn } from "@/lib/utils"

type ServiceBookingWithRequest = ServiceBooking & {
  appointmentRequest: Pick<
    AppointmentRequest,
    'id' | 'referenceNumber' | 'customerName' | 'customerEmail' | 'customerPhone' | 
    'additionalNotes' | 'status' | 'createdAt'
  >
}

interface AppointmentDetailsSidebarProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  booking: ServiceBookingWithRequest | null
  dayBookings?: ServiceBookingWithRequest[]
  selectedDate?: Date
}

const serviceColors: Record<string, string> = {
  "Vehicle Inspection": "bg-orange-50 text-orange-700 ring-orange-600/20 dark:bg-orange-900/20 dark:text-orange-300",
  "Vehicle Weighing": "bg-gray-100 text-gray-700 ring-gray-600/20 dark:bg-gray-800 dark:text-gray-300",
  "Vehicle Registration": "bg-blue-50 text-blue-700 ring-blue-600/20 dark:bg-blue-900/20 dark:text-blue-300"
}

export function AppointmentDetailsSidebar({ 
  open, 
  onOpenChange, 
  booking,
  dayBookings,
  selectedDate
}: AppointmentDetailsSidebarProps) {
  const [selectedBooking, setSelectedBooking] = useState<ServiceBookingWithRequest | null>(booking)

  // Reset selected booking when props change
  useEffect(() => {
    if (booking) {
      setSelectedBooking(booking)
    } else if (dayBookings && dayBookings.length > 0) {
      setSelectedBooking(null)
    }
  }, [booking, dayBookings])

  // If showing day list mode
  const showDayList = !booking && dayBookings && dayBookings.length > 0
  
  if (!booking && !showDayList) return null

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

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric"
    })
  }

  const formatTime = (time: string) => {
    return time
  }

  // If we have a selected booking in day list mode, show its details
  const displayBooking = selectedBooking || booking

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto pl-6">
        <SheetHeader>
          <SheetTitle>
            {showDayList && !selectedBooking 
              ? `Appointments - ${selectedDate?.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}`
              : "Appointment Details"}
          </SheetTitle>
          {selectedBooking && dayBookings && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelectedBooking(null)}
              className="mt-2 justify-start"
            >
              ← Back to day list
            </Button>
          )}
        </SheetHeader>

        {/* Day Appointments List View */}
        {showDayList && !selectedBooking ? (
          <div className="mt-6 space-y-3">
            <p className="text-sm text-muted-foreground mb-4">
              {dayBookings.length} appointment{dayBookings.length !== 1 ? 's' : ''} scheduled
            </p>
            {dayBookings.sort((a, b) => a.scheduledTime.localeCompare(b.scheduledTime)).map((dayBooking, idx) => (
              <button
                key={idx}
                onClick={() => setSelectedBooking(dayBooking)}
                className="w-full text-left p-4 rounded-lg border bg-card hover:bg-muted/50 transition-all group"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-lg font-bold">{dayBooking.scheduledTime}</span>
                  <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:translate-x-1 transition-transform" />
                </div>
                <div className="flex items-center gap-3 mb-2">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className={cn("font-bold text-xs", getAvatarColor(dayBooking.appointmentRequest.customerName))}>
                      {getInitials(dayBooking.appointmentRequest.customerName)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold truncate">{dayBooking.appointmentRequest.customerName}</div>
                    <div className="text-xs text-muted-foreground truncate">{dayBooking.appointmentRequest.customerEmail}</div>
                  </div>
                </div>
                <Badge className={cn("ring-1 ring-inset", serviceColors[dayBooking.serviceName] || "")}>
                  {dayBooking.serviceName}
                </Badge>
              </button>
            ))}
          </div>
        ) : displayBooking ? (
          <div className="mt-6 space-y-6">
            {/* Customer Info */}
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <Avatar className="h-12 w-12">
                  <AvatarFallback className={cn("font-bold text-sm", getAvatarColor(displayBooking.appointmentRequest.customerName))}>
                    {getInitials(displayBooking.appointmentRequest.customerName)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="font-semibold text-lg">{displayBooking.appointmentRequest.customerName}</h3>
                  <p className="text-sm text-muted-foreground">Customer</p>
                </div>
              </div>

              <div className="space-y-3 bg-muted/50 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <Mail className="h-4 w-4 mt-0.5 text-muted-foreground" />
                  <div className="flex-1">
                    <p className="text-xs text-muted-foreground">Email</p>
                    <p className="text-sm font-medium">{displayBooking.appointmentRequest.customerEmail}</p>
                  </div>
                </div>

                {displayBooking.appointmentRequest.customerPhone && (
                  <div className="flex items-start gap-3">
                    <Phone className="h-4 w-4 mt-0.5 text-muted-foreground" />
                    <div className="flex-1">
                      <p className="text-xs text-muted-foreground">Phone</p>
                      <p className="text-sm font-medium">{displayBooking.appointmentRequest.customerPhone}</p>
                    </div>
                  </div>
                )}

                <div className="flex items-start gap-3">
                  <Hash className="h-4 w-4 mt-0.5 text-muted-foreground" />
                  <div className="flex-1">
                    <p className="text-xs text-muted-foreground">Reference Number</p>
                    <p className="text-sm font-medium font-mono">{displayBooking.appointmentRequest.referenceNumber}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Appointment Info */}
            <div className="space-y-3">
              <h4 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider">
                Appointment
              </h4>
              <div className="space-y-3 bg-muted/50 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <User className="h-4 w-4 mt-0.5 text-muted-foreground" />
                  <div className="flex-1">
                    <p className="text-xs text-muted-foreground">Service Type</p>
                    <Badge className={cn("mt-1 ring-1 ring-inset", serviceColors[displayBooking.serviceName] || "")}>
                      {displayBooking.serviceName}
                    </Badge>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Calendar className="h-4 w-4 mt-0.5 text-muted-foreground" />
                  <div className="flex-1">
                    <p className="text-xs text-muted-foreground">Date</p>
                    <p className="text-sm font-medium">{formatDate(displayBooking.scheduledDate)}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Clock className="h-4 w-4 mt-0.5 text-muted-foreground" />
                  <div className="flex-1">
                    <p className="text-xs text-muted-foreground">Time</p>
                    <p className="text-sm font-medium">{formatTime(displayBooking.scheduledTime)}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Additional Notes */}
            {displayBooking.appointmentRequest.additionalNotes && (
              <div className="space-y-3">
                <h4 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider">
                  Notes
                </h4>
                <div className="bg-muted/50 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <FileText className="h-4 w-4 mt-0.5 text-muted-foreground flex-shrink-0" />
                    <p className="text-sm">{displayBooking.appointmentRequest.additionalNotes}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Metadata */}
            <div className="text-xs text-muted-foreground border-t pt-4">
              <p>Booked on {formatDate(displayBooking.appointmentRequest.createdAt)}</p>
              <p className="mt-1">Status: <Badge variant="outline" className="ml-1">{displayBooking.appointmentRequest.status}</Badge></p>
            </div>
          </div>
        ) : null}
      </SheetContent>
    </Sheet>
  )
}
