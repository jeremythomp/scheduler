"use client"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { CheckCircle, Car } from "lucide-react"

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
  splitSlots?: { time: string; vehicles: number }[]  // Slots in a split booking
  numberOfVehicles?: number  // Total vehicles being booked
  constrainedByPreviousService?: boolean  // If true, some slots are disabled by time constraints
  gridColumns?: string  // Custom grid column classes (e.g., "lg:grid-cols-2")
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
  splitSlots = [],
  numberOfVehicles = 1,
  constrainedByPreviousService = false,
  gridColumns = "lg:grid-cols-1",
}: TimeSlotPickerProps) {
  // Get slot availability info
  const getSlotInfo = (time: string) => {
    const slot = slotCounts.find(s => selectedDate && s.date === selectedDate && s.time === time)
    const bookedCount = slot?.count ?? 0
    const spotsRemaining = maxCapacity - bookedCount
    
    return {
      spotsRemaining,
      isFull: spotsRemaining === 0,
      isLimited: spotsRemaining > 0 && spotsRemaining <= 2,
      hasEnoughCapacity: spotsRemaining >= numberOfVehicles,
      needsSplit: numberOfVehicles > 1 && spotsRemaining < numberOfVehicles && spotsRemaining > 0
    }
  }
  
  // Check if time slot is taken by user for another service
  const isSlotTakenByUser = (time: string): boolean => {
    if (!selectedDate) return false
    return userTakenSlots.some(slot => slot.date === selectedDate && slot.time === time)
  }
  
  // Check if time slot is part of a split booking
  const getSplitSlotInfo = (time: string) => {
    const splitSlot = splitSlots.find(slot => slot.time === time)
    if (!splitSlot) return null
    
    const slotIndex = splitSlots.findIndex(slot => slot.time === time)
    return {
      vehicles: splitSlot.vehicles,
      position: slotIndex + 1,
      total: splitSlots.length
    }
  }
  
  // Check if time slot is in the past
  const isTimeSlotInPast = (timeString: string): boolean => {
    if (!selectedDate) return false
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
        {constrainedByPreviousService && (
          <div className="mt-2 bg-purple-50 border border-purple-200 rounded px-2 py-1.5 text-xs text-purple-800">
            <strong>Note:</strong> Some times are disabled - must be after previous service
          </div>
        )}
        {numberOfVehicles > 1 && (
          <div className="mt-2 bg-blue-50 border border-blue-200 rounded px-2 py-1.5 text-xs text-blue-800">
            Booking {numberOfVehicles} vehicles - may require splitting across slots
          </div>
        )}
      </div>
      
      <div className="p-4">
        <div className={cn("grid grid-cols-2 md:grid-cols-3 gap-3", gridColumns)}>
          {timeSlots.map((time) => {
            const slotInfo = getSlotInfo(time)
            const isSelected = selectedTime === time
            const isPast = isTimeSlotInPast(time)
            const isTakenByUser = isSlotTakenByUser(time)
            const splitInfo = getSplitSlotInfo(time)
            const isInSplit = splitInfo !== null
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
                  isSelected && !isInSplit && "bg-green-600 hover:bg-green-700 text-white ring-2 ring-green-600",
                  isInSplit && "border-2 border-cyan-400 bg-cyan-50 text-cyan-900 hover:bg-cyan-100 ring-2 ring-cyan-300",
                  !isSelected && !isDisabled && !isInSplit && slotInfo.isLimited && "border-amber-300 bg-amber-50 text-amber-900 hover:bg-amber-100",
                  !isSelected && !isDisabled && !slotInfo.isLimited && !isInSplit && "hover:bg-primary hover:text-primary-foreground",
                  isTakenByUser && "border-purple-300 bg-purple-50/50 cursor-not-allowed",
                  (isDisabled && !isTakenByUser) && "opacity-50 cursor-not-allowed"
                )}
              >
                {isSelected && !isInSplit && (
                  <CheckCircle className="h-4 w-4 absolute top-2 right-2" />
                )}
                
                {isInSplit && (
                  <div className="absolute top-1 right-1 bg-cyan-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded">
                    {splitInfo.position}/{splitInfo.total}
                  </div>
                )}
                
                <span className="text-base mb-1">{time}</span>
                
                {isInSplit ? (
                  <span className="text-xs text-cyan-800 font-bold text-center leading-tight">
                    {splitInfo.vehicles} vehicle{splitInfo.vehicles !== 1 ? 's' : ''}<br />
                    <span className="text-[10px] font-medium">Split booking</span>
                  </span>
                ) : isTakenByUser ? (
                  <span className="text-xs text-purple-700 font-medium text-center leading-tight">
                    Already booked<br />for another service
                  </span>
                ) : !isDisabled ? (
                  <span className="flex flex-col items-center gap-0.5 text-xs font-medium">
                    <span className="flex items-center gap-1">
                      <Car className="h-3 w-3" />
                      {slotInfo.spotsRemaining} {slotInfo.spotsRemaining === 1 ? 'spot' : 'spots'}
                    </span>
                    {slotInfo.needsSplit && (
                      <span className="text-[10px] text-amber-600 font-semibold">
                        Split needed
                      </span>
                    )}
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
