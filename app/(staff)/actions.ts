"use server"

import { auth } from "@/auth"
import { prisma } from "@/lib/server/prisma"
import { withRetry } from "@/lib/server/db-utils"
import { revalidatePath } from "next/cache"
import { sendApprovalEmail, sendDenialEmail, sendWelcomeEmail, sendReschedulingEmail, sendStaffCancellationEmail } from "@/lib/server/email"

// Helper function to generate a secure temporary password
function generateTemporaryPassword(): string {
  const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
  const lowercase = 'abcdefghijklmnopqrstuvwxyz'
  const numbers = '0123456789'
  const specials = '!@#$%^&*'
  
  // Ensure at least one of each required character type
  let password = ''
  password += uppercase[Math.floor(Math.random() * uppercase.length)]
  password += numbers[Math.floor(Math.random() * numbers.length)]
  password += specials[Math.floor(Math.random() * specials.length)]
  
  // Fill the rest with random characters from all sets
  const allChars = uppercase + lowercase + numbers + specials
  for (let i = 0; i < 9; i++) {
    password += allChars[Math.floor(Math.random() * allChars.length)]
  }
  
  // Shuffle the password to randomize character positions
  return password.split('').sort(() => Math.random() - 0.5).join('')
}

export async function getRequests(filters?: {
  status?: string
  search?: string
}) {
  const session = await auth()
  if (!session) throw new Error("Unauthorized")
  
  const where: any = {}
  
  if (filters?.status && filters.status !== "all") {
    where.status = filters.status
  }
  
  if (filters?.search) {
    where.OR = [
      { customerName: { contains: filters.search, mode: "insensitive" } },
      { customerPhone: { contains: filters.search } },
      { licensePlate: { contains: filters.search, mode: "insensitive" } },
      { referenceNumber: { contains: filters.search, mode: "insensitive" } }
    ]
  }
  
  const result = await withRetry(async () => {
    return await prisma.appointmentRequest.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: { 
        approvedByUser: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    })
  })
  
  if (!result.success) {
    throw new Error(result.error || "Database temporarily unavailable")
  }
  
  return result.data!
}

export async function getRequestById(id: number) {
  const session = await auth()
  if (!session) throw new Error("Unauthorized")
  
  const result = await withRetry(async () => {
    return await prisma.appointmentRequest.findUnique({
      where: { id },
      include: { 
        approvedByUser: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    })
  })
  
  if (!result.success) {
    throw new Error(result.error || "Database temporarily unavailable")
  }
  
  return result.data!
}

export async function approveRequest(id: number, staffNotes?: string) {
  const session = await auth()
  if (!session?.user) throw new Error("Unauthorized")
  
  const result = await withRetry(async () => {
    return await prisma.appointmentRequest.update({
      where: { id },
      data: {
        status: "approved",
        approvedBy: parseInt(session.user.id!),
        reviewedAt: new Date(),
        staffNotes: staffNotes || null
      }
    })
  })
  
  if (!result.success) {
    throw new Error(result.error || "Failed to approve request")
  }
  
  // Send approval email asynchronously
  sendApprovalEmail(result.data!).catch(error => {
    console.error('Failed to send approval email:', error)
  })
  
  revalidatePath("/dashboard")
  
  return result.data!
}

export async function denyRequest(id: number, staffNotes?: string) {
  const session = await auth()
  if (!session?.user) throw new Error("Unauthorized")
  
  const result = await withRetry(async () => {
    return await prisma.appointmentRequest.update({
      where: { id },
      data: {
        status: "denied",
        approvedBy: parseInt(session.user.id!),
        reviewedAt: new Date(),
        staffNotes: staffNotes || null
      }
    })
  })
  
  if (!result.success) {
    throw new Error(result.error || "Failed to deny request")
  }
  
  // Send denial email asynchronously
  sendDenialEmail(result.data!).catch(error => {
    console.error('Failed to send denial email:', error)
  })
  
  revalidatePath("/dashboard")
  
  return result.data!
}

export async function getServiceBookings(filters?: {
  serviceType?: string
  startDate?: Date
  endDate?: Date
  search?: string
}) {
  const session = await auth()
  if (!session) throw new Error("Unauthorized")
  
  const where: any = {}
  
  // Filter by service type
  if (filters?.serviceType && filters.serviceType !== "all") {
    where.serviceName = filters.serviceType
  }
  
  // Filter by date range
  if (filters?.startDate || filters?.endDate) {
    where.scheduledDate = {}
    if (filters.startDate) {
      where.scheduledDate.gte = filters.startDate
    }
    if (filters.endDate) {
      where.scheduledDate.lte = filters.endDate
    }
  }
  
  const result = await withRetry(async () => {
    const bookings = await prisma.serviceBooking.findMany({
      where,
      orderBy: { scheduledDate: "asc" },
      include: {
        appointmentRequest: {
          select: {
            id: true,
            referenceNumber: true,
            customerName: true,
            customerEmail: true,
            customerPhone: true,
            numberOfVehicles: true,
            idNumber: true,
            additionalNotes: true,
            status: true,
            createdAt: true,
            serviceBookings: {
              select: {
                id: true,
                serviceName: true,
                scheduledDate: true,
                scheduledTime: true,
                location: true,
                vehicleCount: true
              },
              orderBy: {
                scheduledDate: "asc"
              }
            }
          }
        }
      }
    })
    
    // Apply search filter in memory if needed (searching across appointment data)
    if (filters?.search) {
      const searchLower = filters.search.toLowerCase()
      return bookings.filter(booking => 
        booking.appointmentRequest.customerName.toLowerCase().includes(searchLower) ||
        booking.appointmentRequest.referenceNumber.toLowerCase().includes(searchLower) ||
        (booking.appointmentRequest.customerEmail?.toLowerCase().includes(searchLower))
      )
    }
    
    return bookings
  })
  
  if (!result.success) {
    throw new Error(result.error || "Database temporarily unavailable")
  }
  
  return result.data!
}

// ============================================================================
// User Management Actions (Admin Only)
// ============================================================================

export async function getUsers() {
  const session = await auth()
  if (!session?.user || session.user.role !== "admin") {
    throw new Error("Unauthorized: Admin access required")
  }
  
  const result = await withRetry(async () => {
    return await prisma.staffUser.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
        updatedAt: true
      },
      orderBy: { createdAt: "desc" }
    })
  })
  
  if (!result.success) {
    throw new Error(result.error || "Database temporarily unavailable")
  }
  
  return result.data!
}

