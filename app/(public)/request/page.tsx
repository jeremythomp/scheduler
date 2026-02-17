"use client"

import React, { useState, useMemo, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { bookingFormSchema, type BookingFormInput, serviceSelectionSchema, type ServiceSelectionInput } from "@/lib/validation"
import { ClipboardCheck, Scale, UserCheck, Check, ArrowRight, ArrowLeft, CheckCircle, MapPin, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { useBookingStore, type ServiceSelection, type VehicleSlotAssignment } from "@/lib/stores/booking-store"
import { toast } from "sonner"
import { Badge } from "@/components/ui/badge"
import { MonthCalendar } from "@/components/landing/month-calendar"
import { TimeSlotPicker } from "@/components/landing/time-slot-picker"
import { VehicleDistribution } from "@/components/landing/vehicle-distribution"
import { 
  suggestSlotDistribution, 
  convertToSlotAvailability,
  convertToMultiDaySlotAvailability,
  type SlotAvailability,
  type SuggestedDistribution 
} from "@/lib/booking-utils"

type ServiceType = "inspection" | "weighing" | "registration"

const SERVICE_ORDER: ServiceType[] = ["weighing", "inspection", "registration"]

interface SlotCount {
  date: string
  time: string
  count: number
}

// Location options for registration service
const REGISTRATION_LOCATIONS = [
  { value: "The Pine", label: "The Pine", disabled: false },
  { value: "Holetown", label: "Holetown", disabled: false },
  { value: "Warrens", label: "Warrens", disabled: false },
] as const

const DEFAULT_LOCATION = "The Pine"

// Time slots constant for reference
const TIME_SLOTS = ["08:30 AM", "09:30 AM", "10:30 AM", "11:30 AM", "12:30 PM", "01:30 PM", "02:30 PM"]

// Parse YYYY-MM-DD as local date (avoid UTC shift so displayed day matches selected day)
function parseLocalDate(dateStr: string): Date {
  const [y, m, d] = dateStr.split("-").map(Number)
  return new Date(y, m - 1, d)
}

// Format Date object to YYYY-MM-DD string
function formatDateToISO(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

// Helper to get the next time slot (+1 hour)
const getNextTimeSlot = (currentTime: string): string | null => {
  const currentIndex = TIME_SLOTS.indexOf(currentTime)
  if (currentIndex === -1 || currentIndex >= TIME_SLOTS.length - 1) return null
  return TIME_SLOTS[currentIndex + 1]
}

// Generate time slots for each service type
const generateTimeSlots = (serviceType: ServiceType): string[] => {
  // All services now run 8:30 AM to 2:30 PM at 1-hour intervals
  return TIME_SLOTS
}

// Get max capacity based on service type
const getMaxCapacity = (serviceType: ServiceType): number => {
  switch (serviceType) {
    case "weighing":
    case "inspection":
      return 12
    case "registration":
      return 5
    default:
      return 5
  }
}

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
  const [maxCapacity, setMaxCapacity] = useState(5)
  const [isLoadingAvailability, setIsLoadingAvailability] = useState(false)
  
  // Location state for registration service
  const [selectedLocation, setSelectedLocation] = useState<string>(DEFAULT_LOCATION)
  const [showLocationModal, setShowLocationModal] = useState(false)
  const [pendingTimeSelection, setPendingTimeSelection] = useState<string | null>(null)
  
  // Insufficient slots warning dialog
  const [showInsufficientSlotsDialog, setShowInsufficientSlotsDialog] = useState(false)
  const [insufficientSlotsInfo, setInsufficientSlotsInfo] = useState<{
    time: string
    availableSlots: number
    neededSlots: number
    splitSuggestion: Array<{time: string, vehicles: number}>
  } | null>(null)
  
  // Stagger suggestion dialog for next service
  const [showStaggerSuggestionDialog, setShowStaggerSuggestionDialog] = useState(false)
  const [staggerSuggestion, setStaggerSuggestion] = useState<Array<{time: string, vehicles: number, date: string, location?: string}> | null>(null)
  
  // Vehicle distribution dialog
  const [showVehicleDistributionDialog, setShowVehicleDistributionDialog] = useState(false)
  const [vehicleDistributionData, setVehicleDistributionData] = useState<{
    availableSlots: SlotAvailability[]
    suggestedDistribution: SuggestedDistribution[]
    constraints: VehicleSlotAssignment[]
    pendingTime: string | null
  } | null>(null)
  
  // Form state
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const userInfoForm = useForm<BookingFormInput>({
    resolver: zodResolver(bookingFormSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      companyName: "",
      numberOfVehicles: 1,
      idNumber: "",
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
        companyName: bookingStore.companyName,
        numberOfVehicles: bookingStore.numberOfVehicles,
        idNumber: bookingStore.idNumber,
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
  
  // Calculate date range for the selected month (local date strings to avoid timezone shift)
  const { startDate, endDate } = useMemo(() => {
    const firstDay = new Date(selectedYear, selectedMonth, 1)
    const lastDay = new Date(selectedYear, selectedMonth + 1, 0)
    const toLocalDateString = (d: Date) =>
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    return {
      startDate: toLocalDateString(firstDay),
      endDate: toLocalDateString(lastDay)
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
        setMaxCapacity(data.maxCapacity || getMaxCapacity(service))
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

  // Helper: Get the earliest booking time from all previous services (before current index)
  const getEarliestPreviousBookingTime = useCallback(() => {
    // Get all selections from services BEFORE the current one
    const previousSelections: ServiceSelection[] = []
    
    for (let i = 0; i < currentServiceIndex; i++) {
      const mainSelection = bookingStore.serviceSelections[i]
      if (mainSelection) {
        previousSelections.push(mainSelection)
      }
      
      // Add split bookings for this previous service
      const splitSelections = bookingStore.splitBookings[i] || []
      previousSelections.push(...splitSelections)
    }
    
    if (previousSelections.length === 0) return null
    
    // Find the earliest time slot
    const times = previousSelections.map(sel => ({
      date: sel.date,
      time: sel.time,
      timeIndex: TIME_SLOTS.indexOf(sel.time)
    }))
    
    // Sort by date, then by time index
    times.sort((a, b) => {
      if (a.date !== b.date) return a.date.localeCompare(b.date)
      return a.timeIndex - b.timeIndex
    })
    
    return times[0]?.time || null
  }, [currentServiceIndex, bookingStore.serviceSelections, bookingStore.splitBookings])

  // Get slots already taken by user for other services (to mark as unavailable)
  const userTakenSlots = useMemo(() => {
    const takenSlots: { date: string; time: string; count: number }[] = []
    
    // Get the earliest booking time from previous services
    const earliestTime = getEarliestPreviousBookingTime()
    
    if (!earliestTime) {
      // No previous bookings, nothing to block
      return takenSlots
    }
    
    // Calculate minimum available time (earliest + 1 hour)
    const minAvailableTime = getNextTimeSlot(earliestTime)
    if (!minAvailableTime) {
      // If there's no next time slot, no blocking needed
      return takenSlots
    }
    const minTimeIndex = TIME_SLOTS.indexOf(minAvailableTime)
    
    // Block all time slots BEFORE the minimum available time
    // For each date that has previous bookings, mark earlier times as taken
    const datesWithBookings = new Set<string>()
    
    for (let i = 0; i < currentServiceIndex; i++) {
      const mainSelection = bookingStore.serviceSelections[i]
      if (mainSelection) {
        datesWithBookings.add(mainSelection.date)
      }
      
      const splitSelections = bookingStore.splitBookings[i] || []
      splitSelections.forEach(split => {
        datesWithBookings.add(split.date)
      })
    }
    
    // For each date with previous bookings, block times before minimum
    datesWithBookings.forEach(date => {
      TIME_SLOTS.forEach((time, timeIndex) => {
        if (timeIndex < minTimeIndex) {
          // This time is before the minimum available time - block it
          takenSlots.push({
            date,
            time,
            count: bookingStore.numberOfVehicles // Block for all vehicles
          })
        }
      })
    })
    
    return takenSlots
  }, [bookingStore.serviceSelections, bookingStore.splitBookings, currentServiceIndex, bookingStore.numberOfVehicles, getEarliestPreviousBookingTime])
  
  // Get list of date/time combinations taken by user (for visual disabled state)
  const userTakenSlotsList = useMemo(() => {
    const takenSlots: { date: string; time: string }[] = []
    
    // Get the earliest booking time from previous services
    const earliestTime = getEarliestPreviousBookingTime()
    
    if (!earliestTime) {
      // No previous bookings, nothing to block
      return takenSlots
    }
    
    // Calculate minimum available time (earliest + 1 hour)
    const minAvailableTime = getNextTimeSlot(earliestTime)
    if (!minAvailableTime) {
      // If there's no next time slot, no blocking needed
      return takenSlots
    }
    const minTimeIndex = TIME_SLOTS.indexOf(minAvailableTime)
    
    // Block all time slots BEFORE the minimum available time
    // For each date that has previous bookings, mark earlier times as taken
    const datesWithBookings = new Set<string>()
    
    for (let i = 0; i < currentServiceIndex; i++) {
      const mainSelection = bookingStore.serviceSelections[i]
      if (mainSelection) {
        datesWithBookings.add(mainSelection.date)
      }
      
      const splitSelections = bookingStore.splitBookings[i] || []
      splitSelections.forEach(split => {
        datesWithBookings.add(split.date)
      })
    }
    
    // For each date with previous bookings, block times before minimum
    datesWithBookings.forEach(date => {
      TIME_SLOTS.forEach((time, timeIndex) => {
        if (timeIndex < minTimeIndex) {
          // This time is before the minimum available time - block it visually
          takenSlots.push({
            date,
            time
          })
        }
      })
    })
    
    return takenSlots
  }, [bookingStore.serviceSelections, bookingStore.splitBookings, currentServiceIndex, getEarliestPreviousBookingTime])
  
  // Combine real slot counts with user's taken slots for display
  const combinedSlotCounts = useMemo(() => {
    const combined = [...slotCounts]
    
    // Add user taken slots to the counts
    userTakenSlots.forEach(userSlot => {
      const existing = combined.find(s => s.date === userSlot.date && s.time === userSlot.time)
      if (existing) {
        // Slot already has bookings, increment count by actual vehicle count
        existing.count += userSlot.count
      } else {
        // Add new slot count
        combined.push(userSlot)
      }
    })
    
    return combined
  }, [slotCounts, userTakenSlots])

  // Calculate staggered booking slots for next service based on previous service using smart algorithm
  // nextServiceSlotCounts: booking counts for the NEXT service (not the current one)
  const calculateStaggeredBooking = (previousServiceIndex: number, nextService: ServiceType, nextServiceSlotCounts: Array<{date: string, time: string, count: number}>) => {
    const previousSelections = bookingStore.getAllSelectionsForService(previousServiceIndex)
    if (previousSelections.length === 0) return null
    
    // Get constraints from previous service
    const constraints = bookingStore.getConstraintsForNextService(previousServiceIndex)
    
    // Use the date from the first previous selection
    const targetDate = previousSelections[0].date
    const maxCapacity = getMaxCapacity(nextService)
    
    // Get available slots for the target date using the NEXT service's booking data
    const slotAvailability = convertToSlotAvailability(nextServiceSlotCounts, maxCapacity, targetDate)
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/41ada7fd-1087-4968-83f9-c46a84381e41',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'request/page.tsx:calculateStaggeredBooking',message:'Stagger calc inputs',data:{previousServiceIndex,nextService,targetDate,maxCapacity,constraints,slotAvailabilityForDate:slotAvailability.map(s=>({time:s.time,available:s.availableCapacity})),nextServiceSlotCountsForDate:nextServiceSlotCounts.filter(s=>s.date===targetDate).map(s=>({time:s.time,count:s.count}))},timestamp:Date.now(),hypothesisId:'H1-H2'})}).catch(()=>{});
    // #endregion
    
    // Filter to only slots after each constraint
    const validSlots = slotAvailability.filter(slot => {
      return constraints.every(constraint => {
        if (!constraint.constraintTime || constraint.constraintDate !== slot.date) return true
        const slotIndex = TIME_SLOTS.indexOf(slot.time)
        const constraintIndex = TIME_SLOTS.indexOf(constraint.constraintTime)
        return slotIndex > constraintIndex
      })
    })
    
    // Calculate total available capacity on the target date
    const totalAvailableCapacity = validSlots.reduce((sum, slot) => sum + slot.availableCapacity, 0)
    const vehicleCount = bookingStore.numberOfVehicles
    
    // Check if we need to extend to multiple days
    let slotsToUse = validSlots
    if (totalAvailableCapacity < vehicleCount) {
      // Not enough capacity on same day - extend to subsequent days
      const dates = [targetDate]
      const targetDateObj = parseLocalDate(targetDate)
      
      // Add next 7 days (enough to find capacity)
      for (let i = 1; i <= 7; i++) {
        const nextDate = new Date(targetDateObj)
        nextDate.setDate(nextDate.getDate() + i)
        dates.push(formatDateToISO(nextDate))
      }
      
      // Get multi-day slot availability using the NEXT service's booking data
      const multiDaySlots = convertToMultiDaySlotAvailability(nextServiceSlotCounts, maxCapacity, dates)
      
      // Filter to only slots after each constraint (works across days)
      slotsToUse = multiDaySlots.filter(slot => {
        return constraints.every(constraint => {
          if (!constraint.constraintTime || !constraint.constraintDate) return true
          const slotIndex = TIME_SLOTS.indexOf(slot.time)
          const constraintIndex = TIME_SLOTS.indexOf(constraint.constraintTime)
          
          // Same date - must be at least one slot after
          if (slot.date === constraint.constraintDate) {
            return slotIndex > constraintIndex
          }
          
          // Different date - must be later date
          return slot.date > constraint.constraintDate
        })
      })
    }
    
    // Use the smart suggestion algorithm
    const suggestion = suggestSlotDistribution(
      vehicleCount,
      slotsToUse,
      constraints,
      maxCapacity
    )
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/41ada7fd-1087-4968-83f9-c46a84381e41',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'request/page.tsx:calculateStaggeredBooking:result',message:'Stagger suggestion result',data:{vehicleCount,slotsToUseAvailability:slotsToUse.map(s=>({time:s.time,date:s.date,available:s.availableCapacity})),suggestion:suggestion.map(s=>({time:s.time,date:s.date,vehicles:s.vehicleCount}))},timestamp:Date.now(),hypothesisId:'H1-H3'})}).catch(()=>{});
    // #endregion
    
    if (suggestion.length === 0) return null
    
    return suggestion.map(s => ({
      time: s.time,
      vehicles: s.vehicleCount,
      date: s.date,
      location: undefined
    }))
  }

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
  
  // Calculate split suggestion for vehicles across time slots
  const calculateSplitSuggestion = (startTime: string, neededVehicles: number, availableAtStart: number) => {
    const suggestion: Array<{time: string, vehicles: number}> = []
    let remaining = neededVehicles
    let currentTimeIndex = timeSlots.indexOf(startTime)
    
    while (remaining > 0 && currentTimeIndex < timeSlots.length) {
      const currentTime = timeSlots[currentTimeIndex]
      const currentSlotCount = combinedSlotCounts.find(s => s.date === selectedDate && s.time === currentTime)?.count || 0
      const availableInSlot = maxCapacity - currentSlotCount
      const toBook = Math.min(remaining, availableInSlot)
      
      if (toBook > 0) {
        suggestion.push({ time: currentTime, vehicles: toBook })
        remaining -= toBook
      }
      
      currentTimeIndex++
    }
    
    return suggestion
  }
  
  // Handle time slot selection
  const handleTimeSelect = (time: string) => {
    if (!currentService || !selectedDate) return
    
    // Block only if selected time is before minimum stagger (1hr after earliest previous service)
    const earliestPrev = getEarliestPreviousBookingTime()
    if (earliestPrev != null) {
      const minAvailableTime = getNextTimeSlot(earliestPrev)
      const minIndex = minAvailableTime != null ? TIME_SLOTS.indexOf(minAvailableTime) : -1
      const selectedTimeIndex = TIME_SLOTS.indexOf(time)
      if (minIndex >= 0 && selectedTimeIndex >= 0 && selectedTimeIndex < minIndex) {
        toast.error("Time slot already selected for another service")
        return
      }
    }

    // Get available slots for this time
    const currentSlotCount = combinedSlotCounts.find(s => s.date === selectedDate && s.time === time)?.count || 0
    const availableSlots = maxCapacity - currentSlotCount
    const neededVehicles = bookingStore.numberOfVehicles
    
    // Check if there are enough slots
    if (neededVehicles > availableSlots) {
      // For multi-vehicle bookings that need splitting, show distribution dialog
      const constraints = currentServiceIndex > 0 ? bookingStore.getConstraintsForNextService(currentServiceIndex - 1) : []
      
      // Try same-day first
      let slotAvailability = convertToSlotAvailability(combinedSlotCounts, maxCapacity, selectedDate)
      let suggestion = suggestSlotDistribution(neededVehicles, slotAvailability, constraints, maxCapacity)
      
      // If same-day doesn't work, try multi-day
      if (suggestion.length === 0 || suggestion.reduce((sum, s) => sum + s.vehicleCount, 0) < neededVehicles) {
        // Calculate same-day total capacity
        const sameDayCapacity = slotAvailability.reduce((sum, slot) => sum + slot.availableCapacity, 0)
        
        if (sameDayCapacity < neededVehicles) {
          // Not enough capacity on same day - extend to subsequent days
          const dates = [selectedDate]
          const selectedDateObj = parseLocalDate(selectedDate)
          
          // Add next 7 days (enough to find capacity)
          for (let i = 1; i <= 7; i++) {
            const nextDate = new Date(selectedDateObj)
            nextDate.setDate(nextDate.getDate() + i)
            dates.push(formatDateToISO(nextDate))
          }
          
          // Get multi-day slot availability
          slotAvailability = convertToMultiDaySlotAvailability(combinedSlotCounts, maxCapacity, dates)
          suggestion = suggestSlotDistribution(neededVehicles, slotAvailability, constraints, maxCapacity)
        }
        
        // If still no solution, show error
        if (suggestion.length === 0 || suggestion.reduce((sum, s) => sum + s.vehicleCount, 0) < neededVehicles) {
          toast.error(`Not enough slots available. Please try a different date or reduce the number of vehicles.`, {
            description: "There isn't enough capacity to accommodate all your vehicles in the next 7 days."
          })
          return
        }
      }
      
      setVehicleDistributionData({
        availableSlots: slotAvailability,
        suggestedDistribution: suggestion,
        constraints,
        pendingTime: time
      })
      setShowVehicleDistributionDialog(true)
      return
    }
    
    // For registration service, show location modal
    if (currentService === "registration") {
      setPendingTimeSelection(time)
      setShowLocationModal(true)
      return
    }
    
    // For single vehicle or sufficient capacity, save immediately
    bookingStore.setServiceSelection(currentServiceIndex, {
      service: serviceTypeMap[currentService],
      date: selectedDate,
      time: time,
      vehicleCount: neededVehicles,
      vehicleAssignments: [{
        vehicleGroup: 1,
        vehicleCount: neededVehicles,
        constraintTime: time,
        constraintDate: selectedDate
      }]
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
      vehicleCount: bookingStore.numberOfVehicles,
      vehicleAssignments: [{
        vehicleGroup: 1,
        vehicleCount: bookingStore.numberOfVehicles,
        constraintTime: pendingTimeSelection,
        constraintDate: selectedDate
      }]
    })
    
    setShowLocationModal(false)
    setPendingTimeSelection(null)
  }

  // Handle location modal cancel
  const handleLocationCancel = () => {
    setShowLocationModal(false)
    setPendingTimeSelection(null)
  }
  
  // Handle insufficient slots - split across hours
  const handleSplitAcrossHours = () => {
    if (!currentService || !selectedDate || !insufficientSlotsInfo) return
    
    const { splitSuggestion } = insufficientSlotsInfo
    
    // Set the first time slot as the main selection
    bookingStore.setServiceSelection(currentServiceIndex, {
      service: serviceTypeMap[currentService],
      date: selectedDate,
      time: splitSuggestion[0].time,
      vehicleCount: splitSuggestion[0].vehicles,
      location: currentService === "registration" ? selectedLocation : undefined
    })
    
    // Set remaining time slots as split bookings
    if (splitSuggestion.length > 1) {
      const additionalSlots = splitSuggestion.slice(1).map(slot => ({
        service: serviceTypeMap[currentService],
        date: selectedDate,
        time: slot.time,
        vehicleCount: slot.vehicles,
        location: currentService === "registration" ? selectedLocation : undefined
      }))
      bookingStore.setSplitBookings(currentServiceIndex, additionalSlots)
    }
    
    setShowInsufficientSlotsDialog(false)
    setInsufficientSlotsInfo(null)
    setPendingTimeSelection(null)
    
    toast.success(`Booking split across ${splitSuggestion.length} time slots`)
  }
  
  // Handle insufficient slots - choose different time
  const handleChooseDifferentTime = () => {
    setShowInsufficientSlotsDialog(false)
    setInsufficientSlotsInfo(null)
    setPendingTimeSelection(null)
  }
  
  // Handle accepting stagger suggestion for next service
  const handleAcceptStaggerSuggestion = () => {
    if (!staggerSuggestion || !currentService) return
    
    const mainSlot = staggerSuggestion[0]
    
    // Apply the main booking with vehicle assignments
    bookingStore.setServiceSelection(currentServiceIndex, {
      service: serviceTypeMap[currentService],
      date: mainSlot.date,
      time: mainSlot.time,
      vehicleCount: mainSlot.vehicles,
      location: currentService === "registration" ? (mainSlot.location || DEFAULT_LOCATION) : undefined,
      vehicleAssignments: staggerSuggestion.map((slot, idx) => ({
        vehicleGroup: idx + 1,
        vehicleCount: slot.vehicles,
        constraintTime: slot.time,
        constraintDate: slot.date
      }))
    })
    
    // Set additional slots if split booking
    if (staggerSuggestion.length > 1) {
      const additionalSlots = staggerSuggestion.slice(1).map(slot => ({
        service: serviceTypeMap[currentService],
        date: slot.date,
        time: slot.time,
        vehicleCount: slot.vehicles,
        location: currentService === "registration" ? (slot.location || DEFAULT_LOCATION) : undefined
      }))
      bookingStore.setSplitBookings(currentServiceIndex, additionalSlots)
    }
    
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/41ada7fd-1087-4968-83f9-c46a84381e41',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'request/page.tsx:handleAcceptStaggerSuggestion',message:'Accepted stagger suggestion',data:{currentServiceIndex,currentService,mainSlotTime:mainSlot.time,mainSlotDate:mainSlot.date,allStaggerSlots:staggerSuggestion,storedSelections:bookingStore.serviceSelections.map((s,i)=>({index:i,service:s?.service,time:s?.time,date:s?.date,vehicleCount:s?.vehicleCount}))},timestamp:Date.now(),hypothesisId:'H4'})}).catch(()=>{});
    // #endregion
    
    // Close dialog and clear suggestion
    setShowStaggerSuggestionDialog(false)
    setStaggerSuggestion(null)
    
    // Show success message
    const slotSummary = staggerSuggestion.map(s => `${s.time} (${s.vehicles} vehicle${s.vehicles > 1 ? 's' : ''})`).join(', ')
    toast.success(`Booking confirmed: ${slotSummary}`)
  }
  
  // Handle choosing own times (reject stagger suggestion)
  const handleChooseOwnTimes = () => {
    setStaggerSuggestion(null)
    setShowStaggerSuggestionDialog(false)
    // User can now pick their own times manually
    toast.info("Select your preferred times from the calendar")
  }
  
  // Handle accepting vehicle distribution suggestion
  const handleAcceptVehicleDistribution = () => {
    if (!vehicleDistributionData || !currentService || !selectedDate) return
    
    const { suggestedDistribution } = vehicleDistributionData
    
    // Set the first slot as main selection
    const firstSlot = suggestedDistribution[0]
    bookingStore.setServiceSelection(currentServiceIndex, {
      service: serviceTypeMap[currentService],
      date: firstSlot.date,
      time: firstSlot.time,
      vehicleCount: firstSlot.vehicleCount,
      location: currentService === "registration" ? selectedLocation : undefined,
      vehicleAssignments: suggestedDistribution.map(slot => ({
        vehicleGroup: slot.vehicleGroup || 1,
        vehicleCount: slot.vehicleCount,
        constraintTime: slot.time,
        constraintDate: slot.date
      }))
    })
    
    // Set remaining slots as split bookings
    if (suggestedDistribution.length > 1) {
      const splitSlots = suggestedDistribution.slice(1).map(slot => ({
        service: serviceTypeMap[currentService],
        date: slot.date,
        time: slot.time,
        vehicleCount: slot.vehicleCount,
        location: currentService === "registration" ? selectedLocation : undefined
      }))
      bookingStore.setSplitBookings(currentServiceIndex, splitSlots)
    }
    
    setShowVehicleDistributionDialog(false)
    setVehicleDistributionData(null)
    toast.success(`Booked ${suggestedDistribution.length} time slot${suggestedDistribution.length > 1 ? 's' : ''}`)
  }
  
  // Handle custom vehicle distribution
  const handleCustomVehicleDistribution = (distribution: Array<{time: string, date: string, vehicleCount: number}>) => {
    if (!currentService || distribution.length === 0) return
    
    // Set the first slot as main selection
    const firstSlot = distribution[0]
    bookingStore.setServiceSelection(currentServiceIndex, {
      service: serviceTypeMap[currentService],
      date: firstSlot.date,
      time: firstSlot.time,
      vehicleCount: firstSlot.vehicleCount,
      location: currentService === "registration" ? selectedLocation : undefined,
      vehicleAssignments: distribution.map((slot, idx) => ({
        vehicleGroup: idx + 1,
        vehicleCount: slot.vehicleCount,
        constraintTime: slot.time,
        constraintDate: slot.date
      }))
    })
    
    // Set remaining slots as split bookings
    if (distribution.length > 1) {
      const splitSlots = distribution.slice(1).map(slot => ({
        service: serviceTypeMap[currentService],
        date: slot.date,
        time: slot.time,
        vehicleCount: slot.vehicleCount,
        location: currentService === "registration" ? selectedLocation : undefined
      }))
      bookingStore.setSplitBookings(currentServiceIndex, splitSlots)
    }
    
    setShowVehicleDistributionDialog(false)
    setVehicleDistributionData(null)
    toast.success(`Booked ${distribution.length} time slot${distribution.length > 1 ? 's' : ''}`)
  }

  // Fetch availability for a specific service (returns slot counts without updating state)
  const fetchAvailabilityForService = async (service: ServiceType): Promise<Array<{date: string, time: string, count: number}>> => {
    try {
      const response = await fetch(
        `/api/availability?service=${service}&startDate=${startDate}&endDate=${endDate}`
      )
      const data = await response.json()
      if (response.ok && data.success) {
        return data.slotCounts || []
      }
    } catch (error) {
      console.error("Error fetching availability for next service:", error)
    }
    return []
  }

  // Navigate to next service or review
  const handleNextService = async () => {
    if (!bookingStore.isServiceBooked(currentServiceIndex)) {
      toast.error("Please select a time slot for this service")
      return
    }

    if (currentServiceIndex < bookingStore.selectedServices.length - 1) {
      const nextServiceIndex = currentServiceIndex + 1
      const nextService = bookingStore.selectedServices[nextServiceIndex] as ServiceType
      
      // Fetch the NEXT service's availability data before computing stagger suggestion
      const nextServiceSlotCounts = await fetchAvailabilityForService(nextService)
      
      // Calculate staggered booking using the next service's actual booking data
      const staggeredSlots = calculateStaggeredBooking(currentServiceIndex, nextService, nextServiceSlotCounts)
      
      if (staggeredSlots && staggeredSlots.length > 0) {
        // Check if all staggered slots have sufficient capacity using next service's data
        const firstDate = staggeredSlots[0].date
        let allSlotsAvailable = true
        let insufficientSlotInfo: { time: string; available: number; needed: number } | null = null
        
        for (const slot of staggeredSlots) {
          // Get current bookings for this slot from the NEXT service's data
          const slotCount = nextServiceSlotCounts.find(s => s.date === slot.date && s.time === slot.time)?.count || 0
          const capacityForService = getMaxCapacity(nextService)
          const availableSlots = capacityForService - slotCount
          
          if (slot.vehicles > availableSlots) {
            allSlotsAvailable = false
            insufficientSlotInfo = {
              time: slot.time,
              available: availableSlots,
              needed: slot.vehicles
            }
            break
          }
        }
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/41ada7fd-1087-4968-83f9-c46a84381e41',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'request/page.tsx:handleNextService:capacityCheck',message:'Capacity check result',data:{currentServiceIndex,nextServiceIndex,nextService,staggeredSlots,allSlotsAvailable,insufficientSlotInfo,nextServiceCountsForDate:nextServiceSlotCounts.filter(s=>s.date===staggeredSlots[0]?.date)},timestamp:Date.now(),hypothesisId:'H3-H4'})}).catch(()=>{});
        // #endregion
        
        if (allSlotsAvailable) {
          // Store suggestion and show confirmation dialog
          setStaggerSuggestion(staggeredSlots)
          setShowStaggerSuggestionDialog(true)
          
          // Move to next service page
          setCurrentServiceIndex(nextServiceIndex)
          setSelectedMonth(today.getMonth())
          setSelectedYear(today.getFullYear())
          setSelectedDate(staggeredSlots[0].date)
          setSelectedLocation(DEFAULT_LOCATION)
          
          // Don't auto-book - wait for user confirmation
          return
        } else {
          // Not enough capacity - let user manually select
          toast.warning("Auto-stagger unavailable", {
            description: `Not enough slots at ${insufficientSlotInfo?.time}. Please select time manually.`
          })
          
          setCurrentServiceIndex(nextServiceIndex)
          setSelectedMonth(today.getMonth())
          setSelectedYear(today.getFullYear())
          setSelectedDate(null)
          setSelectedLocation(DEFAULT_LOCATION)
        }
      } else {
        // No stagger needed (only single time slot), proceed normally
        setCurrentServiceIndex(nextServiceIndex)
        setSelectedMonth(today.getMonth())
        setSelectedYear(today.getFullYear())
        setSelectedDate(null)
        setSelectedLocation(DEFAULT_LOCATION)
      }
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
      // Flatten all service selections including split bookings
      const allServiceBookings: any[] = []
      bookingStore.serviceSelections.forEach((selection, idx) => {
        const allSelections = bookingStore.getAllSelectionsForService(idx)
        allSelections.forEach(sel => {
          allServiceBookings.push({
            serviceName: sel.service,
            scheduledDate: sel.date,
            scheduledTime: sel.time,
            location: sel.location,
            vehicleCount: sel.vehicleCount || bookingStore.numberOfVehicles
          })
        })
      })
      
      const requestData = {
        customerName: `${bookingStore.firstName} ${bookingStore.lastName}`,
        customerEmail: bookingStore.email,
        customerPhone: "",
        companyName: bookingStore.companyName,
        numberOfVehicles: bookingStore.numberOfVehicles,
        idNumber: bookingStore.idNumber,
        servicesRequested: [...new Set(bookingStore.serviceSelections.map(s => s.service))],
        serviceBookings: allServiceBookings,
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
  
  // Get split slots for display (either from suggestion or confirmed split bookings)
  const splitSlotsForDisplay = useMemo(() => {
    // If showing insufficient slots dialog, show the suggestion
    if (insufficientSlotsInfo && selectedDate) {
      return insufficientSlotsInfo.splitSuggestion
    }
    
    // Otherwise, if there's a confirmed split booking for this service, show it
    if (selectedDate) {
      const allSelections = bookingStore.getAllSelectionsForService(currentServiceIndex)
      if (allSelections.length > 1 && allSelections[0].date === selectedDate) {
        return allSelections.map(sel => ({
          time: sel.time,
          vehicles: sel.vehicleCount || bookingStore.numberOfVehicles
        }))
      }
    }
    
    return []
  }, [insufficientSlotsInfo, selectedDate, currentServiceIndex, bookingStore])

  return (
    <div className="bg-linear-to-b from-background to-muted/30 py-12 px-4 min-h-screen">
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
                  
                  <FormField
                    control={userInfoForm.control}
                    name="companyName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Company Name (Optional)</FormLabel>
                        <FormControl>
                          <Input placeholder="ABC Company Ltd" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={userInfoForm.control}
                      name="numberOfVehicles"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Number of Vehicles *</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              min="1" 
                              placeholder="1" 
                              {...field}
                              onChange={(e) => field.onChange(parseInt(e.target.value) || 1)}
                            />
                          </FormControl>
                          <FormDescription>
                            We can accommodate up to 84 vehicles per day at this time.
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={userInfoForm.control}
                      name="idNumber"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>ID Number</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="1234567890" 
                              maxLength={10}
                              {...field}
                              onChange={(e) => field.onChange(e.target.value.replace(/\D/g, ''))}
                            />
                          </FormControl>
                          <p className="text-xs text-muted-foreground">
                            National registration number, 10 digits (optional)
                          </p>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
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
                {SERVICE_ORDER.map((service) => {
                  const isSelected = bookingStore.selectedServices.includes(service)
                  const Icon = serviceIcons[service]
                  
                  return (
                    <Button
                      key={service}
                      type="button"
                      variant={isSelected ? "default" : "outline"}
                      size="lg"
                      onClick={() => {
                        if (isSelected) {
                          bookingStore.setSelectedServices(
                            bookingStore.selectedServices.filter(s => s !== service)
                          )
                        } else {
                          // Add service and sort by predefined order
                          const newServices = [...bookingStore.selectedServices, service]
                          const sortedServices = newServices.sort(
                            (a, b) => SERVICE_ORDER.indexOf(a as ServiceType) - SERVICE_ORDER.indexOf(b as ServiceType)
                          )
                          bookingStore.setSelectedServices(sortedServices)
                        }
                      }}
                      className={`rounded-xl font-bold transition-all h-auto py-6 flex-col gap-2 relative overflow-hidden ${
                        isSelected ? "ring-2 ring-primary" : ""
                      }`}
                      title={serviceTypeMap[service]}
                    >
                      <Icon className="h-6 w-6 shrink-0" />
                      <span className="text-xs text-center leading-tight line-clamp-3 px-1 max-w-full wrap-break-word hyphens-auto">{serviceTypeMap[service]}</span>
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
                      - Selected: {parseLocalDate(currentSelection.date).toLocaleDateString()} at {currentSelection.time}
                    </span>
                  )}
                </CardDescription>
                
                {/* Service-specific requirements */}
                {currentService === "weighing" && (
                  <div className="mt-4 bg-amber-50 border border-amber-200 rounded-lg p-4">
                    <div className="font-semibold text-amber-900 mb-2 flex items-center gap-2">
                      <AlertCircle className="h-4 w-4" />
                      Important Requirements
                    </div>
                    <ul className="text-sm text-amber-800 space-y-1 ml-6 list-disc">
                      <li>Please bring a valid receipt from the Barbados Revenue Authority</li>
                      <li>Your vehicle must be clean</li>
                      <li>Your vehicle must have a full tank of fuel</li>
                    </ul>
                  </div>
                )}
                
                {currentService === "inspection" && (
                  <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="font-semibold text-blue-900 mb-2 flex items-center gap-2">
                      <AlertCircle className="h-4 w-4" />
                      Important Requirement
                    </div>
                    <p className="text-sm text-blue-800">
                      Please bring a valid receipt from the Barbados Revenue Authority
                    </p>
                  </div>
                )}
                
                {currentService === "registration" && (
                  <div className="mt-4 bg-purple-50 border border-purple-200 rounded-lg p-4">
                    <div className="font-semibold text-purple-900 mb-2 flex items-center gap-2">
                      <AlertCircle className="h-4 w-4" />
                      Important Requirement
                    </div>
                    <p className="text-sm text-purple-800">
                      You must have a valid inspection certificate in order to complete your vehicle registration
                    </p>
                  </div>
                )}
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
                      splitSlots={splitSlotsForDisplay}
                      numberOfVehicles={bookingStore.numberOfVehicles}
                      constrainedByPreviousService={currentServiceIndex > 0}
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
                  {bookingStore.companyName && (
                    <div><strong>Company:</strong> {bookingStore.companyName}</div>
                  )}
                  <div><strong>Number of Vehicles:</strong> {bookingStore.numberOfVehicles}</div>
                  {bookingStore.idNumber && (
                    <div><strong>ID Number:</strong> {bookingStore.idNumber}</div>
                  )}
                </div>
              </div>

              {/* Service Bookings */}
              <div>
                <h3 className="font-semibold mb-2">Scheduled Services</h3>
                <div className="space-y-3">
                  {bookingStore.serviceSelections.map((selection, idx) => {
                    const allSelections = bookingStore.getAllSelectionsForService(idx)
                    const isSplit = allSelections.length > 1
                    
                    return (
                      <div key={idx} className="bg-muted p-4 rounded-lg">
                        <div className="flex items-center gap-3 mb-2">
                          {React.createElement(serviceIcons[bookingStore.selectedServices[idx] as ServiceType], { className: "h-5 w-5 text-primary" })}
                          <div className="font-semibold">{selection.service}</div>
                          <CheckCircle className="h-5 w-5 text-green-600 ml-auto" />
                        </div>
                        
                        {isSplit && (
                          <div className="text-xs text-amber-600 font-medium mb-2 flex items-center gap-1">
                            <span>⚠️</span>
                            Split booking across {allSelections.length} time slots
                          </div>
                        )}
                        
                        <div className="space-y-1.5">
                          {allSelections.map((sel, selIdx) => (
                            <div key={selIdx} className="text-sm text-muted-foreground pl-2 border-l-2 border-primary/30">
                              <div>
                                {parseLocalDate(sel.date).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })} at {sel.time}
                                {sel.vehicleCount && <span className="ml-2 font-semibold">({sel.vehicleCount} vehicle{sel.vehicleCount > 1 ? 's' : ''})</span>}
                              </div>
                              {sel.location && (
                                <div className="text-xs flex items-center gap-1 mt-0.5">
                                  <MapPin className="h-3 w-3" />
                                  {sel.location}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )
                  })}
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
                  onClick={() => !location.disabled && setSelectedLocation(location.value)}
                  disabled={location.disabled}
                  className={`w-full p-4 rounded-lg border-2 text-left transition-all ${
                    location.disabled
                      ? "border-muted bg-muted/30 opacity-50 cursor-not-allowed"
                      : selectedLocation === location.value
                      ? "border-primary bg-primary/5"
                      : "border-muted hover:border-primary/50"
                  }`}
                >
                  <div className="font-semibold">{location.label}</div>
                  {location.disabled && (
                    <div className="text-xs text-muted-foreground mt-1">Currently unavailable</div>
                  )}
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
        
        {/* Insufficient Slots Warning Dialog */}
        <Dialog open={showInsufficientSlotsDialog} onOpenChange={setShowInsufficientSlotsDialog}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Insufficient Slots Available</DialogTitle>
              <DialogDescription>
                There aren't enough slots at your selected time for all {insufficientSlotsInfo?.neededSlots} vehicles.
              </DialogDescription>
            </DialogHeader>
            
            {insufficientSlotsInfo && (
              <div className="py-4 space-y-4">
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-sm">
                  <div className="font-semibold text-amber-900 mb-2">Availability at {insufficientSlotsInfo.time}:</div>
                  <div className="text-amber-800">
                    Only <strong>{insufficientSlotsInfo.availableSlots}</strong> slots available, 
                    but you need <strong>{insufficientSlotsInfo.neededSlots}</strong> slots.
                  </div>
                </div>
                
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="font-semibold text-blue-900 mb-2">Suggested Split:</div>
                  <div className="space-y-2">
                    {insufficientSlotsInfo.splitSuggestion.map((slot, idx) => (
                      <div key={idx} className="flex justify-between text-sm text-blue-800">
                        <span>{slot.time}</span>
                        <span className="font-semibold">{slot.vehicles} vehicle{slot.vehicles > 1 ? 's' : ''}</span>
                      </div>
                    ))}
                  </div>
                </div>
                
                <p className="text-xs text-muted-foreground">
                  You can split your booking across multiple time slots or choose a different time with more availability.
                </p>
              </div>
            )}
            
            <DialogFooter className="flex-col sm:flex-row gap-2">
              <Button 
                variant="outline" 
                onClick={handleChooseDifferentTime}
                className="w-full sm:w-auto"
              >
                Choose Different Time
              </Button>
              <Button 
                onClick={handleSplitAcrossHours}
                className="w-full sm:w-auto"
              >
                Accept Split Booking
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        
        {/* Stagger Suggestion Dialog for Next Service */}
        <Dialog open={showStaggerSuggestionDialog} onOpenChange={setShowStaggerSuggestionDialog}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Suggested Times for {currentService && serviceTypeMap[currentService]}</DialogTitle>
              <DialogDescription>
                Based on your previous booking, we suggest the following times to maintain the stagger pattern.
              </DialogDescription>
            </DialogHeader>
            
            {staggerSuggestion && (
              <div className="py-4 space-y-4">
                <div className="bg-cyan-50 border border-cyan-200 rounded-lg p-4">
                  <div className="font-semibold text-cyan-900 mb-3">Suggested Schedule:</div>
                  <div className="space-y-2">
                    {staggerSuggestion.map((slot, idx) => (
                      <div key={idx} className="flex justify-between items-center text-sm bg-white rounded p-2">
                        <div className="flex flex-col">
                          <span className="font-semibold text-cyan-900">{slot.time}</span>
                          <span className="text-xs text-cyan-700">
                            {parseLocalDate(slot.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                          </span>
                        </div>
                        <div className="text-right">
                          <div className="font-bold text-cyan-900">{slot.vehicles} vehicle{slot.vehicles > 1 ? 's' : ''}</div>
                          <div className="text-xs text-cyan-700">Slot {idx + 1} of {staggerSuggestion.length}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-blue-800">
                  <strong>Note:</strong> These times maintain a one-hour gap from your previous service to allow proper vehicle processing.
                </div>
              </div>
            )}
            
            <DialogFooter className="flex-col sm:flex-row gap-2">
              <Button 
                variant="outline" 
                onClick={handleChooseOwnTimes}
                className="w-full sm:w-auto"
              >
                Choose My Own Times
              </Button>
              <Button 
                onClick={handleAcceptStaggerSuggestion}
                className="w-full sm:w-auto"
              >
                Accept Suggested Times
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        
        {/* Vehicle Distribution Dialog */}
        <Dialog open={showVehicleDistributionDialog} onOpenChange={setShowVehicleDistributionDialog}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Distribute Your Vehicles</DialogTitle>
              <DialogDescription>
                Not all vehicles can fit in a single time slot. Distribute them across multiple slots.
              </DialogDescription>
            </DialogHeader>
            
            {vehicleDistributionData && (
              <VehicleDistribution
                totalVehicles={bookingStore.numberOfVehicles}
                availableSlots={vehicleDistributionData.availableSlots}
                suggestedDistribution={vehicleDistributionData.suggestedDistribution}
                constraints={vehicleDistributionData.constraints}
                onAcceptSuggestion={handleAcceptVehicleDistribution}
                onCustomDistribution={handleCustomVehicleDistribution}
              />
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}
