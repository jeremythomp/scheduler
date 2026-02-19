import { NextResponse } from "next/server"
import { prisma } from "@/lib/server/prisma"
import { withRetry } from "@/lib/server/db-utils"

export async function GET(
  request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params
    
    // Find appointment by cancellation token
    const result = await withRetry(() =>
      prisma.appointmentRequest.findUnique({
        where: { cancellationToken: token },
        include: { serviceBookings: true },
      })
    )

    if (!result.success) {
      const statusCode = result.errorType === 'connection' ? 503 : 500
      return NextResponse.json(
        { success: false, error: result.error ?? "Failed to fetch appointment" },
        { status: statusCode }
      )
    }

    const appointment = result.data
    
    if (!appointment) {
      return NextResponse.json({
        success: false,
        error: "Invalid or expired cancellation link"
      }, { status: 404 })
    }
    
    // Check if already cancelled
    if (appointment.status === 'cancelled') {
      return NextResponse.json({
        success: false,
        error: "This appointment has already been cancelled",
        alreadyCancelled: true
      }, { status: 400 })
    }
    
    return NextResponse.json({
      success: true,
      appointment: {
        id: appointment.id,
        referenceNumber: appointment.referenceNumber,
        customerName: appointment.customerName,
        customerEmail: appointment.customerEmail,
        customerPhone: appointment.customerPhone,
        servicesRequested: appointment.servicesRequested,
        serviceBookings: appointment.serviceBookings.map(booking => ({
          serviceName: booking.serviceName,
          scheduledDate: booking.scheduledDate,
          scheduledTime: booking.scheduledTime,
        })),
        status: appointment.status,
      }
    })
  } catch (error) {
    console.error('Error fetching appointment:', error)
    return NextResponse.json({
      success: false,
      error: "Failed to fetch appointment"
    }, { status: 500 })
  }
}