export async function createUser(data: {
  name: string
  email: string
  role: string
}) {
  const session = await auth()
  if (!session?.user || session.user.role !== "admin") {
    throw new Error("Unauthorized: Admin access required")
  }
  
  // Generate a secure temporary password
  const temporaryPassword = generateTemporaryPassword()

  // Import hash dynamically to avoid issues
  const { hash } = await import("bcryptjs")
  const passwordHash = await hash(temporaryPassword, 10)

  const result = await withRetry(async () => {
    return await prisma.staffUser.create({
      data: {
        name: data.name,
        email: data.email,
        passwordHash,
        role: data.role,
        mustChangePassword: true
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
        updatedAt: true
      }
    })
  })
  
  if (!result.success) {
    throw new Error(result.error || "Failed to create user")
  }

  // Send welcome email with credentials (async, non-blocking)
  sendWelcomeEmail({
    name: data.name,
    email: data.email,
    temporaryPassword
  }).catch(error => {
    console.error('Failed to send welcome email:', error)
  })
  
  revalidatePath("/adminDashboard/users")
  
  return result.data!
}

export async function updateUser(
  id: number,
  data: {
    name?: string
    email?: string
    password?: string
    role?: string
  }
) {
  const session = await auth()
  if (!session?.user || session.user.role !== "admin") {
    throw new Error("Unauthorized: Admin access required")
  }
  
  const updateData: any = {
    name: data.name,
    email: data.email,
    role: data.role
  }
  
  // Only update password if provided
  if (data.password) {
    const { hash } = await import("bcryptjs")
    updateData.passwordHash = await hash(data.password, 10)
  }
  
  const result = await withRetry(async () => {
    return await prisma.staffUser.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
        updatedAt: true
      }
    })
  })
  
  if (!result.success) {
    throw new Error(result.error || "Failed to update user")
  }
  
  revalidatePath("/adminDashboard/users")
  
  return result.data!
}

export async function deleteUser(id: number) {
  const session = await auth()
  if (!session?.user || session.user.role !== "admin") {
    throw new Error("Unauthorized: Admin access required")
  }
  
  // Prevent self-deletion
  if (parseInt(session.user.id) === id) {
    throw new Error("Cannot delete your own account")
  }
  
  const result = await withRetry(async () => {
    return await prisma.staffUser.delete({
      where: { id }
    })
  })
  
  if (!result.success) {
    throw new Error(result.error || "Failed to delete user")
  }
  
  revalidatePath("/adminDashboard/users")
  
  return { success: true }
}

