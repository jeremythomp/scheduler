"use client"

import { useState, useEffect } from "react"
import { ServiceBooking, AppointmentRequest } from "@prisma/client"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Calendar, Clock, User, AlertCircle, CheckCircle2, Briefcase } from "lucide-react"
import { MonthCalendar } from "@/components/landing/month-calendar"
import { TimeSlotPicker } from "@/components/landing/time-slot-picker"
import { rescheduleServiceBooking } from "@/app/(staff)/actions"
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

interface RescheduleDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  booking: ServiceBookingWithRequest | null
  onSuccess: () => void
}

const TIME_SLOTS = ["08:30 AM", "09:30 AM", "10:30 AM", "11:30 AM", "12:30 PM", "01:30 PM", "02:30 PM"]

// Service type mapping for API
const getServiceTypeForApi = (serviceName: string): string => {
  if (serviceName === "Vehicle Inspection") return "inspection"
  if (serviceName === "Vehicle Weighing") return "weighing"
  if (serviceName === "Vehicle Registration/Customer Service Center") return "registration"
  return "registration"
}

// Get max capacity based on service type
const getMaxCapacity = (serviceName: string): number => {
  if (serviceName === "Vehicle Inspection") return 12
  if (serviceName === "Vehicle Weighing") return 12
  if (serviceName === "Vehicle Registration/Customer Service Center") return 5
  return 5
}

