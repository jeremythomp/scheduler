"use client"

import { useState, useMemo, useEffect } from "react"
import { CalendarX2, Building2, ClipboardCheck, Scale, UserCheck, ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import Link from "next/link"

type ServiceType = "inspection" | "weighing" | "registration"

interface TimeSlot {
  time: string
  available: boolean
  booked?: boolean
}

interface DaySchedule {
  day: string
  date: number
  slots: TimeSlot[]
  weekend: boolean
  fullyBooked?: boolean
  isToday?: boolean
  isPast?: boolean
}

// Generate time slots for each service type
const generateTimeSlots = (serviceType: ServiceType): string[] => {
  switch (serviceType) {
    case "weighing":
      // Weigh Bridge: 8:30am-12:00pm, break 12:01-1:01pm, then 1:02pm-3:30pm
      return [
        "08:30 AM",
        "09:30 AM",
        "10:30 AM",
        "11:30 AM",
        // Break period
        "01:02 PM",
        "02:02 PM",
        "03:02 PM",
      ]
    case "inspection":
      // Vehicle Inspections: 8:30am-11:00am, break 11:01am-1:00pm, then 1:01pm-3:30pm
      return [
        "08:30 AM",
        "09:30 AM",
        "10:30 AM",
        // Break period
        "01:01 PM",
        "02:01 PM",
        "03:01 PM",
      ]
    case "registration":
      // Vehicle Registrations: 8:30am-1:30pm, blocked 1:31pm-4:30pm
      return [
        "08:30 AM",
        "09:30 AM",
        "10:30 AM",
        "11:30 AM",
        "12:30 PM",
        "01:30 PM",
      ]
    default:
      return []
  }
}

// Generate weekly schedule with real dates
const generateWeekSchedule = (
  serviceType: ServiceType, 
  week: "this" | "next",
  bookedSlots: Array<{ date: string; time: string }> = []
): DaySchedule[] => {
  const baseSlots = generateTimeSlots(serviceType)
  const today = new Date()
  const currentDate = today.getDate()
  const currentMonth = today.getMonth()
  const currentYear = today.getFullYear()
  
  // Get the start of the selected week (Monday)
  const currentDay = today.getDay() // 0 = Sunday, 1 = Monday, etc.
  const diff = currentDay === 0 ? -6 : 1 - currentDay // Adjust to get Monday
  const monday = new Date(today)
  monday.setDate(today.getDate() + diff)
  
  // Add 7 days if "next week" is selected
  if (week === "next") {
    monday.setDate(monday.getDate() + 7)
  }
  
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
  const weekSchedule: DaySchedule[] = []
  
  for (let i = 0; i < 7; i++) {
    const dayDate = new Date(monday)
    dayDate.setDate(monday.getDate() + i)
    
    const date = dayDate.getDate()
    const isWeekend = i >= 5 // Saturday and Sunday
    
    // Create date objects for comparison (without time)
    const dayDateOnly = new Date(dayDate.getFullYear(), dayDate.getMonth(), dayDate.getDate())
    const todayDateOnly = new Date(currentYear, currentMonth, currentDate)
    
    const isPast = dayDateOnly < todayDateOnly
    const isToday = dayDateOnly.getTime() === todayDateOnly.getTime()
    
    // Format date for comparison with API data
    const dateString = dayDate.toISOString().split('T')[0]
    
    // Check which slots are booked from real data
    const bookedTimes = bookedSlots
      .filter(slot => slot.date === dateString)
      .map(slot => slot.time)
    
    // Check if day is fully booked
    const availableSlots = baseSlots.filter(time => !bookedTimes.includes(time))
    const isFullyBooked = !isPast && !isWeekend && availableSlots.length === 0
    
    weekSchedule.push({
      day: days[i],
      date,
      slots: baseSlots.map((time) => ({
        time,
        available: !isPast && !isWeekend,
        booked: bookedTimes.includes(time),
      })),
      weekend: isWeekend,
      fullyBooked: isFullyBooked,
      isToday,
      isPast,
    })
  }
  
  return weekSchedule
}

export function CalendarSection() {
  const [selectedWeek, setSelectedWeek] = useState<"this" | "next">("this")
  const [selectedService, setSelectedService] = useState<ServiceType>("inspection")
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null)
  const [bookedSlots, setBookedSlots] = useState<Array<{ date: string; time: string }>>([])
  const [isLoadingAvailability, setIsLoadingAvailability] = useState(false)
  
  // Calculate date range for the selected week
  const { startDate, endDate } = useMemo(() => {
    const today = new Date()
    const currentDay = today.getDay()
    const diff = currentDay === 0 ? -6 : 1 - currentDay
    const monday = new Date(today)
    monday.setDate(today.getDate() + diff)
    
    if (selectedWeek === "next") {
      monday.setDate(monday.getDate() + 7)
    }
    
    const sunday = new Date(monday)
    sunday.setDate(monday.getDate() + 6)
    
    return {
      startDate: monday.toISOString().split('T')[0],
      endDate: sunday.toISOString().split('T')[0]
    }
  }, [selectedWeek])
  
  // Fetch availability when service or week changes
  useEffect(() => {
    const fetchAvailability = async () => {
      setIsLoadingAvailability(true)
      try {
        const response = await fetch(
          `/api/availability?service=${selectedService}&startDate=${startDate}&endDate=${endDate}`
        )
        const data = await response.json()
        
        if (data.success) {
          setBookedSlots(data.bookedSlots)
        } else {
          console.error("Failed to fetch availability:", data.error)
          setBookedSlots([])
        }
      } catch (error) {
        console.error("Error fetching availability:", error)
        setBookedSlots([])
      } finally {
        setIsLoadingAvailability(false)
      }
    }
    
    fetchAvailability()
  }, [selectedService, selectedWeek, startDate, endDate])
  
  // Generate schedule based on selected service, week, and booked slots
  const weekSchedule = useMemo(
    () => generateWeekSchedule(selectedService, selectedWeek, bookedSlots),
    [selectedService, selectedWeek, bookedSlots]
  )

  return (
    <section id="real-time-availability" className="border-t border-border bg-card py-16 scroll-mt-20">
      <div className="mx-auto max-w-7xl px-4 md:px-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-10">
          <div>
            <h2 className="text-3xl font-bold text-foreground mb-2">
              Real-time Availability
            </h2>
            <p className="text-muted-foreground">
              Browse open slots for the upcoming week at the Central Station.
            </p>
          </div>
          
          <div className="flex items-center gap-4 bg-muted p-2 rounded-full ring-1 ring-border self-start md:self-auto">
            <Button
              variant={selectedWeek === "this" ? "default" : "ghost"}
              size="sm"
              onClick={() => {
                setSelectedWeek("this")
                setSelectedSlot(null)
              }}
              className="rounded-full text-sm font-bold"
            >
              This Week
            </Button>
            <Button
              variant={selectedWeek === "next" ? "default" : "ghost"}
              size="sm"
              onClick={() => {
                setSelectedWeek("next")
                setSelectedSlot(null)
              }}
              className="rounded-full text-sm font-medium"
            >
              Next Week
            </Button>
          </div>
        </div>
        
        {/* Service Tabs */}
        <div className="grid grid-cols-2 md:flex md:flex-wrap gap-3 mb-6">
          <Button
            variant={selectedService === "inspection" ? "default" : "outline"}
            size="lg"
            onClick={() => {
              setSelectedService("inspection")
              setSelectedSlot(null)
            }}
            className={`rounded-full font-bold transition-all ${
              selectedService === "inspection"
                ? "bg-primary text-primary-foreground shadow-lg"
                : "bg-card hover:bg-muted"
            }`}
          >
            <ClipboardCheck className="h-4 w-4 mr-2" />
            Vehicle Inspection
          </Button>
          
          <Button
            variant={selectedService === "weighing" ? "default" : "outline"}
            size="lg"
            onClick={() => {
              setSelectedService("weighing")
              setSelectedSlot(null)
            }}
            className={`rounded-full font-bold transition-all ${
              selectedService === "weighing"
                ? "bg-primary text-primary-foreground shadow-lg"
                : "bg-card hover:bg-muted"
            }`}
          >
            <Scale className="h-4 w-4 mr-2" />
            Vehicle Weighing
          </Button>
          
          <Button
            variant={selectedService === "registration" ? "default" : "outline"}
            size="lg"
            onClick={() => {
              setSelectedService("registration")
              setSelectedSlot(null)
            }}
            className={`col-span-2 md:col-span-1 rounded-full font-bold transition-all ${
              selectedService === "registration"
                ? "bg-primary text-primary-foreground shadow-lg"
                : "bg-card hover:bg-muted"
            }`}
          >
            <UserCheck className="h-4 w-4 mr-2" />
            Vehicle Registration
          </Button>
        </div>
        
        {/* Calendar Grid */}
        <div className="overflow-hidden rounded-3xl border border-border bg-muted relative">
          {isLoadingAvailability && (
            <div className="absolute inset-0 bg-background/50 backdrop-blur-sm z-10 flex items-center justify-center">
              <div className="text-sm font-medium text-muted-foreground">Loading availability...</div>
            </div>
          )}
          <div className="overflow-x-auto snap-x snap-mandatory md:snap-none md:overflow-x-visible">
            <div className="inline-block md:block min-w-full">
              {/* Header Row */}
              <div className="flex md:grid md:grid-cols-7 border-b border-border bg-card">
                {weekSchedule.map((day, idx) => (
                  <div
                    key={idx}
                    className={`
                      p-4 text-center border-r border-border last:border-r-0
                      w-[120px] flex-shrink-0 md:w-auto md:flex-shrink
                      snap-start md:snap-align-none
                      ${day.weekend ? "bg-muted" : ""}
                      ${day.isToday ? "bg-primary/10" : ""}
                    `}
                  >
                    <span className="block text-xs font-bold uppercase text-muted-foreground mb-1">
                      {day.day}
                    </span>
                    <span
                      className={`block text-xl font-bold ${
                        day.weekend ? "text-muted-foreground" : ""
                      }`}
                    >
                      {day.date}
                    </span>
                  </div>
                ))}
              </div>
              
              {/* Slots Grid */}
              <div className="flex md:grid md:grid-cols-7 min-h-[400px]">
                {weekSchedule.map((day, idx) => (
                  <div
                    key={idx}
                    className={`
                      p-2 border-r border-border last:border-r-0 flex flex-col gap-2
                      w-[120px] flex-shrink-0 md:w-auto md:flex-shrink
                      snap-start md:snap-align-none
                      ${day.weekend ? "bg-muted" : ""}
                    `}
                  >
                    {day.weekend ? (
                      <div className="flex-1 flex items-center justify-center">
                        <div className="text-center px-2">
                          <Building2 className="h-8 w-8 text-muted-foreground/30 mb-2 mx-auto" />
                          <span className="block text-[10px] md:text-xs font-bold text-muted-foreground leading-tight">
                            Closed on Weekends
                          </span>
                        </div>
                      </div>
                    ) : day.fullyBooked ? (
                      <div className="h-full flex flex-col items-center justify-center text-center p-4">
                        <CalendarX2 className="h-8 w-8 text-muted-foreground/30 mb-2" />
                        <span className="text-xs font-bold text-muted-foreground">
                          Fully Booked
                        </span>
                      </div>
                    ) : (
                      <>
                        {day.slots.map((slot, slotIdx) => (
                          <Button
                            key={slotIdx}
                            variant={
                              selectedSlot === `${day.date}-${slot.time}` ? "default" : "outline"
                            }
                            size="sm"
                            onClick={() => setSelectedSlot(`${day.date}-${slot.time}`)}
                            disabled={slot.booked || !slot.available}
                            className={`
                              w-full py-2 px-3 rounded-lg text-xs font-bold transition-colors
                              ${
                                selectedSlot === `${day.date}-${slot.time}`
                                  ? "bg-primary text-primary-foreground shadow-sm"
                                  : slot.booked || !slot.available
                                  ? "bg-muted text-muted-foreground line-through opacity-50 cursor-not-allowed"
                                  : "bg-card hover:bg-primary hover:text-primary-foreground"
                              }
                            `}
                          >
                            {slot.time}
                          </Button>
                        ))}
                      </>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
        
        {/* Legend */}
        <div className="mt-6 flex items-center justify-center gap-6 text-sm">
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded-full bg-card border border-border" />
            <span className="text-muted-foreground">Available</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded-full bg-primary border border-primary" />
            <span className="text-muted-foreground font-bold">Selected</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded-full bg-muted" />
            <span className="text-muted-foreground">Booked / Closed</span>
          </div>
        </div>
        
        {/* Book Appointment CTA */}
        <div className="mt-8 flex justify-center">
          <Button 
            className="group relative flex h-12 items-center justify-center overflow-hidden rounded-full px-8 text-base font-bold transition-all active:scale-95 shadow-lg"
            size="lg"
            asChild
          >
            <Link href="/request">
              Book an Appointment
              <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
            </Link>
          </Button>
        </div>
      </div>
    </section>
  )
}

