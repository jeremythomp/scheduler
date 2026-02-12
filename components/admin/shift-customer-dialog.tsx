"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Car, Clock, User, ArrowRight } from "lucide-react"
import { getEligibleForShift, shiftBookingToSlot } from "@/app/(staff)/actions"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

interface ShiftCustomerDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  freedSlots: Array<{
    id: number
    serviceName: string
    scheduledDate: Date
    scheduledTime: string
    vehicleCount: number
  }>
  onSuccess?: () => void
}

interface EligibleBooking {
  id: number
  serviceName: string
  scheduledDate: Date
  scheduledTime: string
  vehicleCount: number
  appointmentRequest: {
    id: number
    referenceNumber: string
    customerName: string
    customerEmail: string
    numberOfVehicles: number
  }
}

export function ShiftCustomerDialog({
  open,
  onOpenChange,
  freedSlots,
  onSuccess
}: ShiftCustomerDialogProps) {
  const [eligibleBookings, setEligibleBookings] = useState<EligibleBooking[]>([])
  const [selectedBookingId, setSelectedBookingId] = useState<number | null>(null)
  const [staffNotes, setStaffNotes] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [isShifting, setIsShifting] = useState(false)

  useEffect(() => {
    if (open && freedSlots.length > 0) {
      loadEligibleBookings()
    }
  }, [open, freedSlots])

  const loadEligibleBookings = async () => {
    setIsLoading(true)
    try {
      // Use the first freed slot to find eligible bookings
      const freedSlot = freedSlots[0]
      const dateStr = new Date(freedSlot.scheduledDate).toISOString().split('T')[0]
      
      const bookings = await getEligibleForShift(
        freedSlot.serviceName,
        dateStr,
        freedSlot.scheduledTime,
        freedSlot.vehicleCount
      )
      
      setEligibleBookings(bookings)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to load eligible bookings")
    } finally {
      setIsLoading(false)
    }
  }

  const handleShift = async () => {
    if (!selectedBookingId) return

    setIsShifting(true)
    try {
      const freedSlot = freedSlots[0]
      await shiftBookingToSlot(selectedBookingId, freedSlot.scheduledTime, staffNotes)
      toast.success("Customer shifted to earlier slot successfully")
      onOpenChange(false)
      if (onSuccess) {
        onSuccess()
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to shift customer")
    } finally {
      setIsShifting(false)
    }
  }

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

  if (freedSlots.length === 0) return null

  const freedSlot = freedSlots[0]

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Shift Customer to Earlier Slot</DialogTitle>
          <DialogDescription>
            Select a checked-in customer to move to the freed slot at {freedSlot.scheduledTime}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Freed Slot Info */}
          <div className="bg-amber-50 border-2 border-amber-200 rounded-lg p-4 dark:bg-amber-900/20 dark:border-amber-800">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-amber-900 dark:text-amber-100">
                  Available Slot
                </p>
                <p className="text-xs text-amber-700 dark:text-amber-300">
                  {freedSlot.serviceName} - {freedSlot.scheduledTime}
                </p>
              </div>
              <Badge className="bg-amber-600 text-white">
                {freedSlot.vehicleCount} {freedSlot.vehicleCount === 1 ? 'vehicle' : 'vehicles'}
              </Badge>
            </div>
          </div>

          {/* Eligible Bookings List */}
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">
              Loading eligible customers...
            </div>
          ) : eligibleBookings.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p className="font-medium">No eligible customers found</p>
              <p className="text-sm mt-2">
                All checked-in customers either have later appointments or require more vehicles than available.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              <Label className="text-sm font-semibold">Select Customer to Shift</Label>
              <div className="space-y-2 max-h-[300px] overflow-y-auto">
                {eligibleBookings.map((booking) => (
                  <button
                    key={booking.id}
                    onClick={() => setSelectedBookingId(booking.id)}
                    className={cn(
                      "w-full text-left p-4 rounded-lg border-2 transition-all",
                      selectedBookingId === booking.id
                        ? "bg-primary/5 border-primary"
                        : "bg-card border-border hover:bg-muted/50"
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <Avatar className="h-10 w-10 mt-1">
                        <AvatarFallback className={cn("font-bold text-sm", getAvatarColor(booking.appointmentRequest.customerName))}>
                          {getInitials(booking.appointmentRequest.customerName)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div>
                            <p className="font-semibold">{booking.appointmentRequest.customerName}</p>
                            <p className="text-xs text-muted-foreground">{booking.appointmentRequest.referenceNumber}</p>
                          </div>
                          {selectedBookingId === booking.id && (
                            <Badge variant="default">Selected</Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            <span>Currently: {booking.scheduledTime}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Car className="h-3 w-3" />
                            <span>{booking.vehicleCount} vehicle{booking.vehicleCount !== 1 ? 's' : ''}</span>
                          </div>
                        </div>
                        {selectedBookingId === booking.id && (
                          <div className="mt-2 flex items-center gap-2 text-sm text-primary">
                            <span className="font-medium">{booking.scheduledTime}</span>
                            <ArrowRight className="h-4 w-4" />
                            <span className="font-medium">{freedSlot.scheduledTime}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Staff Notes */}
          {selectedBookingId && (
            <div className="space-y-2">
              <Label htmlFor="staff-notes" className="text-sm font-semibold">
                Staff Notes (Optional)
              </Label>
              <Textarea
                id="staff-notes"
                placeholder="Add a note about why this customer was shifted..."
                value={staffNotes}
                onChange={(e) => setStaffNotes(e.target.value)}
                rows={3}
              />
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isShifting}>
            Cancel
          </Button>
          <Button
            onClick={handleShift}
            disabled={!selectedBookingId || isShifting}
          >
            {isShifting ? "Shifting..." : "Shift Customer"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
