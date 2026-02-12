"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { AlertCircle, Calendar as CalendarIcon } from "lucide-react"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { blockDay, getServiceBookings } from "@/app/(staff)/actions"
import { toast } from "sonner"
import { format } from "date-fns"
import { cn } from "@/lib/utils"

interface BlockDayDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}

type BlockType = 'full' | 'morning' | 'afternoon'

const MORNING_SLOTS = ["08:30 AM", "09:30 AM", "10:30 AM", "11:30 AM"]
const AFTERNOON_SLOTS = ["12:30 PM", "01:30 PM", "02:30 PM"]

export function BlockDayDialog({
  open,
  onOpenChange,
  onSuccess
}: BlockDayDialogProps) {
  const [date, setDate] = useState<Date>()
  const [blockType, setBlockType] = useState<BlockType>('full')
  const [reason, setReason] = useState("")
  const [publicNote, setPublicNote] = useState("")
  const [affectedCount, setAffectedCount] = useState(0)
  const [isCheckingImpact, setIsCheckingImpact] = useState(false)
  const [isBlocking, setIsBlocking] = useState(false)
  const [showConfirmation, setShowConfirmation] = useState(false)

  useEffect(() => {
    if (date && open) {
      checkImpact()
    }
  }, [date, blockType, open])

  const checkImpact = async () => {
    if (!date) return

    setIsCheckingImpact(true)
    try {
      const bookings = await getServiceBookings({
        startDate: date,
        endDate: date
      })

      // Determine which time slots are affected
      let affectedSlots: string[]
      if (blockType === 'full') {
        affectedSlots = [...MORNING_SLOTS, ...AFTERNOON_SLOTS]
      } else if (blockType === 'morning') {
        affectedSlots = MORNING_SLOTS
      } else {
        affectedSlots = AFTERNOON_SLOTS
      }

      // Count unique appointments (not bookings) that will be affected
      const affectedAppointmentIds = new Set<number>()
      for (const booking of bookings) {
        if (
          affectedSlots.includes(booking.scheduledTime) &&
          (booking.appointmentRequest.status === "confirmed" || booking.appointmentRequest.status === "checked_in")
        ) {
          affectedAppointmentIds.add(booking.appointmentRequest.id)
        }
      }

      setAffectedCount(affectedAppointmentIds.size)
    } catch (error) {
      console.error("Failed to check impact:", error)
    } finally {
      setIsCheckingImpact(false)
    }
  }

  const handleContinue = () => {
    if (!date || !reason.trim() || !publicNote.trim()) {
      toast.error("Please fill in all required fields")
      return
    }
    setShowConfirmation(true)
  }

  const handleConfirmBlock = async () => {
    if (!date) return

    setIsBlocking(true)
    try {
      const dateStr = format(date, 'yyyy-MM-dd')
      await blockDay({
        date: dateStr,
        blockType,
        reason,
        publicNote
      })
      
      toast.success(`Day blocked successfully. ${affectedCount} appointment(s) cancelled and customers notified.`)
      onOpenChange(false)
      resetForm()
      if (onSuccess) {
        onSuccess()
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to block day")
    } finally {
      setIsBlocking(false)
    }
  }

  const resetForm = () => {
    setDate(undefined)
    setBlockType('full')
    setReason("")
    setPublicNote("")
    setAffectedCount(0)
    setShowConfirmation(false)
  }

  const getBlockTypeLabel = (type: BlockType) => {
    switch (type) {
      case 'full':
        return 'Full Day (All appointments)'
      case 'morning':
        return `Morning (${MORNING_SLOTS[0]} - ${MORNING_SLOTS[MORNING_SLOTS.length - 1]})`
      case 'afternoon':
        return `Afternoon (${AFTERNOON_SLOTS[0]} - ${AFTERNOON_SLOTS[AFTERNOON_SLOTS.length - 1]})`
    }
  }

  return (
    <Dialog open={open} onOpenChange={(open) => {
      onOpenChange(open)
      if (!open) {
        resetForm()
      }
    }}>
      <DialogContent className="max-w-2xl">
        {!showConfirmation ? (
          <>
            <DialogHeader>
              <DialogTitle>Block Day or Half-Day</DialogTitle>
              <DialogDescription>
                Block appointments for a full day or specific period due to unforeseen circumstances
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-6 py-4">
              {/* Date Picker */}
              <div className="space-y-2">
                <Label className="text-sm font-semibold">
                  Select Date <span className="text-red-500">*</span>
                </Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !date && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {date ? format(date, "PPP") : "Pick a date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={date}
                      onSelect={setDate}
                      disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>

              {/* Block Type Selector */}
              <div className="space-y-2">
                <Label className="text-sm font-semibold">
                  Block Type <span className="text-red-500">*</span>
                </Label>
                <Select value={blockType} onValueChange={(value) => setBlockType(value as BlockType)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select block type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="full">{getBlockTypeLabel('full')}</SelectItem>
                    <SelectItem value="morning">{getBlockTypeLabel('morning')}</SelectItem>
                    <SelectItem value="afternoon">{getBlockTypeLabel('afternoon')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Impact Preview */}
              {date && (
                <div className={cn(
                  "rounded-lg p-4 border-2",
                  affectedCount > 0 
                    ? "bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800"
                    : "bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800"
                )}>
                  <div className="flex items-start gap-3">
                    <AlertCircle className={cn(
                      "h-5 w-5 mt-0.5",
                      affectedCount > 0 ? "text-red-600 dark:text-red-400" : "text-green-600 dark:text-green-400"
                    )} />
                    <div className="flex-1">
                      <p className={cn(
                        "font-semibold",
                        affectedCount > 0 ? "text-red-900 dark:text-red-100" : "text-green-900 dark:text-green-100"
                      )}>
                        {isCheckingImpact ? "Checking impact..." : 
                         affectedCount === 0 ? "No appointments will be affected" :
                         `${affectedCount} appointment${affectedCount !== 1 ? 's' : ''} will be cancelled`}
                      </p>
                      {affectedCount > 0 && !isCheckingImpact && (
                        <p className="text-sm text-red-700 dark:text-red-300 mt-1">
                          Affected customers will receive cancellation emails with the public note below.
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Internal Reason */}
              <div className="space-y-2">
                <Label htmlFor="reason" className="text-sm font-semibold">
                  Internal Reason <span className="text-red-500">*</span>
                </Label>
                <Textarea
                  id="reason"
                  placeholder="Internal notes about why this day is being blocked (not shown to customers)..."
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  rows={3}
                />
                <p className="text-xs text-muted-foreground">
                  For internal records only
                </p>
              </div>

              {/* Public Note */}
              <div className="space-y-2">
                <Label htmlFor="public-note" className="text-sm font-semibold">
                  Public Note <span className="text-red-500">*</span>
                </Label>
                <Textarea
                  id="public-note"
                  placeholder="Apologetic message to customers explaining the cancellation..."
                  value={publicNote}
                  onChange={(e) => setPublicNote(e.target.value)}
                  rows={4}
                />
                <p className="text-xs text-muted-foreground">
                  This will be shown to customers in cancellation emails and on the landing page
                </p>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleContinue}
                disabled={!date || !reason.trim() || !publicNote.trim() || isCheckingImpact}
                variant="destructive"
              >
                Continue
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="text-red-600">Confirm Day Block</DialogTitle>
              <DialogDescription>
                Please review and confirm this action
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="bg-red-50 border-2 border-red-200 rounded-lg p-4 dark:bg-red-900/20 dark:border-red-800">
                <div className="flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 mt-0.5" />
                  <div>
                    <p className="font-semibold text-red-900 dark:text-red-100">
                      Warning: This action cannot be undone
                    </p>
                    <ul className="text-sm text-red-700 dark:text-red-300 mt-2 space-y-1 list-disc list-inside">
                      <li>{affectedCount} appointment{affectedCount !== 1 ? 's' : ''} will be cancelled</li>
                      <li>{affectedCount} email{affectedCount !== 1 ? 's' : ''} will be sent to customers</li>
                      <li>A notice will appear on the landing page</li>
                      <li>The {blockType === 'full' ? 'entire day' : blockType} will be blocked from new bookings</li>
                    </ul>
                  </div>
                </div>
              </div>

              <div className="space-y-3 bg-muted/50 rounded-lg p-4">
                <div>
                  <p className="text-sm font-semibold text-muted-foreground">Date</p>
                  <p className="font-medium">{date && format(date, "PPP")}</p>
                </div>
                <div>
                  <p className="text-sm font-semibold text-muted-foreground">Block Type</p>
                  <p className="font-medium">{getBlockTypeLabel(blockType)}</p>
                </div>
                <div>
                  <p className="text-sm font-semibold text-muted-foreground">Public Note</p>
                  <p className="text-sm">{publicNote}</p>
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setShowConfirmation(false)} disabled={isBlocking}>
                Back
              </Button>
              <Button
                onClick={handleConfirmBlock}
                disabled={isBlocking}
                variant="destructive"
              >
                {isBlocking ? "Blocking..." : `Confirm & Send ${affectedCount} Email${affectedCount !== 1 ? 's' : ''}`}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
