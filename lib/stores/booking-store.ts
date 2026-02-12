import { create } from 'zustand'

export interface VehicleSlotAssignment {
  vehicleGroup: number       // Group identifier (1, 2, 3...)
  vehicleCount: number       // Vehicles in this group
  constraintTime: string | null  // Earliest allowed time for next service
  constraintDate: string | null  // Date constraint
}

export interface ServiceSelection {
  service: string
  date: string
  time: string
  location?: string
  vehicleCount?: number  // How many vehicles in this slot (for split bookings)
  vehicleAssignments?: VehicleSlotAssignment[]  // Track which vehicles are in which group
}

interface BookingState {
  // User information
  firstName: string
  lastName: string
  email: string
  companyName: string
  numberOfVehicles: number
  idNumber: string
  
  // Multi-service booking
  selectedServices: string[]           // Services user has paid for
  serviceSelections: ServiceSelection[] // Time slots per service
  splitBookings: Record<number, ServiceSelection[]> // Additional time slots for split bookings (serviceIndex -> array of selections)
  currentServiceIndex: number          // Current step in wizard (0 = service selection, 1+ = time selection)
  
  // Actions
  setUserInfo: (info: { firstName: string; lastName: string; email: string; companyName?: string; numberOfVehicles: number; idNumber?: string }) => void
  setSelectedServices: (services: string[]) => void
  setServiceSelection: (serviceIndex: number, selection: ServiceSelection) => void
  setSplitBookings: (serviceIndex: number, selections: ServiceSelection[]) => void
  setCurrentServiceIndex: (index: number) => void
  clearBookingData: () => void
  
  // Helper methods
  isServiceBooked: (serviceIndex: number) => boolean
  getServiceSelection: (serviceIndex: number) => ServiceSelection | undefined
  getAllSelectionsForService: (serviceIndex: number) => ServiceSelection[]
  isTimeSlotTaken: (date: string, time: string) => boolean
  
  // Vehicle constraint methods
  getConstraintsForNextService: (currentServiceIndex: number) => VehicleSlotAssignment[]
  createVehicleAssignments: (slots: Array<{time: string, date: string, vehicleCount: number}>) => VehicleSlotAssignment[]
  isSlotValidForConstraints: (date: string, time: string, constraints: VehicleSlotAssignment[]) => boolean
}

export const useBookingStore = create<BookingState>((set, get) => ({
  // Initial state
  firstName: '',
  lastName: '',
  email: '',
  companyName: '',
  numberOfVehicles: 1,
  idNumber: '',
  selectedServices: [],
  serviceSelections: [],
  splitBookings: {},
  currentServiceIndex: 0,
  
  // Set user information
  setUserInfo: (info) => set({
    firstName: info.firstName,
    lastName: info.lastName,
    email: info.email,
    companyName: info.companyName || '',
    numberOfVehicles: info.numberOfVehicles,
    idNumber: info.idNumber ?? '',
  }),
  
  // Set selected services (from initial selection)
  setSelectedServices: (services) => set({
    selectedServices: services,
    serviceSelections: [], // Reset selections when services change
    splitBookings: {},
    currentServiceIndex: 0,
  }),
  
  // Set time slot for a specific service
  setServiceSelection: (serviceIndex, selection) => set((state) => {
    const newSelections = [...state.serviceSelections]
    newSelections[serviceIndex] = selection
    return { serviceSelections: newSelections }
  }),
  
  // Set split bookings for a service (multiple time slots)
  setSplitBookings: (serviceIndex, selections) => set((state) => {
    const newSplitBookings = { ...state.splitBookings }
    newSplitBookings[serviceIndex] = selections
    return { splitBookings: newSplitBookings }
  }),
  
  // Navigate to a specific step
  setCurrentServiceIndex: (index) => set({ currentServiceIndex: index }),
  
  // Clear all booking data
  clearBookingData: () => set({
    firstName: '',
    lastName: '',
    email: '',
    companyName: '',
    numberOfVehicles: 1,
    idNumber: '',
    selectedServices: [],
    serviceSelections: [],
    splitBookings: {},
    currentServiceIndex: 0,
  }),
  
  // Check if a service has been booked
  isServiceBooked: (serviceIndex) => {
    const state = get()
    return state.serviceSelections[serviceIndex] !== undefined
  },
  
  // Get selection for a specific service
  getServiceSelection: (serviceIndex) => {
    const state = get()
    return state.serviceSelections[serviceIndex]
  },
  
  // Get all selections for a service (including split bookings)
  getAllSelectionsForService: (serviceIndex) => {
    const state = get()
    const mainSelection = state.serviceSelections[serviceIndex]
    const splitSelections = state.splitBookings[serviceIndex] || []
    return mainSelection ? [mainSelection, ...splitSelections] : splitSelections
  },
  
  // Check if a time slot is already taken by another service
  isTimeSlotTaken: (date, time) => {
    const state = get()
    // Check main selections
    const mainTaken = state.serviceSelections.some(
      (selection) => selection && selection.date === date && selection.time === time
    )
    if (mainTaken) return true
    
    // Check split bookings
    const splitTaken = Object.values(state.splitBookings).some(
      (selections) => selections.some(
        (selection) => selection.date === date && selection.time === time
      )
    )
    return splitTaken
  },
  
  // Get constraints for the next service based on current service bookings
  getConstraintsForNextService: (currentServiceIndex) => {
    const state = get()
    const constraints: VehicleSlotAssignment[] = []
    
    // Get all selections for the current service
    const allSelections = state.getAllSelectionsForService(currentServiceIndex)
    
    allSelections.forEach((selection, idx) => {
      // Each slot becomes a constraint with its vehicle count
      constraints.push({
        vehicleGroup: idx + 1,
        vehicleCount: selection.vehicleCount || state.numberOfVehicles,
        constraintTime: selection.time,
        constraintDate: selection.date
      })
    })
    
    return constraints
  },
  
  // Create vehicle assignments for given slots
  createVehicleAssignments: (slots) => {
    return slots.map((slot, idx) => ({
      vehicleGroup: idx + 1,
      vehicleCount: slot.vehicleCount,
      constraintTime: slot.time,
      constraintDate: slot.date
    }))
  },
  
  // Check if a slot time is valid given constraints (must be after constraint time)
  isSlotValidForConstraints: (date, time, constraints) => {
    if (constraints.length === 0) return true
    
    // Define time slot order for comparison
    const TIME_SLOTS = ["08:30 AM", "09:30 AM", "10:30 AM", "11:30 AM", "12:30 PM", "01:30 PM", "02:30 PM"]
    const selectedTimeIndex = TIME_SLOTS.indexOf(time)
    
    if (selectedTimeIndex === -1) return false
    
    // Check each constraint - at least one must be satisfied
    // (slot must be after the constraint time for that vehicle group)
    for (const constraint of constraints) {
      if (!constraint.constraintTime || !constraint.constraintDate) continue
      
      const constraintTimeIndex = TIME_SLOTS.indexOf(constraint.constraintTime)
      
      // If same date, must be at least one slot after
      if (date === constraint.constraintDate) {
        if (selectedTimeIndex <= constraintTimeIndex) {
          return false
        }
      }
      // If different date, must be later date (or we could add date comparison logic)
    }
    
    return true
  },
}))