// ============================================================================
// Check-in and No-show Actions
// ============================================================================

export async function checkInAppointment(appointmentId: number) {
  const session = await auth()
  if (!session?.user) {
    throw new Error("Unauthorized")
  }
  
  const result = await withRetry(async () => {
    return await prisma.appointmentRequest.update({
      where: { id: appointmentId },
      data: {
        status: "checked_in"
      },
      include: {
        serviceBookings: {
          select: {
            id: true,
            serviceName: true,
            scheduledDate: true,
            scheduledTime: true,
            location: true,
            vehicleCount: true
          }
        }
      }
    })
  })
  
  if (!result.success) {
    throw new Error(result.error || "Failed to check in appointment")
  }
  
  revalidatePath("/adminDashboard")
  
  return result.data!
}

export async function markNoShow(appointmentId: number) {
  const session = await auth()
  if (!session?.user) {
    throw new Error("Unauthorized")
  }
  
  const userId = parseInt(session.user.id)
  
  // Fetch the appointment with service bookings
  const appointmentResult = await withRetry(async () => {
    return await prisma.appointmentRequest.findUnique({
      where: { id: appointmentId },
      include: {
        serviceBookings: {
          select: {
            id: true,
            serviceName: true,
            scheduledDate: true,
            scheduledTime: true,
            location: true,
            vehicleCount: true
          }
        }
      }
    })
  })
  
  if (!appointmentResult.success || !appointmentResult.data) {
    throw new Error("Appointment not found")
  }
  
  const appointment = appointmentResult.data
  
  // Update appointment status to no_show and create cancellation log
  const updateResult = await withRetry(async () => {
    return await prisma.$transaction(async (tx) => {
      // Update appointment status
      const updatedAppointment = await tx.appointmentRequest.update({
        where: { id: appointmentId },
        data: { status: "no_show" }
      })
      
      // Create snapshot of service bookings
      const scheduledDates = appointment.serviceBookings.map(booking => 
        `${booking.serviceName}: ${new Date(booking.scheduledDate).toLocaleDateString('en-US', { timeZone: 'UTC' })} at ${booking.scheduledTime}`
      )
      
      // Create cancellation log
      const cancellationLog = await tx.cancellationLog.create({
        data: {
          appointmentRequestId: appointmentId,
          referenceNumber: appointment.referenceNumber,
          customerName: appointment.customerName,
          customerEmail: appointment.customerEmail,
          servicesRequested: appointment.servicesRequested,
          scheduledDates,
          reason: "Customer did not show up for appointment",
          cancelledVia: "staff_no_show",
          cancelledByStaff: userId,
        }
      })
      
      return { updatedAppointment, cancellationLog, serviceBookings: appointment.serviceBookings }
    })
  })
  
  if (!updateResult.success) {
    throw new Error(updateResult.error || "Failed to mark appointment as no-show")
  }
  
  revalidatePath("/adminDashboard")
  
  // Return the freed slots for the shift dialog
  return updateResult.data!
}

// ============================================================================
// Shift Customer Actions
// ============================================================================

const TIME_SLOTS = ["08:30 AM", "09:30 AM", "10:30 AM", "11:30 AM", "12:30 PM", "01:30 PM", "02:30 PM"]

export async function getEligibleForShift(
  serviceName: string, 
  date: string, 
  time: string, 
  freedVehicleCount: number
) {
  const session = await auth()
  if (!session?.user) {
    throw new Error("Unauthorized")
  }
  
  const timeIndex = TIME_SLOTS.indexOf(time)
  if (timeIndex === -1) {
    throw new Error("Invalid time slot")
  }
  
  // Get all time slots after the freed slot
  const laterTimeSlots = TIME_SLOTS.slice(timeIndex + 1)
  
  const result = await withRetry(async () => {
    return await prisma.serviceBooking.findMany({
      where: {
        serviceName,
        scheduledDate: new Date(date),
        scheduledTime: {
          in: laterTimeSlots
        },
        vehicleCount: {
          lte: freedVehicleCount
        },
        appointmentRequest: {
          status: "checked_in"
        }
      },
      include: {
        appointmentRequest: {
          select: {
            id: true,
            referenceNumber: true,
            customerName: true,
            customerEmail: true,
            numberOfVehicles: true,
          }
        }
      },
      orderBy: {
        scheduledTime: "asc"
      }
    })
  })
  
  if (!result.success) {
    throw new Error(result.error || "Failed to fetch eligible bookings")
  }
  
  return result.data!
}

