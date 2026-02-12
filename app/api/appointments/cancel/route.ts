import { NextResponse } from "next/server"
import { prisma } from "@/lib/server/prisma"
import { sendCancellationEmail } from "@/lib/server/email"

export async function POST(request: Request) {
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
    
    // Get client IP for audit trail
    const forwarded = request.headers.get('x-forwarded-for')
    const ipAddress = forwarded ? forwarded.split(',')[0] : 
                     request.headers.get('x-real-ip') || 
                     'unknown'
    
    // Fetch the appointment with service bookings
    const appointment = await prisma.appointmentRequest.findUnique({
      where: { id: appointmentId },
      include: {
        serviceBookings: true,
        cancellation: true,
      }
    })
    
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
    const result = await prisma.$transaction(async (tx) => {
      // Update appointment status
      const updatedAppointment = await tx.appointmentRequest.update({
        where: { id: appointmentId },
        data: { status: 'cancelled' }
      })
      
      // Create snapshot of service bookings
      const scheduledDates = appointment.serviceBookings.map(booking => 
        `${booking.serviceName}: ${new Date(booking.scheduledDate).toLocaleDateString('en-US', { timeZone: 'UTC' })} at ${booking.scheduledTime}`
      )
      
      // Create cancellation log with snapshot
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
    
    // Send cancellation confirmation email asynchronously
    sendCancellationEmail({
      customerName: appointment.customerName,
      customerEmail: appointment.customerEmail,
      referenceNumber: appointment.referenceNumber,
      serviceBookings: appointment.serviceBookings,
    }).catch(error => {
      console.error('Failed to send cancellation email:', error)
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
