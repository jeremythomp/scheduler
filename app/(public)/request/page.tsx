"use client"

import React, { useState, useMemo, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { bookingFormSchema, type BookingFormInput, serviceSelectionSchema, type ServiceSelectionInput } from "@/lib/validation"
import { CalendarX2, Building2, ClipboardCheck, Scale, UserCheck, Check, Lock, ArrowRight, ArrowLeft, CheckCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { useBookingStore, type ServiceSelection } from "@/lib/stores/booking-store"
import { toast } from "sonner"
import { Badge } from "@/components/ui/badge"

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
      return ["08:30 AM", "09:30 AM", "10:30 AM", "11:30 AM", "01:02 PM", "02:02 PM", "03:02 PM"]
    case "inspection":
      return ["08:30 AM", "09:30 AM", "10:30 AM", "01:01 PM", "02:01 PM", "03:01 PM"]
    case "registration":
      return ["08:30 AM", "09:30 AM", "10:30 AM", "11:30 AM", "12:30 PM", "01:30 PM"]
    default:
      return []
  }
}

// Helper function to check if a time slot is in the past
const isTimeSlotInPast = (date: Date, timeString: string): boolean => {
  const now = new Date()
  
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
  const slotTime = new Date(date)
  slotTime.setHours(hour24, minutes, 0, 0)
  
  // Check if the slot time is in the past
  return slotTime < now
}

// Generate weekly schedule with real dates
const generateWeekSchedule = (
  serviceType: ServiceType, 
  week: "this" | "next",
  bookedSlots: Array<{ date: string; time: string }> = [],
  userTakenSlots: Array<{ date: string; time: string }> = []
): DaySchedule[] => {
  const baseSlots = generateTimeSlots(serviceType)
  const today = new Date()
  const currentDate = today.getDate()
  const currentMonth = today.getMonth()
  const currentYear = today.getFullYear()
  
  const currentDay = today.getDay()
  const diff = currentDay === 0 ? -6 : 1 - currentDay
  const monday = new Date(today)
  monday.setDate(today.getDate() + diff)
  
  if (week === "next") {
    monday.setDate(monday.getDate() + 7)
  }
  
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
  const weekSchedule: DaySchedule[] = []
  
  for (let i = 0; i < 7; i++) {
    const dayDate = new Date(monday)
    dayDate.setDate(monday.getDate() + i)
    
    const date = dayDate.getDate()
    const isWeekend = i >= 5
    
    const dayDateOnly = new Date(dayDate.getFullYear(), dayDate.getMonth(), dayDate.getDate())
    const todayDateOnly = new Date(currentYear, currentMonth, currentDate)
    
    const isPast = dayDateOnly < todayDateOnly
    const isToday = dayDateOnly.getTime() === todayDateOnly.getTime()
    
    const dateString = dayDate.toISOString().split('T')[0]
    
    const bookedTimes = bookedSlots
      .filter(slot => slot.date === dateString)
      .map(slot => slot.time)
    
    const userTakenTimes = userTakenSlots
      .filter(slot => slot.date === dateString)
      .map(slot => slot.time)
    
    // Check if day is fully booked (only considering future slots)
    // Don't count past time slots as part of "fully booked" calculation
    const futureSlots = baseSlots.filter(time => {
      if (isPast) return false // Entire day is in the past
      if (isToday) return !isTimeSlotInPast(dayDate, time) // Only future times today
      return true // All slots are future
    })
    const availableFutureSlots = futureSlots.filter(time => !bookedTimes.includes(time) && !userTakenTimes.includes(time))
    const isFullyBooked = !isPast && !isWeekend && futureSlots.length > 0 && availableFutureSlots.length === 0
    
    weekSchedule.push({
      day: days[i],
      date,
      slots: baseSlots.map((time) => {
        // Check if this specific time slot is in the past
        const isSlotInPast = isPast || (isToday && isTimeSlotInPast(dayDate, time))
        
        return {
          time,
          available: !isSlotInPast && !isWeekend && !userTakenTimes.includes(time),
          booked: bookedTimes.includes(time) || userTakenTimes.includes(time),
        }
      }),
      weekend: isWeekend,
      fullyBooked: isFullyBooked,
      isToday,
      isPast,
    })
  }
  
  return weekSchedule
}