export async function shiftBookingToSlot(
  bookingId: number, 
  newTime: string, 
  staffNotes?: string
) {
  const session = await auth()
  if (!session?.user) {
    throw new Error("Unauthorized")
  }
  
  // Fetch the booking with related appointment request data
  const bookingResult = await withRetry(async () => {
    return await prisma.serviceBooking.findUnique({
      where: { id: bookingId },
      include: {
        appointmentRequest: {
          select: {
            id: true,
            referenceNumber: true,
            customerName: true,
            customerEmail: true,
            status: true,
            staffNotes: true,
            cancellationToken: true
          }
        }
      }
    })
  })
  
  if (!bookingResult.success || !bookingResult.data) {
    throw new Error("Booking not found")
  }
  
  const booking = bookingResult.data
  
  // Verify the appointment is checked in
  if (booking.appointmentRequest.status !== "checked_in") {
    throw new Error("Can only shift checked-in appointments")
  }
  
  // Store old values for email notification
  const oldDate = booking.scheduledDate
  const oldTime = booking.scheduledTime
  const serviceName = booking.serviceName
  
  // Get max capacity for this service type
  const maxCapacity = serviceName === "Vehicle Inspection" || serviceName === "Vehicle Weighing" ? 12 : 5
  
  // Check current bookings for the new time slot to ensure capacity
  const existingBookingsResult = await withRetry(async () => {
    return await prisma.serviceBooking.aggregate({
      where: {
        serviceName: serviceName,
        scheduledDate: booking.scheduledDate,
        scheduledTime: newTime,
        id: { not: bookingId }, // Exclude current booking being shifted
        appointmentRequest: {
          status: {
            in: ["confirmed", "checked_in"]
          }
        }
      },
      _sum: {
        vehicleCount: true
      }
    })
  })
  
  if (!existingBookingsResult.success) {
    throw new Error("Failed to check slot availability")
  }
  
  const currentVehicleCount = existingBookingsResult.data?._sum?.vehicleCount || 0
  const availableCapacity = maxCapacity - currentVehicleCount
  
  if (booking.vehicleCount > availableCapacity) {
    throw new Error(
      `Insufficient capacity. This booking requires ${booking.vehicleCount} vehicle spot${booking.vehicleCount !== 1 ? 's' : ''}, but only ${availableCapacity} spot${availableCapacity !== 1 ? 's' : ''} available at ${newTime}.`
    )
  }
  
  // Update the service booking
  const updateResult = await withRetry(async () => {
    return await prisma.serviceBooking.update({
      where: { id: bookingId },
      data: {
        scheduledTime: newTime,
        updatedAt: new Date()
      }
    })
  })
  
  if (!updateResult.success) {
    throw new Error(updateResult.error || "Failed to shift booking")
  }
  
  // Update staff notes if provided
  if (staffNotes) {
    const existingNotes = booking.appointmentRequest.staffNotes || ""
    const timestamp = new Date().toISOString()
    const newNote = `[${timestamp}] Shifted ${serviceName} from ${oldTime} to ${newTime}: ${staffNotes}`
    const updatedNotes = existingNotes 
      ? `${existingNotes}\n\n${newNote}`
      : newNote
    
    await withRetry(async () => {
      return await prisma.appointmentRequest.update({
        where: { id: booking.appointmentRequest.id },
        data: {
          staffNotes: updatedNotes
        }
      })
    })
  }
  
  // Send rescheduling notification email
  const dateStr = booking.scheduledDate.toISOString().split('T')[0]
  sendReschedulingEmail({
    customerName: booking.appointmentRequest.customerName,
    customerEmail: booking.appointmentRequest.customerEmail,
    referenceNumber: booking.appointmentRequest.referenceNumber,
    serviceName: serviceName,
    oldDate: oldDate,
    oldTime: oldTime,
    newDate: dateStr,
    newTime: newTime,
    staffNotes: staffNotes,
    cancellationToken: booking.appointmentRequest.cancellationToken || undefined
  }).catch(error => {
    console.error('Failed to send rescheduling email:', error)
  })
  
  revalidatePath("/adminDashboard")
  revalidatePath("/dashboard")
  
  return updateResult.data!
}

