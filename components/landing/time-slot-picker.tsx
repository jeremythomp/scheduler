"use client"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { CheckCircle, Users } from "lucide-react"

interface SlotCount {
  date: string
  time: string
  count: number
}

interface TimeSlotPickerProps {
  selectedDate: string | null
  selectedTime: string | null
  onTimeSelect: (time: string) => void
  timeSlots: string[]
  slotCounts: SlotCount[]
  maxCapacity: number
  isLoadingAvailability?: boolean
  userTakenSlots?: { date: string; time: string }[]
}

export function TimeSlotPicker({
  selectedDate,
  selectedTime,
  onTimeSelect,
  timeSlots,
  slotCounts,
  maxCapacity,
  isLoadingAvailability = false,
  userTakenSlots = [],
}: TimeSlotPickerProps) {
  // Get slot availability info
  const getSlotInfo = (time: string) => {
    const slot = slotCounts.find(s => selectedDate && s.date === selectedDate && s.time === time)
    const bookedCount = slot?.count ?? 0
    const spotsRemaining = maxCapacity - bookedCount
    
    return {
      spotsRemaining,
      isFull: spotsRemaining === 0,
      isLimited: spotsRemaining > 0 && spotsRemaining <= 2
    }
  }
  
  // Check if time slot is taken by user for another service
  const isSlotTakenByUser = (time: string): boolean => {
    if (!selectedDate) return false
    return userTakenSlots.some(slot => slot.date === selectedDate && slot.time === time)
  }
  
  // Check if time slot is in the past
  const isTimeSlotInPast = (timeString: string): boolean => {
    const now = new Date()
    // Parse date string directly to avoid timezone issues (YYYY-MM-DD format)
    const [year, month, day] = selectedDate.split('-').map(Number)
    const selectedDateObj = new Date(year, month - 1, day)
    
    // Parse the time string (e.g., "08:30 AM")
    const [time, period] = timeString.split(' ')
    const [hours, minutes] = time.split(':').map(Number)
    
    // Convert to 24-hour format
    let hour24 = hours
    if (period === 'PM' && hours !== 12) {
      hour24 = hours + 12
    } else if (period === 'AM' && hours === 12) {
      hour24 = 0
    }
    
    // Create a date object for the slot time
    const slotTime = new Date(selectedDateObj)
    slotTime.setHours(hour24, minutes, 0, 0)
    
    // Check if the slot time is in the past
    return slotTime < now
  }
  
  // Format date for display
  const formatDate = (dateString: string) => {
    // Parse date string directly to avoid timezone issues (YYYY-MM-DD format)
    const [year, month, day] = dateString.split('-').map(Number)
    const date = new Date(year, month - 1, day)
    return date.toLocaleDateString('en-US', { 
      weekday: 'long', 
      month: 'long', 
      day: 'numeric',
      year: 'numeric'
    })
  }
  
  if (!selectedDate) {
    return (
      <div className="rounded-2xl border-2 border-border bg-card">
        <div className="border-b-2 border-border bg-muted/50 p-4">
          <h3 className="font-bold text-lg">Available Time Slots</h3>
          <p className="text-sm text-muted-foreground">Select a date to view times</p>
        </div>
        <div className="p-6">
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <div className="text-muted-foreground mb-2">
              <svg className="w-12 h-12 mx-auto mb-3 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <p className="text-sm font-medium text-muted-foreground">Please select a date from the calendar</p>
            <p className="text-xs text-muted-foreground mt-1">Available time slots will appear here</p>
          </div>
        </div>
      </div>
    )
  }
  
  if (isLoadingAvailability) {
    return (
      <div className="rounded-2xl border-2 border-border bg-card p-6">
        <div className="flex items-center justify-center py-8">
          <div className="text-sm font-medium text-muted-foreground">Loading time slots...</div>
        </div>
      </div>
    )
  }
  
  return (
    <div className="rounded-2xl border-2 border-border bg-card">
      <div className="border-b-2 border-border bg-muted/50 p-4">
        <h3 className="font-bold text-lg">Available Time Slots</h3>
        <p className="text-sm text-muted-foreground">{formatDate(selectedDate)}</p>
      </div>
      
      <div className="p-4">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-1 gap-3">
          {timeSlots.map((time) => {
            const slotInfo = getSlotInfo(time)
            const isSelected = selectedTime === time
            const isPast = isTimeSlotInPast(time)
            const isTakenByUser = isSlotTakenByUser(time)
            const isDisabled = slotInfo.isFull || isPast || isTakenByUser
            
            return (
              <Button
                key={time}
                variant={isSelected ? "default" : "outline"}
                size="lg"
                onClick={() => !isDisabled && onTimeSelect(time)}
                disabled={isDisabled}
                className={cn(
                  "flex flex-col items-center justify-center h-auto py-3 px-4 rounded-xl font-bold transition-all relative",
                  isSelected && "bg-green-600 hover:bg-green-700 text-white ring-2 ring-green-600",
                  !isSelected && !isDisabled && slotInfo.isLimited && "border-amber-300 bg-amber-50 text-amber-900 hover:bg-amber-100",
                  !isSelected && !isDisabled && !slotInfo.isLimited && "hover:bg-primary hover:text-primary-foreground",
                  isTakenByUser && "border-purple-300 bg-purple-50/50 cursor-not-allowed",
                  (isDisabled && !isTakenByUser) && "opacity-50 cursor-not-allowed"
                )}
              >
                {isSelected && (
                  <CheckCircle className="h-4 w-4 absolute top-2 right-2" />
                )}
                
                <span className="text-base mb-1">{time}</span>
                
                {isTakenByUser ? (
                  <span className="text-xs text-purple-700 font-medium text-center leading-tight">
                    Already booked<br />for another service
                  </span>
                ) : !isDisabled ? (
                  <span className="flex items-center gap-1 text-xs font-medium">
                    <Users className="h-3 w-3" />
                    {slotInfo.spotsRemaining} {slotInfo.spotsRemaining === 1 ? 'spot' : 'spots'}
                  </span>
                ) : isPast ? (
                  <span className="text-xs text-muted-foreground">Past</span>
                ) : (
                  <span className="text-xs text-muted-foreground">Full</span>
                )}
              </Button>
            )
          })}
        </div>
        
        {timeSlots.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            No time slots available for this date
          </div>
        )}
      </div>
    </div>
  )
}
