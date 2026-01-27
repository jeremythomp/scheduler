"use client"

import React, { useState, useMemo, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { bookingFormSchema, type BookingFormInput, serviceSelectionSchema, type ServiceSelectionInput } from "@/lib/validation"
import { ClipboardCheck, Scale, UserCheck, Check, ArrowRight, ArrowLeft, CheckCircle, MapPin } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { useBookingStore, type ServiceSelection } from "@/lib/stores/booking-store"
import { toast } from "sonner"
import { Badge } from "@/components/ui/badge"
import { MonthCalendar } from "@/components/landing/month-calendar"
import { TimeSlotPicker } from "@/components/landing/time-slot-picker"

type ServiceType = "inspection" | "weighing" | "registration"

interface SlotCount {
  date: string
  time: string
  count: number
}

// Location options for registration service
const REGISTRATION_LOCATIONS = [
  { value: "The Pine", label: "The Pine" },
  { value: "Holetown", label: "Holetown" },
] as const

const DEFAULT_LOCATION = "The Pine"

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

const MAX_CAPACITY_PER_SLOT = 5

const serviceTypeMap: Record<ServiceType, string> = {
  inspection: "Vehicle Inspection",
  weighing: "Vehicle Weighing",
  registration: "Vehicle Registration/Customer Service Center"
}

const serviceIcons: Record<ServiceType, any> = {
  inspection: ClipboardCheck,
  weighing: Scale,
  registration: UserCheck,
}

export default function RequestPage() {
  const router = useRouter()
  const bookingStore = useBookingStore()
  const today = new Date()
  
  // Wizard state
  const [wizardStep, setWizardStep] = useState<'info' | 'services' | 'time' | 'review'>('info')
  const [currentServiceIndex, setCurrentServiceIndex] = useState(0)
  
  // Calendar state
  const [selectedMonth, setSelectedMonth] = useState(today.getMonth())
  const [selectedYear, setSelectedYear] = useState(today.getFullYear())
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [slotCounts, setSlotCounts] = useState<SlotCount[]>([])
  const [maxCapacity, setMaxCapacity] = useState(MAX_CAPACITY_PER_SLOT)
  const [isLoadingAvailability, setIsLoadingAvailability] = useState(false)
  
  // Location state for registration service
  const [selectedLocation, setSelectedLocation] = useState<string>(DEFAULT_LOCATION)
  const [showLocationModal, setShowLocationModal] = useState(false)
  const [pendingTimeSelection, setPendingTimeSelection] = useState<string | null>(null)
  
  // Form state
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const userInfoForm = useForm<BookingFormInput>({
    resolver: zodResolver(bookingFormSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
    }
  })
  
  // Check if coming from Quick Schedule with pre-filled data
  useEffect(() => {
    if (bookingStore.firstName && bookingStore.email) {
      // Pre-populate the form with data from store
      userInfoForm.reset({
        firstName: bookingStore.firstName,
        lastName: bookingStore.lastName,
        email: bookingStore.email,
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
  
  // Calculate date range for the selected month
  const { startDate, endDate } = useMemo(() => {
    const firstDay = new Date(selectedYear, selectedMonth, 1)
    const lastDay = new Date(selectedYear, selectedMonth + 1, 0)
    
    return {
      startDate: firstDay.toISOString().split('T')[0],
      endDate: lastDay.toISOString().split('T')[0]
    }
  }, [selectedMonth, selectedYear])
  
  // Get current service being booked
  const currentService = bookingStore.selectedServices[currentServiceIndex] as ServiceType | undefined
  
  // Get time slots for current service
  const timeSlots = useMemo(() => currentService ? generateTimeSlots(currentService) : [], [currentService])
  
  // Fetch availability when service changes
  useEffect(() => {
    if (wizardStep === 'time' && currentService) {
      fetchAvailability(currentService)
    }
  }, [currentService, startDate, endDate, wizardStep])

  const fetchAvailability = async (service: ServiceType) => {
    setIsLoadingAvailability(true)
    
    try {
      const response = await fetch(
        `/api/availability?service=${service}&startDate=${startDate}&endDate=${endDate}`
      )
      const data = await response.json()
      
      if (response.ok && data.success) {
        setSlotCounts(data.slotCounts || [])
        setMaxCapacity(data.maxCapacity || MAX_CAPACITY_PER_SLOT)
      } else {
        console.error("Failed to fetch availability:", data.error)
        setSlotCounts([])
        if (response.status === 503) {
          toast.error("Service Temporarily Unavailable", {
            description: "Unable to load availability. Please try again in a moment."
          })
        }
      }
    } catch (error) {
      console.error("Error fetching availability:", error)
      setSlotCounts([])
      toast.error("Connection Error", {
        description: "Unable to load availability. Please check your connection."
      })
    } finally {
      setIsLoadingAvailability(false)
    }
  }

  // Get slots already taken by user for other services (to mark as unavailable)
  const userTakenSlots = useMemo(() => {
    return bookingStore.serviceSelections
      .filter((_, idx) => idx !== currentServiceIndex)
      .map(selection => ({
        date: selection.date,
        time: selection.time,
        count: 1 // Treat as 1 booking
      }))
  }, [bookingStore.serviceSelections, currentServiceIndex])
  
  // Get list of date/time combinations taken by user (for visual disabled state)
  const userTakenSlotsList = useMemo(() => {
    return bookingStore.serviceSelections
      .filter((_, idx) => idx !== currentServiceIndex)
      .map(selection => ({
        date: selection.date,
        time: selection.time
      }))
  }, [bookingStore.serviceSelections, currentServiceIndex])
  
  // Combine real slot counts with user's taken slots for display
  const combinedSlotCounts = useMemo(() => {
    const combined = [...slotCounts]
    
    // Add user taken slots to the counts
    userTakenSlots.forEach(userSlot => {
      const existing = combined.find(s => s.date === userSlot.date && s.time === userSlot.time)
      if (existing) {
        // Slot already has bookings, increment count
        existing.count += 1
      } else {
        // Add new slot count
        combined.push(userSlot)
      }
    })
    
    return combined
  }, [slotCounts, userTakenSlots])

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

  // Handle month change
  const handleMonthChange = (month: number, year: number) => {
    setSelectedMonth(month)
    setSelectedYear(year)
    setSelectedDate(null)
  }
  
  // Handle date selection
  const handleDateSelect = (date: string) => {
    setSelectedDate(date)
  }
  
  // Handle time slot selection
  const handleTimeSelect = (time: string) => {
    if (!currentService || !selectedDate) return
    
    // Check if this slot is already taken by another service
    if (bookingStore.isTimeSlotTaken(selectedDate, time)) {
      toast.error("Time slot already selected for another service")
      return
    }
    
    // For registration service, show location modal
    if (currentService === "registration") {
      setPendingTimeSelection(time)
      setShowLocationModal(true)
      return
    }
    
    // For other services, save immediately
    bookingStore.setServiceSelection(currentServiceIndex, {
      service: serviceTypeMap[currentService],
      date: selectedDate,
      time: time,
    })
  }

  // Handle location modal confirm
  const handleLocationConfirm = () => {
    if (!currentService || !selectedDate || !pendingTimeSelection) return
    
    bookingStore.setServiceSelection(currentServiceIndex, {
      service: serviceTypeMap[currentService],
      date: selectedDate,
      time: pendingTimeSelection,
      location: selectedLocation,
    })
    
    setShowLocationModal(false)
    setPendingTimeSelection(null)
  }

  // Handle location modal cancel
  const handleLocationCancel = () => {
    setShowLocationModal(false)
    setPendingTimeSelection(null)
  }

  // Navigate to next service or review
  const handleNextService = () => {
    if (!bookingStore.isServiceBooked(currentServiceIndex)) {
      toast.error("Please select a time slot for this service")
      return
    }

    if (currentServiceIndex < bookingStore.selectedServices.length - 1) {
      setCurrentServiceIndex(currentServiceIndex + 1)
      // Reset calendar to current month
      setSelectedMonth(today.getMonth())
      setSelectedYear(today.getFullYear())
      setSelectedDate(null)
      // Reset location to default
      setSelectedLocation(DEFAULT_LOCATION)
    } else {
      setWizardStep('review')
    }
  }

  // Navigate to previous service
  const handlePreviousService = () => {
    if (currentServiceIndex > 0) {
      setCurrentServiceIndex(currentServiceIndex - 1)
      // Reset calendar to current month
      setSelectedMonth(today.getMonth())
      setSelectedYear(today.getFullYear())
      setSelectedDate(null)
      // Reset location to default
      setSelectedLocation(DEFAULT_LOCATION)
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
          scheduledTime: s.time,
          location: s.location
        })),
        additionalNotes: ""
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
  
  // Only show time as selected if it matches the currently selected date
  const displayedSelectedTime = (currentSelection?.date === selectedDate) ? currentSelection?.time : null

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
                        <p className="text-xs text-muted-foreground">
                          You may use a family member or friend's email if you don't have your own
                        </p>
                        <FormMessage />
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
                      className={`rounded-xl font-bold transition-all h-auto py-6 flex-col gap-2 relative overflow-hidden ${
                        isSelected ? "ring-2 ring-primary" : ""
                      }`}
                      title={serviceTypeMap[service]}
                    >
                      <Icon className="h-6 w-6 flex-shrink-0" />
                      <span className="text-xs text-center leading-tight line-clamp-3 px-1 max-w-full break-words hyphens-auto">{serviceTypeMap[service]}</span>
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
                  Service {currentServiceIndex + 1} of {bookingStore.selectedServices.length}
                  {currentSelection && (
                    <span className="text-primary font-semibold ml-2">
                      - Selected: {new Date(currentSelection.date).toLocaleDateString()} at {currentSelection.time}
                    </span>
                  )}
                </CardDescription>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Select Date & Time</CardTitle>
                <CardDescription>
                  Choose an available date, then select a time slot
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Legend - Moved to top */}
                <div className="mb-4 flex items-center justify-center gap-3 text-xs flex-wrap">
                  <div className="flex items-center gap-1.5">
                    <div className="h-3 w-3 rounded bg-green-50 border-2 border-green-200" />
                    <span className="text-muted-foreground font-medium">Available</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="h-3 w-3 rounded bg-amber-50 border-2 border-amber-200" />
                    <span className="text-muted-foreground font-medium">Limited</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="h-3 w-3 rounded bg-red-50 border-2 border-red-200" />
                    <span className="text-muted-foreground font-medium">Fully Booked</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="h-3 w-3 rounded bg-purple-50 border-2 border-purple-300" />
                    <span className="text-muted-foreground font-medium">Already Selected</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="h-3 w-3 rounded bg-muted border-2 border-border" />
                    <span className="text-muted-foreground font-medium">Closed/Weekend</span>
                  </div>
                </div>
                
                {/* Calendar and Time Slots Container */}
                <div className="flex flex-col lg:flex-row gap-6 items-start">
                  {/* Month Calendar */}
                  <div className="w-full lg:flex-1">
                    <MonthCalendar
                      currentMonth={selectedMonth}
                      currentYear={selectedYear}
                      selectedDate={selectedDate}
                      onDateSelect={handleDateSelect}
                      onMonthChange={handleMonthChange}
                      slotCounts={combinedSlotCounts}
                      totalSlotsPerDay={timeSlots.length}
                      maxCapacity={maxCapacity}
                    />
                  </div>
                  
                  {/* Time Slot Picker - Always visible */}
                  <div className="w-full lg:w-80 xl:w-96">
                    <TimeSlotPicker
                      selectedDate={selectedDate}
                      selectedTime={displayedSelectedTime}
                      onTimeSelect={handleTimeSelect}
                      timeSlots={timeSlots}
                      slotCounts={combinedSlotCounts}
                      maxCapacity={maxCapacity}
                      isLoadingAvailability={isLoadingAvailability}
                      userTakenSlots={userTakenSlotsList}
                    />
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
                          {selection.location && (
                            <div className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                              <MapPin className="h-3 w-3" />
                              {selection.location}
                            </div>
                          )}
                        </div>
                      </div>
                      <CheckCircle className="h-5 w-5 text-green-600" />
                    </div>
                  ))}
                </div>
              </div>

              {/* Important Notice */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-800">
                <strong>Important:</strong> Your appointment will be confirmed immediately. Please bring valid ID when you arrive.
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

        {/* Location Selection Modal */}
        <Dialog open={showLocationModal} onOpenChange={setShowLocationModal}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                Select Service Location
              </DialogTitle>
              <DialogDescription>
                Please choose where you will go for your Vehicle Registration appointment.
              </DialogDescription>
            </DialogHeader>
            
            <div className="py-4 space-y-3">
              {REGISTRATION_LOCATIONS.map((location) => (
                <button
                  key={location.value}
                  onClick={() => setSelectedLocation(location.value)}
                  className={`w-full p-4 rounded-lg border-2 text-left transition-all ${
                    selectedLocation === location.value
                      ? "border-primary bg-primary/5"
                      : "border-muted hover:border-primary/50"
                  }`}
                >
                  <div className="font-semibold">{location.label}</div>
                </button>
              ))}
            </div>
            
            <DialogFooter>
              <Button variant="outline" onClick={handleLocationCancel}>
                Cancel
              </Button>
              <Button onClick={handleLocationConfirm}>
                Confirm Location
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}