// ============================================================================
// Day Block Actions
// ============================================================================

const MORNING_SLOTS = ["08:30 AM", "09:30 AM", "10:30 AM", "11:30 AM"]
const AFTERNOON_SLOTS = ["12:30 PM", "01:30 PM", "02:30 PM"]

export async function blockDay(data: {
  date: string
  blockType: 'full' | 'morning' | 'afternoon'
  reason: string
  publicNote: string
}) {
  const session = await auth()
  if (!session?.user) {
    throw new Error("Unauthorized")
  }
  
  const userId = parseInt(session.user.id)
  const blockDate = new Date(data.date)
  
  // Determine which time slots to block
  let blockedTimeSlots: string[]
  if (data.blockType === 'full') {
    blockedTimeSlots = [...MORNING_SLOTS, ...AFTERNOON_SLOTS]
  } else if (data.blockType === 'morning') {
    blockedTimeSlots = MORNING_SLOTS
  } else {
    blockedTimeSlots = AFTERNOON_SLOTS
  }
  
  const result = await withRetry(async () => {
    return await prisma.$transaction(async (tx) => {
      // Create the day block record
      const dayBlock = await tx.dayBlock.create({
        data: {
          date: blockDate,
          blockType: data.blockType,
          reason: data.reason,
          publicNote: data.publicNote,
          createdBy: userId
        }
      })
      
      // Find all affected appointments
      const affectedBookings = await tx.serviceBooking.findMany({
        where: {
          scheduledDate: blockDate,
          scheduledTime: {
            in: blockedTimeSlots
          },
          appointmentRequest: {
            status: {
              in: ["confirmed", "checked_in"]
            }
          }
        },
        include: {
          appointmentRequest: {
            select: {
              id: true,
              referenceNumber: true,
              customerName: true,
              customerEmail: true,
              servicesRequested: true
            }
          }
        }
      })
      
      // Group bookings by appointment
      const appointmentMap = new Map<number, {
        appointment: any
        bookings: any[]
      }>()
      
      for (const booking of affectedBookings) {
        const appointmentId = booking.appointmentRequest.id
        if (!appointmentMap.has(appointmentId)) {
          appointmentMap.set(appointmentId, {
            appointment: booking.appointmentRequest,
            bookings: []
          })
        }
        appointmentMap.get(appointmentId)!.bookings.push(booking)
      }
      
      // Cancel each affected appointment
      const cancelledAppointments = []
      for (const [appointmentId, { appointment, bookings }] of appointmentMap.entries()) {
        // Update appointment status
        await tx.appointmentRequest.update({
          where: { id: appointmentId },
          data: { status: "cancelled" }
        })
        
        // Create snapshot of service bookings
        const scheduledDates = bookings.map(booking => 
          `${booking.serviceName}: ${new Date(booking.scheduledDate).toLocaleDateString('en-US', { timeZone: 'UTC' })} at ${booking.scheduledTime}`
        )
        
        // Create cancellation log
        await tx.cancellationLog.create({
          data: {
            appointmentRequestId: appointmentId,
            referenceNumber: appointment.referenceNumber,
            customerName: appointment.customerName,
            customerEmail: appointment.customerEmail,
            servicesRequested: appointment.servicesRequested,
            scheduledDates,
            reason: data.reason,
            cancelledVia: "day_block",
            cancelledByStaff: userId,
            blockId: dayBlock.id
          }
        })
        
        cancelledAppointments.push({
          customerName: appointment.customerName,
          customerEmail: appointment.customerEmail,
          referenceNumber: appointment.referenceNumber,
          serviceBookings: bookings
        })
      }
      
      return {
        dayBlock,
        cancelledCount: cancelledAppointments.length,
        cancelledAppointments
      }
    })
  })
  
  if (!result.success) {
    throw new Error(result.error || "Failed to block day")
  }
  
  // Send cancellation emails asynchronously
  const { cancelledAppointments } = result.data!
  for (const appointment of cancelledAppointments) {
    sendStaffCancellationEmail({
      customerName: appointment.customerName,
      customerEmail: appointment.customerEmail,
      referenceNumber: appointment.referenceNumber,
      publicNote: data.publicNote,
      serviceBookings: appointment.serviceBookings
    }).catch(error => {
      console.error('Failed to send staff cancellation email:', error)
    })
  }
  
  revalidatePath("/adminDashboard")
  revalidatePath("/")
  
  return result.data!
}