export function RescheduleDialog({ open, onOpenChange, booking, onSuccess }: RescheduleDialogProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth())
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear())
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [selectedTime, setSelectedTime] = useState<string | null>(null)
  const [staffNotes, setStaffNotes] = useState("")
  const [isLoadingAvailability, setIsLoadingAvailability] = useState(false)
  const [slotCounts, setSlotCounts] = useState<Array<{date: string, time: string, count: number}>>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [maxCapacity, setMaxCapacity] = useState(5)

  // Reset state when dialog opens/closes
  useEffect(() => {
    if (open && booking) {
      const today = new Date()
      setCurrentMonth(today.getMonth())
      setCurrentYear(today.getFullYear())
      setSelectedDate(null)
      setSelectedTime(null)
      setStaffNotes("")
      setSlotCounts([])
      setMaxCapacity(getMaxCapacity(booking.serviceName))
    }
  }, [open, booking])

  // Fetch availability when month changes
  useEffect(() => {
    if (!open || !booking) return

    const fetchAvailability = async () => {
      setIsLoadingAvailability(true)
      try {
        const startDate = new Date(currentYear, currentMonth, 1)
        const endDate = new Date(currentYear, currentMonth + 1, 0)
        const serviceType = getServiceTypeForApi(booking.serviceName)
        
        const response = await fetch(
          `/api/availability?service=${serviceType}&startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}`
        )
        
        if (!response.ok) throw new Error("Failed to fetch availability")
        
        const data = await response.json()
        if (data.success) {
          setSlotCounts(data.slotCounts || [])
        }
      } catch (error) {
        console.error("Error fetching availability:", error)
        toast.error("Failed to load availability")
      } finally {
        setIsLoadingAvailability(false)
      }
    }

    fetchAvailability()
  }, [currentMonth, currentYear, open, booking])

  const handleMonthChange = (month: number, year: number) => {
    setCurrentMonth(month)
    setCurrentYear(year)
    setSelectedDate(null)
    setSelectedTime(null)
  }

  const handleDateSelect = (date: string) => {
    setSelectedDate(date)
    setSelectedTime(null)
  }

  const handleTimeSelect = (time: string) => {
    setSelectedTime(time)
  }

  const handleSubmit = async () => {
    if (!booking || !selectedDate || !selectedTime) {
      toast.error("Please select a date and time")
      return
    }

    // Check capacity before submitting
    const slot = slotCounts.find(s => s.date === selectedDate && s.time === selectedTime)
    const currentCount = slot?.count || 0
    const availableCapacity = maxCapacity - currentCount
    
    if (booking.vehicleCount > availableCapacity) {
      toast.error(`Not enough capacity. This booking needs ${booking.vehicleCount} spot${booking.vehicleCount !== 1 ? 's' : ''} but only ${availableCapacity} available.`)
      return
    }

    setIsSubmitting(true)
    try {
      await rescheduleServiceBooking({
        bookingId: booking.id,
        newDate: selectedDate,
        newTime: selectedTime,
        staffNotes: staffNotes.trim() || undefined
      })

      toast.success("Appointment rescheduled successfully", {
        description: `New date: ${(() => {
          const [year, month, day] = selectedDate.split('-').map(Number)
          const date = new Date(year, month - 1, day)
          return date.toLocaleDateString()
        })()} at ${selectedTime}`
      })
      
      onSuccess()
      onOpenChange(false)
    } catch (error: any) {
      console.error("Error rescheduling booking:", error)
      toast.error(error.message || "Failed to reschedule appointment")
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!booking) return null

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
      timeZone: "UTC"
    })
  }

  const canSubmit = selectedDate && selectedTime && !isSubmitting

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[85vw] sm:max-w-[85vw] md:max-w-[85vw] lg:max-w-[85vw] xl:max-w-[85vw] max-h-[95vh] overflow-y-auto">
        <DialogHeader className="space-y-3 pb-4">
          <DialogTitle className="flex items-center gap-2 text-2xl">
            <Calendar className="h-6 w-6" />
            Reschedule Appointment
          </DialogTitle>
          <DialogDescription className="text-base">
            Select a new date and time for this appointment
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-8 py-4">
          {/* Current Booking Info */}
          <div className="bg-muted/50 rounded-lg p-6 space-y-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground uppercase tracking-wider">
              <AlertCircle className="h-5 w-5" />
              Current Appointment
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="flex items-start gap-4">
                <User className="h-5 w-5 mt-0.5 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Customer</p>
                  <p className="text-base font-medium">{booking.appointmentRequest.customerName}</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <Briefcase className="h-5 w-5 mt-0.5 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Service</p>
                  <p className="text-base font-medium">{booking.serviceName}</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <Calendar className="h-5 w-5 mt-0.5 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Current Date & Time</p>
                  <p className="text-base font-medium">
                    {formatDate(booking.scheduledDate)} at {booking.scheduledTime}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* New Date Selection */}
          <div className="space-y-6">
            <h3 className="font-semibold text-lg flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5" />
              Select New Date & Time
            </h3>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Calendar */}
              <div className="min-h-[400px]">
                <MonthCalendar
                  currentMonth={currentMonth}
                  currentYear={currentYear}
                  selectedDate={selectedDate}
                  onDateSelect={handleDateSelect}
                  onMonthChange={handleMonthChange}
                  slotCounts={slotCounts}
                  totalSlotsPerDay={TIME_SLOTS.length}
                  maxCapacity={maxCapacity}
                />
              </div>

              {/* Time Slots */}
              <div className="min-h-[400px]">
                <TimeSlotPicker
                  selectedDate={selectedDate}
                  selectedTime={selectedTime}
                  onTimeSelect={handleTimeSelect}
                  timeSlots={TIME_SLOTS}
                  slotCounts={slotCounts}
                  maxCapacity={maxCapacity}
                  isLoadingAvailability={isLoadingAvailability}
                  numberOfVehicles={booking.vehicleCount}
                  gridColumns="lg:grid-cols-2"
                />
              </div>
            </div>
          </div>

          {/* Staff Notes */}
          <div className="space-y-3">
            <Label htmlFor="staffNotes" className="text-base font-semibold">
              Reason for Rescheduling <span className="text-muted-foreground font-normal">(Optional)</span>
            </Label>
            <Textarea
              id="staffNotes"
              placeholder="e.g., Customer needs more time to obtain inspection certificate"
              value={staffNotes}
              onChange={(e) => setStaffNotes(e.target.value)}
              rows={4}
              maxLength={500}
              className="resize-none text-base"
            />
            <p className="text-sm text-muted-foreground">
              {staffNotes.length}/500 characters
            </p>
          </div>

          {/* Selected Summary */}
          {selectedDate && selectedTime && (
            <div className="bg-green-50 border-2 border-green-300 rounded-lg p-6 dark:bg-green-900/20 dark:border-green-800">
              <div className="flex items-start gap-4">
                <CheckCircle2 className="h-6 w-6 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <p className="font-semibold text-lg text-green-900 dark:text-green-100">
                    New Appointment Selected
                  </p>
                  <p className="text-base text-green-700 dark:text-green-300 mt-2">
                    {(() => {
                      const [year, month, day] = selectedDate.split('-').map(Number)
                      const date = new Date(year, month - 1, day)
                      return date.toLocaleDateString('en-US', { 
                        weekday: 'long', 
                        month: 'long', 
                        day: 'numeric',
                        year: 'numeric'
                      })
                    })()} at {selectedTime}
                  </p>
                  <p className="text-sm text-green-600 dark:text-green-400 mt-3">
                    Customer will be notified via email
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-4 pt-6 border-t mt-6">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
            size="lg"
            className="min-w-[120px]"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!canSubmit}
            size="lg"
            className={cn(
              "min-w-[160px]",
              canSubmit && "bg-green-600 hover:bg-green-700"
            )}
          >
            {isSubmitting ? (
              <>
                <span className="inline-block animate-spin mr-2">⏳</span>
                Rescheduling...
              </>
            ) : (
              <>
                <Clock className="h-4 w-4 mr-2" />
                Reschedule Appointment
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
