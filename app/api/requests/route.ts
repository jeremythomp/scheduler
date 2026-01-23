import { NextResponse } from "next/server"
import { prisma } from "@/lib/server/prisma"
import { withRetry } from "@/lib/server/db-utils"
import { appointmentRequestSchema } from "@/lib/validation"
import { generateReferenceNumber } from "@/lib/reference-number"
import { generateCancellationToken } from "@/lib/cancellation-token"
import { sendConfirmationEmail } from "@/lib/server/email"

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const validated = appointmentRequestSchema.parse(body)
    
    const referenceNumber = generateReferenceNumber()
    const cancellationToken = generateCancellationToken()
    
    // Use transaction to create appointment with service bookings atomically
    const result = await withRetry(async () => {
      return await prisma.$transaction(async (tx) => {
        // Create the appointment request
        const appointment = await tx.appointmentRequest.create({
          data: {
            customerName: validated.customerName,
            customerEmail: validated.customerEmail,
            customerPhone: validated.customerPhone,
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