export async function getActiveBlocks(startDate?: string, endDate?: string) {
  const where: any = {}
  
  if (startDate || endDate) {
    where.date = {}
    if (startDate) {
      where.date.gte = new Date(startDate)
    }
    if (endDate) {
      where.date.lte = new Date(endDate)
    }
  }
  
  const result = await withRetry(async () => {
    return await prisma.dayBlock.findMany({
      where,
      orderBy: { date: "asc" },
      include: {
        createdByUser: {
          select: {
            name: true,
            email: true
          }
        }
      }
    })
  })
  
  if (!result.success) {
    throw new Error(result.error || "Failed to fetch day blocks")
  }
  
  return result.data!
}

// ============================================================================
// Appointment Rescheduling Actions
// ============================================================================

export async function rescheduleServiceBooking(data: {
  bookingId: number
  newDate: string
  newTime: string
  staffNotes?: string
}) {
  const session = await auth()
  if (!session?.user) {
    throw new Error("Unauthorized")
  }
  
  // Validate new date is in the future
  const newDateObj = new Date(data.newDate)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  
  if (newDateObj < today) {
    throw new Error("New date must be in the future")
  }
  
  // Fetch the booking with related appointment request data
  const bookingResult = await withRetry(async () => {
    return await prisma.serviceBooking.findUnique({
      where: { id: data.bookingId },
      include: {
        appointmentRequest: {
          select: {
            id: true,
            referenceNumber: true,
            customerName: true,
            customerEmail: true,
            status: true,
            staffNotes: true,
            cancellationToken: true
          }
        }
      }
    })
  })
  
  if (!bookingResult.success || !bookingResult.data) {
    throw new Error("Booking not found")
  }
  
  const booking = bookingResult.data
  
  // Verify the appointment is confirmed
  if (booking.appointmentRequest.status !== "confirmed") {
    throw new Error("Can only reschedule confirmed appointments")
  }
  
  // Store old values for email notification
  const oldDate = booking.scheduledDate
  const oldTime = booking.scheduledTime
  const serviceName = booking.serviceName
  
  // Get max capacity for this service type
  const maxCapacity = serviceName === "Vehicle Inspection" || serviceName === "Vehicle Weighing" ? 12 : 5
  
  // Check current bookings for the new date/time/service to ensure capacity
  const existingBookingsResult = await withRetry(async () => {
    return await prisma.serviceBooking.aggregate({
      where: {
        serviceName: serviceName,
        scheduledDate: newDateObj,
        scheduledTime: data.newTime,
        id: { not: data.bookingId }, // Exclude current booking being rescheduled
        appointmentRequest: {
          status: "confirmed"
        }
      },
      _sum: {
        vehicleCount: true
      }
    })
  })
  
  if (!existingBookingsResult.success) {
    throw new Error("Failed to check slot availability")
  }
  
  const currentVehicleCount = existingBookingsResult.data?._sum?.vehicleCount || 0
  const availableCapacity = maxCapacity - currentVehicleCount
  
  if (booking.vehicleCount > availableCapacity) {
    throw new Error(
      `Insufficient capacity. This booking requires ${booking.vehicleCount} vehicle spot${booking.vehicleCount !== 1 ? 's' : ''}, but only ${availableCapacity} spot${availableCapacity !== 1 ? 's' : ''} available at ${data.newTime} on ${data.newDate}.`
    )
  }
  
  // Update the service booking
  const updateResult = await withRetry(async () => {
    return await prisma.serviceBooking.update({
      where: { id: data.bookingId },
      data: {
        scheduledDate: newDateObj,
        scheduledTime: data.newTime,
        updatedAt: new Date()
      }
    })
  })
  
  if (!updateResult.success) {
    throw new Error(updateResult.error || "Failed to reschedule booking")
  }
  
  // Update staff notes if provided
  if (data.staffNotes) {
    const existingNotes = booking.appointmentRequest.staffNotes || ""
    const timestamp = new Date().toISOString()
    const newNote = `[${timestamp}] Rescheduled ${serviceName}: ${data.staffNotes}`
    const updatedNotes = existingNotes 
      ? `${existingNotes}\n\n${newNote}`
      : newNote
    
    await withRetry(async () => {
      return await prisma.appointmentRequest.update({
        where: { id: booking.appointmentRequest.id },
        data: {
          staffNotes: updatedNotes
        }
      })
    })
  }
  
  // Send rescheduling notification email
  sendReschedulingEmail({
    customerName: booking.appointmentRequest.customerName,
    customerEmail: booking.appointmentRequest.customerEmail,
    referenceNumber: booking.appointmentRequest.referenceNumber,
    serviceName: serviceName,
    oldDate: oldDate,
    oldTime: oldTime,
    newDate: data.newDate,
    newTime: data.newTime,
    staffNotes: data.staffNotes,
    cancellationToken: booking.appointmentRequest.cancellationToken || undefined
  }).catch(error => {
    console.error('Failed to send rescheduling email:', error)
  })
  
  revalidatePath("/adminDashboard")
  revalidatePath("/dashboard")
  
  return updateResult.data!
}

