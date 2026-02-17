"use client"

import { useState, useMemo, useEffect } from "react"
import { ClipboardCheck, Scale, UserCheck, ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { MonthCalendar } from "./month-calendar"
import { TimeSlotPicker } from "./time-slot-picker"

type ServiceType = "inspection" | "weighing" | "registration"

interface SlotCount {
  date: string
  time: string
  count: number
}

// Standard time slots for all services
const TIME_SLOTS = ["08:30 AM", "09:30 AM", "10:30 AM", "11:30 AM", "12:30 PM", "01:30 PM", "02:30 PM"]

// Generate time slots for each service type
const generateTimeSlots = (serviceType: ServiceType): string[] => {
  return TIME_SLOTS
}

const MAX_CAPACITY_PER_SLOT = 5

export function CalendarSection() {
  const today = new Date()
  const [selectedMonth, setSelectedMonth] = useState(today.getMonth())
  const [selectedYear, setSelectedYear] = useState(today.getFullYear())
  const [selectedService, setSelectedService] = useState<ServiceType>("inspection")
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [selectedTime, setSelectedTime] = useState<string | null>(null)
  const [slotCounts, setSlotCounts] = useState<SlotCount[]>([])
  const [maxCapacity, setMaxCapacity] = useState(MAX_CAPACITY_PER_SLOT)
  const [isLoadingAvailability, setIsLoadingAvailability] = useState(false)
  
  // Calculate date range for the selected month
  const { startDate, endDate } = useMemo(() => {
    const firstDay = new Date(selectedYear, selectedMonth, 1)
    const lastDay = new Date(selectedYear, selectedMonth + 1, 0)
    
    return {
      startDate: firstDay.toISOString().split('T')[0],
      endDate: lastDay.toISOString().split('T')[0]
    }
  }, [selectedMonth, selectedYear])
  
  // Get time slots for selected service
  const timeSlots = useMemo(() => generateTimeSlots(selectedService), [selectedService])
  
  // Fetch availability when service or month changes
  useEffect(() => {
    const fetchAvailability = async () => {
      setIsLoadingAvailability(true)
      try {
        const response = await fetch(
          `/api/availability?service=${selectedService}&startDate=${startDate}&endDate=${endDate}`
        )
        const data = await response.json()
        
        if (data.success) {
          setSlotCounts(data.slotCounts || [])
          setMaxCapacity(data.maxCapacity || MAX_CAPACITY_PER_SLOT)
        } else {
          console.error("Failed to fetch availability:", data.error)
          setSlotCounts([])
        }
      } catch (error) {
        console.error("Error fetching availability:", error)
        setSlotCounts([])
      } finally {
        setIsLoadingAvailability(false)
      }
    }
    
    fetchAvailability()
  }, [selectedService, startDate, endDate])
  
  // Reset selections when service changes
  useEffect(() => {
    setSelectedDate(null)
    setSelectedTime(null)
  }, [selectedService])
  
  // Handle month change
  const handleMonthChange = (month: number, year: number) => {
    setSelectedMonth(month)
    setSelectedYear(year)
    setSelectedDate(null)
    setSelectedTime(null)
  }
  
  // Handle date selection
  const handleDateSelect = (date: string) => {
    setSelectedDate(date)
    setSelectedTime(null)
  }
  
  // Handle time selection
  const handleTimeSelect = (time: string) => {
    setSelectedTime(time)
  }

  return (
    <section id="real-time-availability" className="border-t border-border bg-card py-16 scroll-mt-20">
      <div className="mx-auto max-w-7xl px-4 md:px-8">
        <div className="mb-10">
          <h2 className="text-3xl font-bold text-foreground mb-2">
            Real-time Availability
          </h2>
          <p className="text-muted-foreground">
            Browse available slots throughout the year at the Central Station.
          </p>
        </div>
        
        {/* Service Tabs */}
        <div className="grid grid-cols-2 md:flex md:flex-wrap gap-3 mb-8">
          <Button
            variant={selectedService === "weighing" ? "default" : "outline"}
            size="lg"
            onClick={() => setSelectedService("weighing")}
            className={`rounded-full font-bold transition-all ${
              selectedService === "weighing"
                ? "bg-primary text-primary-foreground shadow-lg"
                : "bg-card hover:bg-muted"
            }`}
            title="Vehicle Weighing"
          >
            <Scale className="h-4 w-4 mr-2 shrink-0" />
            <span className="truncate">Vehicle Weighing</span>
          </Button>
          
          <Button
            variant={selectedService === "inspection" ? "default" : "outline"}
            size="lg"
            onClick={() => setSelectedService("inspection")}
            className={`rounded-full font-bold transition-all ${
              selectedService === "inspection"
                ? "bg-primary text-primary-foreground shadow-lg"
                : "bg-card hover:bg-muted"
            }`}
            title="Vehicle Inspection"
          >
            <ClipboardCheck className="h-4 w-4 mr-2 shrink-0" />
            <span className="truncate">Vehicle Inspection</span>
          </Button>
          
          <Button
            variant={selectedService === "registration" ? "default" : "outline"}
            size="lg"
            onClick={() => setSelectedService("registration")}
            className={`col-span-2 md:col-span-1 rounded-full font-bold transition-all ${
              selectedService === "registration"
                ? "bg-primary text-primary-foreground shadow-lg"
                : "bg-card hover:bg-muted"
            }`}
            title="Vehicle Registration/Customer Service Center"
          >
            <UserCheck className="h-4 w-4 mr-2 shrink-0" />
            <span className="truncate">Vehicle Registration/Customer Service Center</span>
          </Button>
        </div>
        
        {/* Calendar and Time Slots Container */}
        <div className="flex flex-col lg:flex-row gap-6 items-start">
          {/* Month Calendar */}
          <div className="w-full lg:flex-1">
            {/* Legend - Centered above calendar */}
            <div className="mb-6 flex items-center justify-center gap-4 md:gap-6 text-sm flex-wrap">
              <div className="flex items-center gap-2">
                <div className="h-4 w-4 rounded bg-green-50 border-2 border-green-200" />
                <span className="text-muted-foreground font-medium">Available</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-4 w-4 rounded bg-amber-50 border-2 border-amber-200" />
                <span className="text-muted-foreground font-medium">Limited</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-4 w-4 rounded bg-red-50 border-2 border-red-200" />
                <span className="text-muted-foreground font-medium">Fully Booked</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-4 w-4 rounded bg-muted border-2 border-border" />
                <span className="text-muted-foreground font-medium">Closed/Weekend</span>
              </div>
            </div>
            
            <MonthCalendar
              currentMonth={selectedMonth}
              currentYear={selectedYear}
              selectedDate={selectedDate}
              onDateSelect={handleDateSelect}
              onMonthChange={handleMonthChange}
              slotCounts={slotCounts}
              totalSlotsPerDay={timeSlots.length}
              maxCapacity={maxCapacity}
            />
          </div>
          
          {/* Time Slot Picker - Always visible */}
          <div className="w-full lg:w-80 xl:w-96">
            <TimeSlotPicker
              selectedDate={selectedDate}
              selectedTime={selectedTime}
              onTimeSelect={handleTimeSelect}
              timeSlots={timeSlots}
              slotCounts={slotCounts}
              maxCapacity={maxCapacity}
              isLoadingAvailability={isLoadingAvailability}
            />
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