const serviceTypeMap: Record<ServiceType, string> = {
  inspection: "Vehicle Inspection",
  weighing: "Vehicle Weighing",
  registration: "Vehicle Registration"
}

const serviceIcons: Record<ServiceType, any> = {
  inspection: ClipboardCheck,
  weighing: Scale,
  registration: UserCheck,
}

export default function RequestPage() {
  const router = useRouter()
  const bookingStore = useBookingStore()
  
  // Wizard state
  const [wizardStep, setWizardStep] = useState<'info' | 'services' | 'time' | 'review'>('info')
  const [currentServiceIndex, setCurrentServiceIndex] = useState(0)
  
  // Calendar state
  const [selectedWeek, setSelectedWeek] = useState<"this" | "next">("this")
  const [bookedSlots, setBookedSlots] = useState<Array<{ date: string; time: string }>>([])
  const [isLoadingAvailability, setIsLoadingAvailability] = useState(false)
  
  // Form state
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const userInfoForm = useForm<BookingFormInput>({
    resolver: zodResolver(bookingFormSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      referenceNumber: "",
    }
  })
  
  // Check if coming from Quick Schedule with pre-filled data
  useEffect(() => {
    if (bookingStore.firstName && bookingStore.email && bookingStore.referenceNumber) {
      // Pre-populate the form with data from store
      userInfoForm.reset({
        firstName: bookingStore.firstName,
        lastName: bookingStore.lastName,
        email: bookingStore.email,
        referenceNumber: bookingStore.referenceNumber,
      })
      
      // If services are also selected, skip directly to time selection
      if (bookingStore.selectedServices.length > 0) {
        setWizardStep('time')
        setCurrentServiceIndex(0)
      } else {
        // Only user info is filled, skip to service selection
        setWizardStep('services')
      }
    }
  }, []) // Run only on mount
  
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
  
  // Get current service being booked
  const currentService = bookingStore.selectedServices[currentServiceIndex] as ServiceType | undefined
  
  // Fetch availability when service changes
  useEffect(() => {
    if (wizardStep === 'time' && currentService) {
      fetchAvailability(currentService)
    }
  }, [currentService, selectedWeek, startDate, endDate, wizardStep])

  const fetchAvailability = async (service: ServiceType) => {
      setIsLoadingAvailability(true)
      
        try {
          const response = await fetch(
        `/api/availability?service=${service}&startDate=${startDate}&endDate=${endDate}`
          )
          const data = await response.json()
          
          if (response.ok && data.success) {
            setBookedSlots(data.bookedSlots)
          } else {
            console.error("Failed to fetch availability:", data.error)
            setBookedSlots([])
            if (response.status === 503) {
              toast.error("Service Temporarily Unavailable", {
                description: "Unable to load availability. Please try again in a moment."
              })
            }
          }
        } catch (error) {
            console.error("Error fetching availability:", error)
            setBookedSlots([])
            toast.error("Connection Error", {
        description: "Unable to load availability. Please check your connection."
      })
    } finally {
      setIsLoadingAvailability(false)
    }
  }

  // Get slots already taken by user for other services
  const userTakenSlots = useMemo(() => {
    return bookingStore.serviceSelections
      .filter((_, idx) => idx !== currentServiceIndex)
      .map(selection => ({
        date: selection.date,
        time: selection.time
      }))
  }, [bookingStore.serviceSelections, currentServiceIndex])

  const weekSchedule = useMemo(
    () => currentService ? generateWeekSchedule(currentService, selectedWeek, bookedSlots, userTakenSlots) : [],
    [currentService, selectedWeek, bookedSlots, userTakenSlots]
  )

  // Handle user info submission
  const handleUserInfoSubmit = (data: BookingFormInput) => {
    bookingStore.setUserInfo(data)
    setWizardStep('services')
  }

  // Handle service selection
  const handleServiceSelectionNext = () => {
    if (bookingStore.selectedServices.length === 0) {
      toast.error("Please select at least one service")
      return
    }
    setCurrentServiceIndex(0)
    setWizardStep('time')
  }

  // Handle time slot selection
  const handleTimeSlotSelect = (date: number, time: string) => {
    if (!currentService) return
    
    // Calculate the full date
      const today = new Date()
      const currentDay = today.getDay()
      const diff = currentDay === 0 ? -6 : 1 - currentDay
      const monday = new Date(today)
      monday.setDate(today.getDate() + diff)
      
      if (selectedWeek === "next") {
        monday.setDate(monday.getDate() + 7)
      }
      
    const selectedDayIndex = weekSchedule.findIndex(day => day.date === date)
      if (selectedDayIndex !== -1) {
        const selectedDate = new Date(monday)
        selectedDate.setDate(monday.getDate() + selectedDayIndex)
        const formattedDate = selectedDate.toISOString().split('T')[0]
        
      // Check if this slot is already taken by another service
      if (bookingStore.isTimeSlotTaken(formattedDate, time)) {
        toast.error("Time slot already selected for another service")
        return
      }
      
      bookingStore.setServiceSelection(currentServiceIndex, {
        service: serviceTypeMap[currentService],
        date: formattedDate,
        time: time
      })
      
      toast.success(`${serviceTypeMap[currentService]} booked for ${time}`, {
        icon: <CheckCircle className="h-4 w-4" />
      })
    }
  }

  // Navigate to next service or review
  const handleNextService = () => {
    if (!bookingStore.isServiceBooked(currentServiceIndex)) {
      toast.error("Please select a time slot for this service")
      return
    }

    if (currentServiceIndex < bookingStore.selectedServices.length - 1) {
      setCurrentServiceIndex(currentServiceIndex + 1)
      setSelectedWeek("this") // Reset to current week
    } else {
      setWizardStep('review')
    }
  }

  // Navigate to previous service
  const handlePreviousService = () => {
    if (currentServiceIndex > 0) {
      setCurrentServiceIndex(currentServiceIndex - 1)
    } else {
      setWizardStep('services')
    }
  }

  // Handle final submission
  const handleFinalSubmit = async () => {
    setIsLoading(true)
    setError(null)

    try {
      const requestData = {
        customerName: `${bookingStore.firstName} ${bookingStore.lastName}`,
        customerEmail: bookingStore.email,
        customerPhone: "",
        servicesRequested: bookingStore.serviceSelections.map(s => s.service),
        serviceBookings: bookingStore.serviceSelections.map(s => ({
          serviceName: s.service,
          scheduledDate: s.date,
          scheduledTime: s.time
        })),
        additionalNotes: `Payment Reference: ${bookingStore.referenceNumber}`
      }

      const response = await fetch("/api/requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestData)
      })

      const result = await response.json()

      if (response.ok && result.success) {
        bookingStore.clearBookingData()
        router.push(`/confirmation?ref=${result.referenceNumber}`)
      } else {
        setError(result.error || "Failed to submit request")
      }
    } catch (error) {
      setError("An error occurred. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  const currentSelection = bookingStore.getServiceSelection(currentServiceIndex)

  return (
    <div className="bg-gradient-to-b from-background to-muted/30 py-12 px-4 min-h-screen">
      <div className="mx-auto max-w-7xl">
        {/* Progress Steps */}
        <div className="mb-8">
          <div className="flex items-center justify-between max-w-2xl mx-auto">
            {['Info', 'Services', 'Schedule', 'Review'].map((step, idx) => {
              const stepKeys = ['info', 'services', 'time', 'review']
              const currentIdx = stepKeys.indexOf(wizardStep)
              const isActive = idx === currentIdx
              const isCompleted = idx < currentIdx
              
              return (
                <div key={step} className="flex items-center flex-1">
                  <div className="flex flex-col items-center flex-1">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${
                      isCompleted ? 'bg-primary text-primary-foreground' :
                      isActive ? 'bg-primary text-primary-foreground' :
                      'bg-muted text-muted-foreground'
                    }`}>
                      {isCompleted ? <Check className="h-5 w-5" /> : idx + 1}
                    </div>
                    <span className={`text-xs mt-1 font-medium ${isActive ? 'text-foreground' : 'text-muted-foreground'}`}>
                      {step}
                    </span>
                  </div>
                  {idx < 3 && (
                    <div className={`h-0.5 flex-1 ${isCompleted ? 'bg-primary' : 'bg-muted'}`} />
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* Step 1: User Information */}
        {wizardStep === 'info' && (
          <Card className="max-w-2xl mx-auto">
            <CardHeader>
              <CardTitle>Your Information</CardTitle>
              <CardDescription>Please enter your details to begin booking</CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...userInfoForm}>
                <form onSubmit={userInfoForm.handleSubmit(handleUserInfoSubmit)} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={userInfoForm.control}
                      name="firstName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>First Name *</FormLabel>
                          <FormControl>
                            <Input placeholder="John" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={userInfoForm.control}
                      name="lastName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Last Name *</FormLabel>
                          <FormControl>
                            <Input placeholder="Doe" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <FormField
                    control={userInfoForm.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email Address *</FormLabel>
                        <FormControl>
                          <Input type="email" placeholder="john.doe@example.com" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={userInfoForm.control}
                    name="referenceNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Payment Reference Number *</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter reference from receipt" {...field} />
                        </FormControl>
                        <FormMessage />
                        <p className="text-xs text-muted-foreground">
                          Found on your payment receipt
                        </p>
                      </FormItem>
                    )}
                  />

                  <Button type="submit" className="w-full" size="lg">
                    Continue to Services
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        )}

        {/* Step 2: Service Selection */}
        {wizardStep === 'services' && (
          <Card className="max-w-2xl mx-auto">
          <CardHeader>
              <CardTitle>Select Your Services</CardTitle>
              <CardDescription>
                Choose all services you have paid for. You'll schedule each one separately.
              </CardDescription>
          </CardHeader>
              <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {(Object.keys(serviceTypeMap) as ServiceType[]).map((service) => {
                  const isSelected = bookingStore.selectedServices.includes(service)
                  const Icon = serviceIcons[service]
                  
                  return (
                    <Button
                      key={service}
                      type="button"
                      variant={isSelected ? "default" : "outline"}
                      size="lg"
                      onClick={() => {
                        const newServices = isSelected
                          ? bookingStore.selectedServices.filter(s => s !== service)
                          : [...bookingStore.selectedServices, service]
                        bookingStore.setSelectedServices(newServices)
                      }}
                      className={`rounded-xl font-bold transition-all h-auto py-6 flex-col gap-2 ${
                        isSelected ? "ring-2 ring-primary" : ""
                      }`}
                    >
                      <Icon className="h-6 w-6" />
                      <span className="text-sm">{serviceTypeMap[service]}</span>
                      {isSelected && <CheckCircle className="h-5 w-5 absolute top-2 right-2" />}
                    </Button>
                  )
                })}
              </div>

              {bookingStore.selectedServices.length > 0 && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-800">
                  <strong>Selected ({bookingStore.selectedServices.length}):</strong> You will schedule a time slot for each service individually.
                </div>
              )}

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => setWizardStep('info')}
                  className="flex-1"
                >
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back
                </Button>
                <Button
                  onClick={handleServiceSelectionNext}
                  disabled={bookingStore.selectedServices.length === 0}
                  className="flex-1"
                >
                  Continue to Scheduling
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 3: Time Selection for Each Service */}
        {wizardStep === 'time' && currentService && (
          <div>
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="flex items-center gap-3">
                  {React.createElement(serviceIcons[currentService], { className: "h-6 w-6" })}
                  Schedule: {serviceTypeMap[currentService]}
                </CardTitle>
                <CardDescription>
                  Service {currentServiceIndex + 1} of {bookingStore.selectedServices.length} - 
                  {currentSelection && (
                    <span className="text-primary font-semibold ml-2">
                      Selected: {currentSelection.time}
                    </span>
                  )}
                </CardDescription>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Select Time Slot</CardTitle>
                  <div className="flex items-center gap-2 bg-muted p-1 rounded-full ring-1 ring-border">
                    <Button
                      variant={selectedWeek === "this" ? "default" : "ghost"}
                      size="sm"
                      onClick={() => setSelectedWeek("this")}
                      className="rounded-full text-xs font-bold"
                    >
                      This Week
                    </Button>
                    <Button
                      variant={selectedWeek === "next" ? "default" : "ghost"}
                      size="sm"
                      onClick={() => setSelectedWeek("next")}
                      className="rounded-full text-xs font-medium"
                    >
                      Next Week
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                  <div className="overflow-hidden rounded-2xl border-2 border-border bg-muted relative">
                    {isLoadingAvailability && (
                      <div className="absolute inset-0 bg-background/50 backdrop-blur-sm z-10 flex items-center justify-center">
                        <div className="text-sm font-medium text-muted-foreground">Loading availability...</div>
                      </div>
                    )}
                    <div className="overflow-x-auto">
                      <div className="inline-block md:block min-w-full">
                        {/* Header Row */}
                        <div className="flex md:grid md:grid-cols-7 border-b-2 border-border bg-card">
                          {weekSchedule.map((day, idx) => (
                            <div
                              key={idx}
                            className={`p-3 text-center border-r border-border last:border-r-0 w-[100px] flex-shrink-0 md:w-auto md:flex-shrink ${
                              day.weekend ? "bg-muted" : ""
                            } ${day.isToday ? "bg-primary/10" : ""}`}
                            >
                              <span className="block text-xs font-bold uppercase text-muted-foreground mb-1">
                                {day.day}
                              </span>
                            <span className={`block text-lg font-bold ${day.weekend ? "text-muted-foreground" : ""}`}>
                                {day.date}
                              </span>
                            </div>
                          ))}
                        </div>
                        
                        {/* Slots Grid */}
                        <div className="flex md:grid md:grid-cols-7 min-h-[350px]">
                        {weekSchedule.map((day, idx) => {
                          const dateString = (() => {
                            const today = new Date()
                            const currentDay = today.getDay()
                            const diff = currentDay === 0 ? -6 : 1 - currentDay
                            const monday = new Date(today)
                            monday.setDate(today.getDate() + diff)
                            if (selectedWeek === "next") monday.setDate(monday.getDate() + 7)
                            const dayDate = new Date(monday)
                            dayDate.setDate(monday.getDate() + idx)
                            return dayDate.toISOString().split('T')[0]
                          })()
                          
                          return (
                            <div
                              key={idx}
                              className={`p-2 border-r border-border last:border-r-0 flex flex-col gap-2 w-[100px] flex-shrink-0 md:w-auto md:flex-shrink ${
                                day.weekend ? "bg-muted" : ""
                              }`}
                            >
                              {day.weekend ? (
                                <div className="flex-1 flex items-center justify-center">
                                  <div className="text-center px-2">
                                    <Building2 className="h-6 w-6 text-muted-foreground/30 mb-1 mx-auto" />
                                    <span className="block text-[10px] font-bold text-muted-foreground leading-tight">
                                      Closed
                                    </span>
                                  </div>
                                </div>
                              ) : day.fullyBooked ? (
                                <div className="h-full flex flex-col items-center justify-center text-center p-4">
                                  <CalendarX2 className="h-6 w-6 text-muted-foreground/30 mb-1" />
                                  <span className="text-[10px] font-bold text-muted-foreground">
                                    Fully Booked
                                  </span>
                                </div>
                              ) : (
                                <>
                                  {day.slots.map((slot, slotIdx) => {
                                    const isSelected = currentSelection?.date === dateString && currentSelection?.time === slot.time
                                    const isTakenByUser = userTakenSlots.some(s => s.date === dateString && s.time === slot.time)
                                    
                                    return (
                                    <Button
                                      key={slotIdx}
                                        variant={isSelected ? "default" : "outline"}
                                      size="sm"
                                        onClick={() => handleTimeSlotSelect(day.date, slot.time)}
                                      disabled={slot.booked || !slot.available}
                                        className={`w-full py-1.5 px-2 rounded-lg text-[10px] font-bold transition-colors relative ${
                                          isSelected
                                            ? "bg-green-600 hover:bg-green-700 text-white shadow-sm ring-2 ring-green-600"
                                            : isTakenByUser
                                            ? "bg-amber-50 text-amber-700 border-amber-300 cursor-not-allowed opacity-60"
                                            : slot.booked || !slot.available
                                            ? "bg-muted text-muted-foreground line-through opacity-50 cursor-not-allowed"
                                            : "bg-card hover:bg-primary hover:text-primary-foreground"
                                        }`}
                                    >
                                        {isTakenByUser && <Lock className="h-3 w-3 absolute top-1 right-1" />}
                                        {isSelected && <CheckCircle className="h-3 w-3 absolute top-1 right-1" />}
                                      {slot.time}
                                    </Button>
                                    )
                                  })}
                                </>
                              )}
                            </div>
                          )
                        })}
                      </div>
                      </div>
                    </div>
                  </div>

                  {/* Legend */}
                <div className="mt-4 flex items-center justify-center gap-4 text-xs flex-wrap">
                    <div className="flex items-center gap-1.5">
                      <div className="h-2.5 w-2.5 rounded-full bg-card border border-border" />
                      <span className="text-muted-foreground">Available</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                    <div className="h-2.5 w-2.5 rounded-full bg-green-600" />
                      <span className="text-muted-foreground font-bold">Selected</span>
                    </div>
                  <div className="flex items-center gap-1.5">
                    <div className="h-2.5 w-2.5 rounded-full bg-amber-200 border border-amber-400" />
                    <span className="text-muted-foreground">Used by other service</span>
                  </div>
                    <div className="flex items-center gap-1.5">
                      <div className="h-2.5 w-2.5 rounded-full bg-muted" />
                      <span className="text-muted-foreground">Booked</span>
                    </div>
                  </div>

                <div className="mt-6 flex gap-3">
                  <Button
                    variant="outline"
                    onClick={handlePreviousService}
                    className="flex-1"
                  >
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back
                  </Button>
                  <Button
                    onClick={handleNextService}
                    disabled={!currentSelection}
                    className="flex-1"
                  >
                    {currentServiceIndex < bookingStore.selectedServices.length - 1 ? "Next Service" : "Review Booking"}
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Step 4: Review and Submit */}
        {wizardStep === 'review' && (
          <Card className="max-w-2xl mx-auto">
              <CardHeader>
              <CardTitle>Review Your Booking</CardTitle>
              <CardDescription>Please confirm all details before submitting</CardDescription>
              </CardHeader>
            <CardContent className="space-y-6">
              {/* Personal Info */}
              <div>
                <h3 className="font-semibold mb-2">Personal Information</h3>
                <div className="bg-muted p-4 rounded-lg space-y-1 text-sm">
                  <div><strong>Name:</strong> {bookingStore.firstName} {bookingStore.lastName}</div>
                  <div><strong>Email:</strong> {bookingStore.email}</div>
                  <div><strong>Payment Ref:</strong> {bookingStore.referenceNumber}</div>
                </div>
              </div>

              {/* Service Bookings */}
              <div>
                <h3 className="font-semibold mb-2">Scheduled Services</h3>
                <div className="space-y-2">
                  {bookingStore.serviceSelections.map((selection, idx) => (
                    <div key={idx} className="bg-muted p-4 rounded-lg flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {React.createElement(serviceIcons[bookingStore.selectedServices[idx] as ServiceType], { className: "h-5 w-5 text-primary" })}
                        <div>
                          <div className="font-semibold">{selection.service}</div>
                          <div className="text-sm text-muted-foreground">
                            {new Date(selection.date).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })} at {selection.time}
                          </div>
                        </div>
                      </div>
                      <CheckCircle className="h-5 w-5 text-green-600" />
                    </div>
                  ))}
                </div>
              </div>

              {/* Important Notice */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-800">
                <strong>Important:</strong> Your appointment will be confirmed immediately. Please bring your payment reference and valid ID when you arrive.
              </div>

                {error && (
                  <div className="bg-red-50 text-red-600 p-3 rounded-md text-sm">
                    {error}
                  </div>
                )}

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => setWizardStep('time')}
                  className="flex-1"
                >
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back
                </Button>
                    <Button 
                  onClick={handleFinalSubmit}
                  disabled={isLoading}
                  className="flex-1"
                      size="lg" 
                    >
                  {isLoading ? "Submitting..." : "Confirm Booking"}
                  <CheckCircle className="ml-2 h-4 w-4" />
                </Button>
              </div>
          </CardContent>
        </Card>
        )}
      </div>
    </div>
  )
}
