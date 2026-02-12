import { VehicleSlotAssignment } from "./stores/booking-store"

export interface SlotAvailability {
  date: string
  time: string
  availableCapacity: number
  totalCapacity: number
}

export interface SuggestedDistribution {
  time: string
  date: string
  vehicleCount: number
  vehicleGroup?: number
}

// Time slots constant
const TIME_SLOTS = ["08:30 AM", "09:30 AM", "10:30 AM", "11:30 AM", "12:30 PM", "01:30 PM", "02:30 PM"]

/**
 * Suggest optimal slot distribution for vehicles across available time slots
 * 
 * @param vehicleCount Total number of vehicles to distribute
 * @param availableSlots Array of slot availability data
 * @param constraints Vehicle group constraints from previous service (if any)
 * @param maxCapacity Maximum capacity per time slot for this service
 * @returns Suggested distribution of vehicles across slots
 */
export function suggestSlotDistribution(
  vehicleCount: number,
  availableSlots: SlotAvailability[],
  constraints: VehicleSlotAssignment[],
  maxCapacity: number
): SuggestedDistribution[] {
  const suggestion: SuggestedDistribution[] = []
  
  // If no constraints, simple greedy allocation
  if (constraints.length === 0) {
    return simpleGreedyAllocation(vehicleCount, availableSlots, maxCapacity)
  }
  
  // With constraints, allocate each vehicle group respecting its constraint
  return constrainedAllocation(vehicleCount, availableSlots, constraints, maxCapacity)
}

/**
 * Simple greedy allocation when there are no constraints
 */
function simpleGreedyAllocation(
  vehicleCount: number,
  availableSlots: SlotAvailability[],
  maxCapacity: number
): SuggestedDistribution[] {
  const suggestion: SuggestedDistribution[] = []
  let remaining = vehicleCount
  
  // Sort slots by time (earliest first)
  const sortedSlots = [...availableSlots].sort((a, b) => {
    if (a.date !== b.date) return a.date.localeCompare(b.date)
    return TIME_SLOTS.indexOf(a.time) - TIME_SLOTS.indexOf(b.time)
  })
  
  for (const slot of sortedSlots) {
    if (remaining <= 0) break
    
    const available = slot.availableCapacity
    if (available > 0) {
      const toBook = Math.min(remaining, available)
      suggestion.push({
        time: slot.time,
        date: slot.date,
        vehicleCount: toBook
      })
      remaining -= toBook
    }
  }
  
  return suggestion
}

/**
 * Constrained allocation respecting vehicle group time constraints
 */
function constrainedAllocation(
  vehicleCount: number,
  availableSlots: SlotAvailability[],
  constraints: VehicleSlotAssignment[],
  maxCapacity: number
): SuggestedDistribution[] {
  const suggestion: SuggestedDistribution[] = []
  
  // For each vehicle group (constraint), find valid slots
  for (const constraint of constraints) {
    let remaining = constraint.vehicleCount
    
    // Filter slots that are valid for this constraint (after constraint time)
    const validSlots = availableSlots.filter(slot => 
      isSlotAfterConstraint(slot, constraint)
    ).sort((a, b) => {
      if (a.date !== b.date) return a.date.localeCompare(b.date)
      return TIME_SLOTS.indexOf(a.time) - TIME_SLOTS.indexOf(b.time)
    })
    
    // Allocate this group's vehicles to valid slots
    for (const slot of validSlots) {
      if (remaining <= 0) break
      
      const available = slot.availableCapacity
      // Check how much space is already allocated to this slot in our suggestion
      const alreadyAllocated = suggestion
        .filter(s => s.date === slot.date && s.time === slot.time)
        .reduce((sum, s) => sum + s.vehicleCount, 0)
      
      const actuallyAvailable = Math.min(available, maxCapacity - alreadyAllocated)
      
      if (actuallyAvailable > 0) {
        const toBook = Math.min(remaining, actuallyAvailable)
        suggestion.push({
          time: slot.time,
          date: slot.date,
          vehicleCount: toBook,
          vehicleGroup: constraint.vehicleGroup
        })
        remaining -= toBook
      }
    }
    
    // If we couldn't allocate all vehicles from this group, return empty (impossible to satisfy)
    if (remaining > 0) {
      return []
    }
  }
  
  return suggestion
}

/**
 * Check if a slot is after the constraint time
 */
function isSlotAfterConstraint(
  slot: SlotAvailability,
  constraint: VehicleSlotAssignment
): boolean {
  if (!constraint.constraintTime || !constraint.constraintDate) return true
  
  const slotTimeIndex = TIME_SLOTS.indexOf(slot.time)
  const constraintTimeIndex = TIME_SLOTS.indexOf(constraint.constraintTime)
  
  // Same date - must be at least one slot after
  if (slot.date === constraint.constraintDate) {
    return slotTimeIndex > constraintTimeIndex
  }
  
  // Different date - must be later date
  return slot.date > constraint.constraintDate
}

/**
 * Get the next available time slot
 */
export function getNextTimeSlot(currentTime: string): string | null {
  const currentIndex = TIME_SLOTS.indexOf(currentTime)
  if (currentIndex === -1 || currentIndex >= TIME_SLOTS.length - 1) return null
  return TIME_SLOTS[currentIndex + 1]
}

/**
 * Convert slot counts to availability data
 */
export function convertToSlotAvailability(
  slotCounts: Array<{date: string, time: string, count: number}>,
  maxCapacity: number,
  date: string
): SlotAvailability[] {
  return TIME_SLOTS.map(time => {
    const slot = slotCounts.find(s => s.date === date && s.time === time)
    const currentCount = slot?.count || 0
    return {
      date,
      time,
      availableCapacity: maxCapacity - currentCount,
      totalCapacity: maxCapacity
    }
  })
}

/**
 * Convert slot counts to availability data for multiple dates
 * 
 * @param slotCounts Array of slot counts from API
 * @param maxCapacity Maximum capacity per time slot
 * @param dates Array of dates to include in availability
 * @returns Array of slot availability across all dates
 */
export function convertToMultiDaySlotAvailability(
  slotCounts: Array<{date: string, time: string, count: number}>,
  maxCapacity: number,
  dates: string[]
): SlotAvailability[] {
  const availableSlots: SlotAvailability[] = []
  
  for (const date of dates) {
    for (const time of TIME_SLOTS) {
      const slot = slotCounts.find(s => s.date === date && s.time === time)
      const currentCount = slot?.count || 0
      availableSlots.push({
        date,
        time,
        availableCapacity: maxCapacity - currentCount,
        totalCapacity: maxCapacity
      })
    }
  }
  
  return availableSlots
}
