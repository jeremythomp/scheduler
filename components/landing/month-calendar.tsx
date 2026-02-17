"use client"

import { ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { cn } from "@/lib/utils"

interface SlotCount {
  date: string
  time: string
  count: number
}

interface MonthCalendarProps {
  currentMonth: number // 0-11
  currentYear: number
  selectedDate: string | null
  onDateSelect: (date: string) => void
  onMonthChange: (month: number, year: number) => void
  slotCounts: SlotCount[]
  totalSlotsPerDay: number
  maxCapacity: number
}

// Maximum capacity per slot
const MAX_CAPACITY_PER_SLOT = 5

export function MonthCalendar({
  currentMonth,
  currentYear,
  selectedDate,
  onDateSelect,
  onMonthChange,
  slotCounts,
  totalSlotsPerDay,
  maxCapacity,
}: MonthCalendarProps) {
  const today = new Date()
  const todayString = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
  
  // Get first day of month and total days
  const firstDayOfMonth = new Date(currentYear, currentMonth, 1)
  const lastDayOfMonth = new Date(currentYear, currentMonth + 1, 0)
  const daysInMonth = lastDayOfMonth.getDate()
  const startingDayOfWeek = firstDayOfMonth.getDay() // 0 = Sunday
  
  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ]
  
  // Calculate date availability status
  const getDateAvailabilityStatus = (dateString: string, dayOfWeek: number): 'available' | 'limited' | 'full' | 'weekend' | 'past' => {
    // Parse date string directly to avoid timezone issues (YYYY-MM-DD format)
    const [year, month, day] = dateString.split('-').map(Number)
    const dateOnly = new Date(year, month - 1, day)
    const todayOnly = new Date(today.getFullYear(), today.getMonth(), today.getDate())
    
    // Check if date is in the past
    if (dateOnly < todayOnly) return 'past'
    
    // Check if weekend (Saturday = 6, Sunday = 0)
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6
    if (isWeekend) return 'weekend'
    
    // Calculate total capacity for this date
    const dateSlots = slotCounts.filter(s => s.date === dateString)
    const totalCapacity = totalSlotsPerDay * maxCapacity
    const totalBooked = dateSlots.reduce((sum, s) => sum + s.count, 0)
    const availableSpots = totalCapacity - totalBooked
    
    if (availableSpots === 0) return 'full'
    if (availableSpots <= totalCapacity * 0.3) return 'limited'
    return 'available'
  }
  
  // Generate calendar days array
  const calendarDays: (number | null)[] = []
  
  // Add empty cells for days before month starts
  for (let i = 0; i < startingDayOfWeek; i++) {
    calendarDays.push(null)
  }
  
  // Add actual days
  for (let day = 1; day <= daysInMonth; day++) {
    calendarDays.push(day)
  }
  
  // Navigate to previous month
  const handlePreviousMonth = () => {
    if (currentMonth === 0) {
      onMonthChange(11, currentYear - 1)
    } else {
      onMonthChange(currentMonth - 1, currentYear)
    }
  }
  
  // Navigate to next month
  const handleNextMonth = () => {
    if (currentMonth === 11) {
      onMonthChange(0, currentYear + 1)
    } else {
      onMonthChange(currentMonth + 1, currentYear)
    }
  }
  
  // Check if we can go to previous month (don't allow past months)
  const canGoPrevious = () => {
    if (currentYear > today.getFullYear()) return true
    if (currentYear === today.getFullYear() && currentMonth > today.getMonth()) return true
    return false
  }
  
  // Check if we can go to next month (allow up to 12 months ahead)
  const canGoNext = () => {
    const maxDate = new Date(today.getFullYear(), today.getMonth() + 12, 1)
    const currentDate = new Date(currentYear, currentMonth, 1)
    return currentDate < maxDate
  }
  
  // Get available months (current month + 12 months)
  const availableMonths: Array<{ label: string; value: string; month: number; year: number }> = []
  const currentDate = new Date()
  for (let i = 0; i <= 12; i++) {
    const date = new Date(currentDate.getFullYear(), currentDate.getMonth() + i, 1)
    availableMonths.push({
      value: `${date.getFullYear()}-${date.getMonth()}`,
      label: `${monthNames[date.getMonth()]} ${date.getFullYear()}`,
      month: date.getMonth(),
      year: date.getFullYear()
    })
  }
  
  const currentMonthValue = `${currentYear}-${currentMonth}`
  
  const handleMonthSelect = (value: string) => {
    const selected = availableMonths.find(m => m.value === value)
    if (selected) {
      onMonthChange(selected.month, selected.year)
    }
  }
  
  return (
    <div className="space-y-4">
      {/* Month Navigation */}
      <div className="flex items-center justify-between gap-2 px-2">
        <Button
          variant="outline"
          size="icon"
          onClick={handlePreviousMonth}
          disabled={!canGoPrevious()}
          className="h-8 w-8 rounded-full shrink-0"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        
        <Select value={currentMonthValue} onValueChange={handleMonthSelect}>
          <SelectTrigger className="w-auto border-0 font-bold text-base focus:ring-0 shrink-0">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {availableMonths.map((month) => (
              <SelectItem key={month.value} value={month.value}>
                {month.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        
        <Button
          variant="outline"
          size="icon"
          onClick={handleNextMonth}
          disabled={!canGoNext()}
          className="h-8 w-8 rounded-full shrink-0"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
      
      {/* Calendar Grid */}
      <div className="overflow-hidden rounded-2xl border-2 border-border bg-card">
        {/* Weekday Headers */}
        <div className="grid grid-cols-7 border-b-2 border-border bg-muted/50">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
            <div
              key={day}
              className="p-2 text-center text-xs font-bold text-muted-foreground"
            >
              {day}
            </div>
          ))}
        </div>
        
        {/* Calendar Days */}
        <div className="grid grid-cols-7">
          {calendarDays.map((day, index) => {
            if (day === null) {
              return <div key={`empty-${index}`} className="aspect-square border border-border bg-muted/20" />
            }
            
            const dateString = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
            const dayOfWeek = (startingDayOfWeek + day - 1) % 7
            const availabilityStatus = getDateAvailabilityStatus(dateString, dayOfWeek)
            const isSelected = selectedDate === dateString
            const isToday = dateString === todayString
            
            return (
              <button
                key={dateString}
                onClick={() => {
                  if (availabilityStatus !== 'past' && availabilityStatus !== 'weekend') {
                    onDateSelect(dateString)
                  }
                }}
                disabled={availabilityStatus === 'past' || availabilityStatus === 'weekend'}
                className={cn(
                  "aspect-square border border-border p-1.5 lg:p-2 text-sm font-semibold transition-all relative",
                  "hover:z-10",
                  isToday && "ring-2 ring-primary ring-inset",
                  isSelected && "ring-2 ring-blue-600 ring-inset z-10",
                  availabilityStatus === 'past' && "bg-muted/30 text-muted-foreground/40 cursor-not-allowed",
                  availabilityStatus === 'weekend' && "bg-muted/50 text-muted-foreground cursor-not-allowed",
                  availabilityStatus === 'available' && "bg-green-50 text-green-900 hover:bg-green-100 cursor-pointer",
                  availabilityStatus === 'limited' && "bg-amber-50 text-amber-900 hover:bg-amber-100 cursor-pointer",
                  availabilityStatus === 'full' && "bg-red-50 text-red-900 cursor-not-allowed"
                )}
              >
                <div className="flex flex-col items-center justify-center h-full">
                  <span className="text-sm lg:text-base">{day}</span>
                  {isToday && (
                    <span className="absolute bottom-1 h-1 w-1 rounded-full bg-primary" />
                  )}
                </div>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
