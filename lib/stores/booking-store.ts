import { create } from 'zustand'

export interface ServiceSelection {
  service: string
  date: string
  time: string
}

interface BookingState {
  // User information
  firstName: string
  lastName: string
  email: string
  referenceNumber: string
  
  // Multi-service booking
  selectedServices: string[]           // Services user has paid for
  serviceSelections: ServiceSelection[] // Time slots per service
  currentServiceIndex: number          // Current step in wizard (0 = service selection, 1+ = time selection)
  
  // Actions
  setUserInfo: (info: { firstName: string; lastName: string; email: string; referenceNumber: string }) => void
  setSelectedServices: (services: string[]) => void
  setServiceSelection: (serviceIndex: number, selection: ServiceSelection) => void
  setCurrentServiceIndex: (index: number) => void
  clearBookingData: () => void
  
  // Helper methods
  isServiceBooked: (serviceIndex: number) => boolean
  getServiceSelection: (serviceIndex: number) => ServiceSelection | undefined
  isTimeSlotTaken: (date: string, time: string) => boolean
}

export const useBookingStore = create<BookingState>((set, get) => ({
  // Initial state
  firstName: '',
  lastName: '',
  email: '',
  referenceNumber: '',
  selectedServices: [],
  serviceSelections: [],
  currentServiceIndex: 0,
  
  // Set user information
  setUserInfo: (info) => set({
    firstName: info.firstName,
    lastName: info.lastName,
    email: info.email,
    referenceNumber: info.referenceNumber,
  }),
  
  // Set selected services (from initial selection)
  setSelectedServices: (services) => set({
    selectedServices: services,
    serviceSelections: [], // Reset selections when services change
    currentServiceIndex: 0,
  }),
  
  // Set time slot for a specific service
  setServiceSelection: (serviceIndex, selection) => set((state) => {
    const newSelections = [...state.serviceSelections]
    newSelections[serviceIndex] = selection
    return { serviceSelections: newSelections }
  }),
  
  // Navigate to a specific step
  setCurrentServiceIndex: (index) => set({ currentServiceIndex: index }),
  
  // Clear all booking data
  clearBookingData: () => set({
    firstName: '',
    lastName: '',
    email: '',
    referenceNumber: '',
    selectedServices: [],
    serviceSelections: [],
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
  
  // Check if a time slot is already taken by another service
  isTimeSlotTaken: (date, time) => {
    const state = get()
    return state.serviceSelections.some(
      (selection) => selection.date === date && selection.time === time
    )
  },
}))



