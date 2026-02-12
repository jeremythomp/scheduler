import { NextResponse } from "next/server"
import { prisma } from "@/lib/server/prisma"
import { withRetry } from "@/lib/server/db-utils"
import { appointmentRequestSchema } from "@/lib/validation"
import { generateReferenceNumber } from "@/lib/reference-number"
import { generateCancellationToken } from "@/lib/cancellation-token"
import { sendConfirmationEmail } from "@/lib/server/email"

// Service capacity configuration
const SERVICE_CAPACITY: Record<string, number> = {
  "Vehicle Weighing": 12,
  "Vehicle Inspection": 12,
  "Vehicle Registration/Customer Service Center": 5,
}

// Time slots for validation
const TIME_SLOTS = ["08:30 AM", "09:30 AM", "10:30 AM", "11:30 AM", "12:30 PM", "01:30 PM", "02:30 PM"]

// Get max capacity for a service
function getMaxCapacity(serviceName: string): number {
  return SERVICE_CAPACITY[serviceName] || 5
}

// Validate capacity for service bookings
async function validateCapacity(
  serviceBookings: Array<{serviceName: string, scheduledDate: string, scheduledTime: string, vehicleCount?: number}>,
  tx: any
) {
  for (const booking of serviceBookings) {
    const maxCapacity = getMaxCapacity(booking.serviceName)
    const vehicleCount = booking.vehicleCount || 1
    
    // Count existing vehicles (not just records) for this slot
    const existingBookings = await tx.serviceBooking.findMany({
      where: {
        serviceName: booking.serviceName,
        scheduledDate: new Date(booking.scheduledDate),
        scheduledTime: booking.scheduledTime,
        appointmentRequest: {
          status: "confirmed"
        }
      },
      select: {
        vehicleCount: true
      }
    })
    
    // Sum vehicle counts
    const currentCount = existingBookings.reduce(
      (sum, b) => sum + (b.vehicleCount || 1), 
      0
    )
    const availableCapacity = maxCapacity - currentCount
    
    if (vehicleCount > availableCapacity) {
      throw new Error(
        `Insufficient capacity for ${booking.serviceName} at ${booking.scheduledTime} on ${booking.scheduledDate}. ` +
        `Need ${vehicleCount} slots but only ${availableCapacity} available.`
      )
    }
  }
}

