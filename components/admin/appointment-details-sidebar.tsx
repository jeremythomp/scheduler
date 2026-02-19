"use client"

import { useState, useEffect } from "react"
import { ServiceBooking, AppointmentRequest } from "@prisma/client"
import { X, User, Mail, Phone, Calendar, Clock, FileText, Hash, ChevronRight, MapPin, Car, CreditCard, AlertCircle, RefreshCw, CheckCircle, XCircle } from "lucide-react"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { RescheduleDialog } from "./reschedule-dialog"
import { ShiftCustomerDialog } from "./shift-customer-dialog"
import { checkInAppointment, markNoShow } from "@/app/(staff)/actions"
import { toast } from "sonner"
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

export type DayBlockInfo = { date: string; blockType: string; publicNote: string }

interface AppointmentDetailsSidebarProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  booking: ServiceBookingWithRequest | null
  dayBookings?: ServiceBookingWithRequest[]
  selectedDate?: Date
  selectedDayBlock?: DayBlockInfo | null
  onRescheduleSuccess?: () => void
}

const serviceColors: Record<string, string> = {
  "Vehicle Inspection": "bg-orange-50 text-orange-700 ring-orange-600/20 dark:bg-orange-900/20 dark:text-orange-300",
  "Vehicle Weighing": "bg-gray-100 text-gray-700 ring-gray-600/20 dark:bg-gray-800 dark:text-gray-300",
  "Vehicle Registration/Customer Service Center": "bg-blue-50 text-blue-700 ring-blue-600/20 dark:bg-blue-900/20 dark:text-blue-300"
}