// ============================================================================
// Password Management Actions
// ============================================================================

export async function changePassword(data: {
  currentPassword?: string
  newPassword: string
}) {
  const session = await auth()
  if (!session?.user) {
    throw new Error("Unauthorized")
  }
  
  const userId = parseInt(session.user.id)
  
  // Get the user's current password hash
  const userResult = await withRetry(async () => {
    return await prisma.staffUser.findUnique({
      where: { id: userId },
      select: { passwordHash: true, mustChangePassword: true }
    })
  })
  
  if (!userResult.success || !userResult.data) {
    throw new Error("User not found")
  }
  
  const user = userResult.data
  
  // If current password is provided, verify it
  if (data.currentPassword) {
    const { compare } = await import("bcryptjs")
    const isValid = await compare(data.currentPassword, user.passwordHash)
    
    if (!isValid) {
      throw new Error("Current password is incorrect")
    }
  }
  
  // Validate new password meets strong password requirements
  const { strongPasswordSchema } = await import("@/lib/validation")
  try {
    strongPasswordSchema.parse(data.newPassword)
  } catch (error: any) {
    throw new Error(error.errors?.[0]?.message || "Password does not meet requirements")
  }
  
  // Hash the new password
  const { hash } = await import("bcryptjs")
  const newPasswordHash = await hash(data.newPassword, 10)
  
  // Update the password and clear mustChangePassword flag
  const updateResult = await withRetry(async () => {
    return await prisma.staffUser.update({
      where: { id: userId },
      data: {
        passwordHash: newPasswordHash,
        mustChangePassword: false
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true
      }
    })
  })
  
  if (!updateResult.success) {
    throw new Error(updateResult.error || "Failed to update password")
  }
  
  return { success: true }
}

// ============================================================================
// Cancellation Statistics
// ============================================================================

export async function getCancellationStats() {
  const session = await auth()
  if (!session) throw new Error("Unauthorized")
  
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  
  const startOfWeek = new Date(today)
  startOfWeek.setDate(today.getDate() - today.getDay())
  
  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1)
  
  const result = await withRetry(async () => {
    const [todayCount, weekCount, monthCount] = await Promise.all([
      prisma.cancellationLog.count({ where: { cancelledAt: { gte: today } } }),
      prisma.cancellationLog.count({ where: { cancelledAt: { gte: startOfWeek } } }),
      prisma.cancellationLog.count({ where: { cancelledAt: { gte: startOfMonth } } })
    ])
    return { today: todayCount, thisWeek: weekCount, thisMonth: monthCount }
  })
  
  if (!result.success) throw new Error(result.error || "Database temporarily unavailable")
  return result.data!
}

// ============================================================================
// Analytics
// ============================================================================

export type AnalyticsSummary = {
  totalAppointments: number
  totalCancellations: number
  totalVehicles: number
  appointmentsTrend?: number
  cancellationsTrend?: number
  vehiclesTrend?: number
}