// Validate sequential time constraints using positional matching
function validateTimeConstraints(
  serviceBookings: Array<{
    serviceName: string
    scheduledDate: string
    scheduledTime: string
    vehicleCount?: number
  }>
) {
  // Group bookings by service
  const bookingsByService: Record<string, typeof serviceBookings> = {}
  
  for (const booking of serviceBookings) {
    if (!bookingsByService[booking.serviceName]) {
      bookingsByService[booking.serviceName] = []
    }
    bookingsByService[booking.serviceName].push(booking)
  }
  
  // Sort bookings within each service by date then time
  for (const service in bookingsByService) {
    bookingsByService[service].sort((a, b) => {
      if (a.scheduledDate !== b.scheduledDate) {
        return a.scheduledDate.localeCompare(b.scheduledDate)
      }
      return TIME_SLOTS.indexOf(a.scheduledTime) - TIME_SLOTS.indexOf(b.scheduledTime)
    })
  }
  
  // Define service order
  const serviceOrder = [
    "Vehicle Weighing",
    "Vehicle Inspection", 
    "Vehicle Registration/Customer Service Center"
  ]
  const servicesPresent = serviceOrder.filter(service => bookingsByService[service])
  
  // Validate positionally: each slot must be after corresponding slot in previous service
  for (let i = 1; i < servicesPresent.length; i++) {
    const prevService = servicesPresent[i - 1]
    const currentService = servicesPresent[i]
    
    const prevBookings = bookingsByService[prevService]
    const currentBookings = bookingsByService[currentService]
    
    // Each current booking should be after the corresponding previous booking
    const minCount = Math.min(prevBookings.length, currentBookings.length)
    
    for (let j = 0; j < minCount; j++) {
      const prevBooking = prevBookings[j]
      const currentBooking = currentBookings[j]
      
      // Same date: current time must be after previous time
      if (prevBooking.scheduledDate === currentBooking.scheduledDate) {
        const prevTimeIndex = TIME_SLOTS.indexOf(prevBooking.scheduledTime)
        const currentTimeIndex = TIME_SLOTS.indexOf(currentBooking.scheduledTime)
        
        if (currentTimeIndex <= prevTimeIndex) {
          throw new Error(
            `Service ${currentService} slot ${j + 1} must be scheduled after ${prevService} slot ${j + 1}. ` +
            `Found ${currentService} at ${currentBooking.scheduledTime} which is not after ` +
            `${prevService} at ${prevBooking.scheduledTime} for the same vehicle group.`
          )
        }
      }
      // Different dates: current date must be after previous date
      else if (currentBooking.scheduledDate < prevBooking.scheduledDate) {
        throw new Error(
          `Service ${currentService} slot ${j + 1} must be scheduled after ${prevService} slot ${j + 1}. ` +
          `Found ${currentService} on ${currentBooking.scheduledDate} which is before ` +
          `${prevService} on ${prevBooking.scheduledDate}.`
        )
      }
    }
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const validated = appointmentRequestSchema.parse(body)
    
    const referenceNumber = generateReferenceNumber()
    const cancellationToken = generateCancellationToken()
    
    // Validate time constraints before transaction
    try {
      validateTimeConstraints(validated.serviceBookings)
    } catch (error) {
      return NextResponse.json({
        success: false,
        error: error instanceof Error ? error.message : "Invalid time constraints"
      }, { status: 400 })
    }
    
    // Use transaction to create appointment with service bookings atomically
    const result = await withRetry(async () => {
      return await prisma.$transaction(async (tx) => {
        // Validate capacity within transaction (with row-level locking)
        await validateCapacity(validated.serviceBookings, tx)
        
        // Create the appointment request
        const appointment = await tx.appointmentRequest.create({
          data: {
            customerName: validated.customerName,
            customerEmail: validated.customerEmail,
            customerPhone: validated.customerPhone,
            companyName: validated.companyName,
            numberOfVehicles: validated.numberOfVehicles,
            idNumber: validated.idNumber,
            servicesRequested: validated.servicesRequested,
            additionalNotes: validated.additionalNotes,
            referenceNumber,
            cancellationToken,
            status: "confirmed", // Auto-confirm
          }
        })
        
        // Create service bookings for each service
        const serviceBookings = await Promise.all(
          validated.serviceBookings.map((booking) =>
            tx.serviceBooking.create({
              data: {
                appointmentRequestId: appointment.id,
                serviceName: booking.serviceName,
                scheduledDate: new Date(booking.scheduledDate),
                scheduledTime: booking.scheduledTime,
                location: booking.location,
                vehicleCount: booking.vehicleCount || 1,
              }
            })
          )
        )
        
        return {
          ...appointment,
          serviceBookings
        }
      })
    })
    
    if (!result.success) {
      console.error('Error creating appointment request:', result.error)
      
      // Check if it's a capacity validation error
      if (result.error && result.error.includes('Insufficient capacity')) {
        return NextResponse.json({
          success: false,
          error: result.error,
          errorType: 'capacity'
        }, { status: 409 }) // 409 Conflict for capacity issues
      }
      
      // Check if it's a time constraint validation error
      if (result.error && result.error.includes('must be scheduled after')) {
        return NextResponse.json({
          success: false,
          error: result.error,
          errorType: 'constraint'
        }, { status: 400 }) // 400 Bad Request for constraint violations
      }
      
      // Return 503 for connection errors, 500 for other errors
      const statusCode = result.errorType === 'connection' ? 503 : 500
      
      return NextResponse.json({
        success: false,
        error: result.error || "Failed to submit request",
        errorType: result.errorType
      }, { status: statusCode })
    }
    
    // Send confirmation email asynchronously (don't block response)
    sendConfirmationEmail(result.data!).catch(error => {
      console.error('Failed to send confirmation email:', error)
    })
    
    return NextResponse.json({
      success: true,
      referenceNumber,
      appointment: result.data,
      message: "Appointment confirmed successfully!"
    }, { status: 201 })
  } catch (error) {
    console.error('Error creating appointment request:', error)
    
    if (error instanceof Error && 'issues' in error) {
      // Zod validation error
      return NextResponse.json({
        success: false,
        error: "Invalid request data",
        details: error
      }, { status: 400 })
    }
    
    return NextResponse.json({
      success: false,
      error: "Failed to submit request"
    }, { status: 500 })
  }
}