export function AppointmentDetailsSidebar({ 
  open, 
  onOpenChange, 
  booking,
  dayBookings,
  selectedDate,
  selectedDayBlock,
  onRescheduleSuccess
}: AppointmentDetailsSidebarProps) {
  const [selectedBooking, setSelectedBooking] = useState<ServiceBookingWithRequest | null>(booking)
  const [rescheduleDialogOpen, setRescheduleDialogOpen] = useState(false)
  const [shiftDialogOpen, setShiftDialogOpen] = useState(false)
  const [freedSlots, setFreedSlots] = useState<any[]>([])
  const [isCheckingIn, setIsCheckingIn] = useState(false)
  const [isMarkingNoShow, setIsMarkingNoShow] = useState(false)

  // Reset selected booking when props change
  useEffect(() => {
    if (booking) {
      setSelectedBooking(booking)
    } else if (dayBookings && dayBookings.length > 0) {
      setSelectedBooking(null)
    }
  }, [booking, dayBookings])

  // If showing day list mode (has bookings) or closed-day mode (blocked, possibly zero bookings)
  const showDayList = !booking && dayBookings && dayBookings.length > 0
  const showClosedDay = !booking && selectedDate && selectedDayBlock
  
  if (!booking && !showDayList && !showClosedDay) return null

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
    const d = new Date(date)
    // Use UTC to avoid timezone conversion issues
    return d.toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
      timeZone: "UTC"
    })
  }

  const formatTime = (time: string) => {
    return time
  }

  const isFutureAppointment = (date: Date) => {
    // Use UTC methods to avoid timezone conversion issues
    const appointmentDate = new Date(date)
    const today = new Date()
    
    const appointmentDateStr = `${appointmentDate.getUTCFullYear()}-${String(appointmentDate.getUTCMonth() + 1).padStart(2, '0')}-${String(appointmentDate.getUTCDate()).padStart(2, '0')}`
    const todayDateStr = `${today.getUTCFullYear()}-${String(today.getUTCMonth() + 1).padStart(2, '0')}-${String(today.getUTCDate()).padStart(2, '0')}`
    
    return appointmentDateStr >= todayDateStr
  }

  const canReschedule = (booking: ServiceBookingWithRequest) => {
    // Staff can reschedule any future appointment
    return isFutureAppointment(booking.scheduledDate)
  }

  const isToday = (date: Date) => {
    const appointmentDate = new Date(date)
    const today = new Date()
    
    const appointmentDateStr = `${appointmentDate.getUTCFullYear()}-${String(appointmentDate.getUTCMonth() + 1).padStart(2, '0')}-${String(appointmentDate.getUTCDate()).padStart(2, '0')}`
    const todayDateStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
    
    return appointmentDateStr === todayDateStr
  }

  const canCheckIn = (booking: ServiceBookingWithRequest) => {
    return booking.appointmentRequest.status === "confirmed" && isToday(booking.scheduledDate)
  }

  const canMarkNoShow = (booking: ServiceBookingWithRequest) => {
    return booking.appointmentRequest.status === "confirmed" && isToday(booking.scheduledDate)
  }

  const handleCheckIn = async () => {
    if (!displayBooking) return
    
    setIsCheckingIn(true)
    try {
      await checkInAppointment(displayBooking.appointmentRequest.id)
      toast.success("Customer checked in successfully")
      if (onRescheduleSuccess) {
        onRescheduleSuccess()
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to check in")
    } finally {
      setIsCheckingIn(false)
    }
  }

  const handleMarkNoShow = async () => {
    if (!displayBooking) return
    
    setIsMarkingNoShow(true)
    try {
      const result = await markNoShow(displayBooking.appointmentRequest.id)
      toast.success("Appointment marked as no-show")
      
      // Open shift dialog if there are service bookings to shift
      if (result.serviceBookings && result.serviceBookings.length > 0) {
        setFreedSlots(result.serviceBookings)
        setShiftDialogOpen(true)
      }
      
      if (onRescheduleSuccess) {
        onRescheduleSuccess()
      }
      
      // Close the details sidebar if no shift dialog opens
      if (!result.serviceBookings || result.serviceBookings.length === 0) {
        onOpenChange(false)
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to mark as no-show")
    } finally {
      setIsMarkingNoShow(false)
    }
  }

  const handleRescheduleSuccess = () => {
    setRescheduleDialogOpen(false)
    if (onRescheduleSuccess) {
      onRescheduleSuccess()
    }
  }

  const handleShiftSuccess = () => {
    setShiftDialogOpen(false)
    if (onRescheduleSuccess) {
      onRescheduleSuccess()
    }
    onOpenChange(false)
  }

  // If we have a selected booking in day list mode, show its details
  const displayBooking = selectedBooking || booking

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto pl-6 pb-8">
        <SheetHeader>
          <SheetTitle>
            {showClosedDay && !selectedBooking
              ? `Day closed - ${selectedDate?.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}`
              : showDayList && !selectedBooking 
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

        {/* Closed / cancelled day banner */}
        {selectedDayBlock && (showDayList || showClosedDay) && !selectedBooking && (
          <div className="mt-4 rounded-lg border-2 border-amber-200 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-950/40">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
              <div className="min-w-0">
                <p className="font-semibold text-amber-900 dark:text-amber-100">This day was closed/cancelled by staff.</p>
                {selectedDayBlock.blockType === "full" && (
                  <p className="text-xs text-amber-800 dark:text-amber-200 mt-1">Full day block</p>
                )}
                {selectedDayBlock.publicNote?.trim() && (
                  <p className="text-sm text-amber-800 dark:text-amber-200 mt-2">{selectedDayBlock.publicNote}</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Day Appointments List View (with or without bookings; closed-day may have zero) */}
        {(showDayList || showClosedDay) && !selectedBooking ? (
          <div className="mt-6 space-y-3">
            {dayBookings && dayBookings.length > 0 ? (
              <>
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
              </>
            ) : (
              <p className="text-sm text-muted-foreground">No appointments scheduled for this day.</p>
            )}
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

                {displayBooking.appointmentRequest.idNumber && (
                  <div className="flex items-start gap-3">
                    <CreditCard className="h-4 w-4 mt-0.5 text-muted-foreground" />
                    <div className="flex-1">
                      <p className="text-xs text-muted-foreground">Identification Number</p>
                      <p className="text-sm font-medium font-mono">{displayBooking.appointmentRequest.idNumber}</p>
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

                {displayBooking.location && (
                  <div className="flex items-start gap-3">
                    <MapPin className="h-4 w-4 mt-0.5 text-muted-foreground" />
                    <div className="flex-1">
                      <p className="text-xs text-muted-foreground">Location</p>
                      <p className="text-sm font-medium">{displayBooking.location}</p>
                    </div>
                  </div>
                )}

                {displayBooking.vehicleCount && (
                  <div className="flex items-start gap-3">
                    <Car className="h-4 w-4 mt-0.5 text-muted-foreground" />
                    <div className="flex-1">
                      <p className="text-xs text-muted-foreground">Vehicles in This Slot</p>
                      <p className="text-sm font-medium">{displayBooking.vehicleCount}</p>
                    </div>
                  </div>
                )}

                {displayBooking.appointmentRequest.numberOfVehicles && (
                  <div className="flex items-start gap-3">
                    <Car className="h-4 w-4 mt-0.5 text-muted-foreground" />
                    <div className="flex-1">
                      <p className="text-xs text-muted-foreground">Total Vehicles</p>
                      <p className="text-sm font-medium">{displayBooking.appointmentRequest.numberOfVehicles}</p>
                    </div>
                  </div>
                )}

                {displayBooking.appointmentRequest.numberOfVehicles > displayBooking.vehicleCount && (
                  <div className="flex items-start gap-3">
                    <AlertCircle className="h-4 w-4 mt-0.5 text-amber-600" />
                    <div className="flex-1">
                      <p className="text-xs font-medium text-amber-600">Split Booking</p>
                      <p className="text-xs text-muted-foreground">This appointment has multiple time slots</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Check-in and No-show Actions */}
            {(canCheckIn(displayBooking) || canMarkNoShow(displayBooking) || displayBooking.appointmentRequest.status === "checked_in") && (
              <div className="space-y-3">
                <h4 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider">
                  Appointment Status
                </h4>
                {displayBooking.appointmentRequest.status === "checked_in" ? (
                  <div className="bg-green-50 border-2 border-green-300 rounded-lg p-4 dark:bg-green-900/20 dark:border-green-800">
                    <div className="flex items-center justify-center gap-2 text-green-700 dark:text-green-300">
                      <CheckCircle className="h-5 w-5" />
                      <span className="font-bold">Customer Checked In</span>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-3">
                    <Button
                      onClick={handleCheckIn}
                      disabled={!canCheckIn(displayBooking) || isCheckingIn}
                      className="bg-green-600 hover:bg-green-700 disabled:opacity-50"
                      size="lg"
                    >
                      <CheckCircle className="h-4 w-4 mr-2" />
                      {isCheckingIn ? "Checking In..." : "Check In"}
                    </Button>
                    <Button
                      onClick={handleMarkNoShow}
                      disabled={!canMarkNoShow(displayBooking) || isMarkingNoShow}
                      variant="destructive"
                      size="lg"
                    >
                      <XCircle className="h-4 w-4 mr-2" />
                      {isMarkingNoShow ? "Processing..." : "No Show"}
                    </Button>
                  </div>
                )}
                {canCheckIn(displayBooking) && (
                  <p className="text-xs text-muted-foreground text-center">
                    Check in when customer arrives or mark as no-show if they don't
                  </p>
                )}
              </div>
            )}

            {/* Reschedule Action */}
            {canReschedule(displayBooking) && (
              <div className="space-y-3 bg-amber-50 border-2 border-amber-300 rounded-lg p-4 dark:bg-amber-900/20 dark:border-amber-800">
                <Button
                  onClick={() => setRescheduleDialogOpen(true)}
                  className="w-full bg-amber-600 hover:bg-amber-700"
                  size="lg"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Reschedule Appointment
                </Button>
                <p className="text-xs text-amber-700 dark:text-amber-300 text-center">
                  Customer will be notified via email
                </p>
              </div>
            )}

            {/* Related Bookings */}
            {displayBooking.appointmentRequest.serviceBookings && 
             displayBooking.appointmentRequest.serviceBookings.length > 1 && (
              <div className="space-y-3">
                <h4 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider">
                  Related Bookings
                </h4>
                <div className="space-y-2">
                  {displayBooking.appointmentRequest.serviceBookings
                    .sort((a, b) => {
                      const dateA = new Date(a.scheduledDate).getTime()
                      const dateB = new Date(b.scheduledDate).getTime()
                      if (dateA !== dateB) return dateA - dateB
                      
                      // Parse 12-hour time format correctly
                      const parseTime = (timeStr: string) => {
                        const [time, period] = timeStr.split(' ')
                        const [hours, minutes] = time.split(':').map(Number)
                        let hour24 = hours
                        if (period === 'PM' && hours !== 12) hour24 += 12
                        if (period === 'AM' && hours === 12) hour24 = 0
                        return hour24 * 60 + minutes
                      }
                      
                      return parseTime(a.scheduledTime) - parseTime(b.scheduledTime)
                    })
                    .map((relatedBooking, idx) => {
                      const isCurrent = relatedBooking.id === displayBooking.id
                      return (
                        <div
                          key={relatedBooking.id}
                          className={cn(
                            "rounded-lg p-3 border-2 transition-colors",
                            isCurrent 
                              ? "bg-primary/5 border-primary" 
                              : "bg-muted/30 border-muted"
                          )}
                        >
                          <div className="flex items-start gap-3">
                            <div className={cn(
                              "rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold shrink-0",
                              isCurrent ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                            )}>
                              {idx + 1}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <Badge className={cn("text-xs ring-1 ring-inset", serviceColors[relatedBooking.serviceName] || "")}>
                                  {relatedBooking.serviceName.replace("Vehicle ", "")}
                                </Badge>
                                {isCurrent && (
                                  <Badge variant="secondary" className="text-xs">Current</Badge>
                                )}
                              </div>
                              <p className="text-sm font-medium">
                                {new Date(relatedBooking.scheduledDate).toLocaleDateString("en-US", { 
                                  weekday: "short", 
                                  month: "short", 
                                  day: "numeric",
                                  timeZone: "UTC"
                                })} at {relatedBooking.scheduledTime}
                              </p>
                              {relatedBooking.location && (
                                <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                                  <MapPin className="h-3 w-3" />
                                  {relatedBooking.location}
                                </p>
                              )}
                              {relatedBooking.vehicleCount && (
                                <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                                  <Car className="h-3 w-3" />
                                  {relatedBooking.vehicleCount} vehicle{relatedBooking.vehicleCount !== 1 ? 's' : ''}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      )
                    })}
                </div>
              </div>
            )}

            {/* Additional Notes */}
            {displayBooking.appointmentRequest.additionalNotes && (
              <div className="space-y-3">
                <h4 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider">
                  Notes
                </h4>
                <div className="bg-muted/50 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <FileText className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
                    <p className="text-sm">{displayBooking.appointmentRequest.additionalNotes}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Metadata */}
            <div className="text-xs text-muted-foreground border-t pt-4">
              <p>Booked on {formatDate(displayBooking.appointmentRequest.createdAt)}</p>
              <p className="mt-1 flex items-center gap-2">
                Status: 
                <Badge 
                  variant="outline" 
                  className={cn(
                    "ml-1",
                    displayBooking.appointmentRequest.status === "checked_in" && "bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-300",
                    displayBooking.appointmentRequest.status === "no_show" && "bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-300",
                    displayBooking.appointmentRequest.status === "confirmed" && "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-300",
                    displayBooking.appointmentRequest.status === "cancelled" && "bg-gray-50 text-gray-700 border-gray-200 dark:bg-gray-900/20 dark:text-gray-300"
                  )}
                >
                  {displayBooking.appointmentRequest.status === "checked_in" ? "Checked In" : 
                   displayBooking.appointmentRequest.status === "no_show" ? "No Show" :
                   displayBooking.appointmentRequest.status}
                </Badge>
              </p>
            </div>
          </div>
        ) : null}
      </SheetContent>

      {/* Reschedule Dialog */}
      {displayBooking && (
        <RescheduleDialog
          open={rescheduleDialogOpen}
          onOpenChange={setRescheduleDialogOpen}
          booking={displayBooking}
          onSuccess={handleRescheduleSuccess}
        />
      )}

      {/* Shift Customer Dialog */}
      <ShiftCustomerDialog
        open={shiftDialogOpen}
        onOpenChange={setShiftDialogOpen}
        freedSlots={freedSlots}
        onSuccess={handleShiftSuccess}
      />
    </Sheet>
  )
}