export async function getAnalyticsData(filters?: {
  serviceType?: string
  startDate?: Date
  endDate?: Date
}) {
  const session = await auth()
  if (!session) throw new Error("Unauthorized")

  const where: Parameters<typeof prisma.serviceBooking.findMany>[0]["where"] = {}
  if (filters?.serviceType && filters.serviceType !== "all") {
    where.serviceName = filters.serviceType
  }
  if (filters?.startDate || filters?.endDate) {
    where.scheduledDate = {}
    if (filters.startDate) where.scheduledDate.gte = filters.startDate
    if (filters.endDate) where.scheduledDate.lte = filters.endDate
  }

  const result = await withRetry(async () => {
    const [bookings, cancellationCount] = await Promise.all([
      prisma.serviceBooking.findMany({
        where,
        include: {
          appointmentRequest: {
            select: { numberOfVehicles: true }
          }
        }
      }),
      prisma.cancellationLog.count({
        where: filters?.startDate || filters?.endDate
          ? {
              cancelledAt: {
                ...(filters.startDate && { gte: filters.startDate }),
                ...(filters.endDate && { lte: filters.endDate })
              }
            }
          : undefined
      })
    ])

    const totalAppointments = bookings.length
    const totalVehicles = bookings.reduce(
      (sum, b) => sum + (b.appointmentRequest?.numberOfVehicles ?? b.vehicleCount),
      0
    )

    return {
      totalAppointments,
      totalCancellations: cancellationCount,
      totalVehicles
    } as AnalyticsSummary
  })

  if (!result.success) throw new Error(result.error || "Database temporarily unavailable")
  return result.data!
}

export type CancellationReportRow = {
  referenceNumber: string
  customerName: string
  servicesRequested: string[]
  scheduledDates: string[]
  reason: string | null
  cancelledAt: Date
}

export async function getCancellationsReport(filters?: {
  startDate?: Date
  endDate?: Date
}) {
  const session = await auth()
  if (!session) throw new Error("Unauthorized")

  const where: Parameters<typeof prisma.cancellationLog.findMany>[0]["where"] = {}
  if (filters?.startDate || filters?.endDate) {
    where.cancelledAt = {}
    if (filters.startDate) where.cancelledAt.gte = filters.startDate
    if (filters.endDate) where.cancelledAt.lte = filters.endDate
  }

  const result = await withRetry(async () => {
    return await prisma.cancellationLog.findMany({
      where,
      orderBy: { cancelledAt: "desc" },
      select: {
        referenceNumber: true,
        customerName: true,
        servicesRequested: true,
        scheduledDates: true,
        reason: true,
        cancelledAt: true
      }
    })
  })

  if (!result.success) throw new Error(result.error || "Database temporarily unavailable")
  return result.data!
}

export type CompanyReportRow = {
  companyName: string
  appointmentCount: number
  totalVehicles: number
  avgVehiclesPerVisit: number
}

export async function getCompaniesReport(filters?: {
  serviceType?: string
  startDate?: Date
  endDate?: Date
}) {
  const session = await auth()
  if (!session) throw new Error("Unauthorized")

  const bookingWhere: { serviceName?: string; scheduledDate?: { gte?: Date; lte?: Date } } = {}
  if (filters?.serviceType && filters.serviceType !== "all") {
    bookingWhere.serviceName = filters.serviceType
  }
  if (filters?.startDate || filters?.endDate) {
    bookingWhere.scheduledDate = {}
    if (filters.startDate) bookingWhere.scheduledDate.gte = filters.startDate
    if (filters.endDate) bookingWhere.scheduledDate.lte = filters.endDate
  }

  const result = await withRetry(async () => {
    const bookings = await prisma.serviceBooking.findMany({
      where: {
        appointmentRequest: { status: "confirmed" },
        ...(Object.keys(bookingWhere).length > 0 ? bookingWhere : {})
      },
      include: {
        appointmentRequest: {
          select: { companyName: true, numberOfVehicles: true }
        }
      }
    })

    const byCompany = new Map<string, { appointmentCount: number; totalVehicles: number }>()
    for (const b of bookings) {
      const name = b.appointmentRequest?.companyName?.trim() || "Individual"
      const vehicles = b.vehicleCount ?? b.appointmentRequest?.numberOfVehicles ?? 0
      const existing = byCompany.get(name)
      if (existing) {
        existing.appointmentCount += 1
        existing.totalVehicles += vehicles
      } else {
        byCompany.set(name, { appointmentCount: 1, totalVehicles: vehicles })
      }
    }

    const rows: CompanyReportRow[] = Array.from(byCompany.entries())
      .map(([companyName, { appointmentCount, totalVehicles }]) => ({
        companyName,
        appointmentCount,
        totalVehicles,
        avgVehiclesPerVisit: appointmentCount > 0 ? Math.round((totalVehicles / appointmentCount) * 100) / 100 : 0
      }))
      .sort((a, b) => b.totalVehicles - a.totalVehicles)

    return rows
  })

  if (!result.success) throw new Error(result.error || "Database temporarily unavailable")
  return result.data!
}


