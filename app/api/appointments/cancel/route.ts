import { NextResponse } from "next/server"
import { prisma } from "@/lib/server/prisma"
import { withRetry } from "@/lib/server/db-utils"
import { createCancellationEmailContent } from "@/lib/server/email"
import { enqueueEmail } from "@/lib/server/email-queue"
import { checkRateLimit, getClientIp } from "@/lib/server/rate-limit"

export async function POST(request: Request) {
  // 10 cancellation attempts per IP per 10 minutes
  const ip = getClientIp(request)
  const rl = checkRateLimit(`cancel:${ip}`, { limit: 10, windowMs: 10 * 60 * 1000 })
  if (!rl.allowed) {
    return NextResponse.json(
      { success: false, error: "Too many requests. Please try again later." },
      { status: 429, headers: { 'Retry-After': String(Math.ceil(rl.resetAfterMs / 1000)) } }
    )
  }

  try {
    const body = await request.json()
    const { appointmentId, reason, cancelledVia } = body
    
    if (!appointmentId) {
      return NextResponse.json({
        success: false,
        error: "Appointment ID is required"
      }, { status: 400 })
    }
    
    if (!cancelledVia || !['magic_link', 'lookup_page'].includes(cancelledVia)) {
      return NextResponse.json({
        success: false,
        error: "Invalid cancellation method"
      }, { status: 400 })
    }
    
    // ip is already extracted above for rate limiting; reuse for the audit trail
    const ipAddress = ip

    // Fetch the appointment with service bookings
    const fetchResult = await withRetry(() =>
      prisma.appointmentRequest.findUnique({
        where: { id: appointmentId },
        include: { serviceBookings: true, cancellation: true },
      })
    )

    if (!fetchResult.success) {
      const statusCode = fetchResult.errorType === 'connection' ? 503 : 500
      return NextResponse.json(
        { success: false, error: fetchResult.error ?? "Failed to fetch appointment" },
        { status: statusCode }
      )
    }

    const appointment = fetchResult.data

    if (!appointment) {
      return NextResponse.json({
        success: false,
        error: "Appointment not found"
      }, { status: 404 })
    }
    
    if (appointment.status === 'cancelled') {
      return NextResponse.json({
        success: false,
        error: "This appointment has already been cancelled",
        alreadyCancelled: true
      }, { status: 400 })
    }
    
    // Check if there's already a cancellation log (shouldn't happen, but safety check)
    if (appointment.cancellation) {
      return NextResponse.json({
        success: false,
        error: "Cancellation log already exists for this appointment",
        alreadyCancelled: true
      }, { status: 400 })
    }
    
    // Execute cancellation in a transaction
    const cancelResult = await withRetry(() =>
      prisma.$transaction(async (tx) => {
        const updatedAppointment = await tx.appointmentRequest.update({
          where: { id: appointmentId },
          data: { status: 'cancelled' }
        })
        
        const scheduledDates = appointment.serviceBookings.map(booking => 
          `${booking.serviceName}: ${new Date(booking.scheduledDate).toLocaleDateString('en-US', { timeZone: 'UTC' })} at ${booking.scheduledTime}`
        )
        
        const cancellationLog = await tx.cancellationLog.create({
          data: {
            appointmentRequestId: appointmentId,
            referenceNumber: appointment.referenceNumber,
            customerName: appointment.customerName,
            customerEmail: appointment.customerEmail,
            servicesRequested: appointment.servicesRequested,
            scheduledDates,
            reason: reason || null,
            cancelledVia,
            ipAddress,
          }
        })
        
        return { updatedAppointment, cancellationLog }
      })
    )

    if (!cancelResult.success) {
      console.error('Error cancelling appointment:', cancelResult.error)
      const statusCode = cancelResult.errorType === 'connection' ? 503 : 500
      return NextResponse.json(
        { success: false, error: cancelResult.error ?? "Failed to cancel appointment" },
        { status: statusCode }
      )
    }
    
    // Send cancellation confirmation email asynchronously
    const content = createCancellationEmailContent({
      customerName: appointment.customerName,
      customerEmail: appointment.customerEmail,
      referenceNumber: appointment.referenceNumber,
      serviceBookings: appointment.serviceBookings,
    })
    enqueueEmail({
      type: 'cancellation',
      to: appointment.customerEmail,
      ...content,
    }).catch(error => {
      console.error('Failed to enqueue cancellation email:', error)
    })
    
    return NextResponse.json({
      success: true,
      message: "Appointment cancelled successfully",
      referenceNumber: appointment.referenceNumber
    })
  } catch (error) {
    console.error('Error cancelling appointment:', error)
    return NextResponse.json({
      success: false,
      error: "Failed to cancel appointment"
    }, { status: 500 })
  }
}
