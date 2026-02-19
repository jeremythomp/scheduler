import { NextResponse } from "next/server"
import { prisma } from "@/lib/server/prisma"
import { withRetry } from "@/lib/server/db-utils"
import { checkRateLimit, getClientIp } from "@/lib/server/rate-limit"

export async function POST(request: Request) {
  // 20 lookups per IP per 10 minutes
  const ip = getClientIp(request)
  const rl = checkRateLimit(`lookup:${ip}`, { limit: 20, windowMs: 10 * 60 * 1000 })
  if (!rl.allowed) {
    return NextResponse.json(
      { success: false, error: "Too many requests. Please try again later." },
      { status: 429, headers: { 'Retry-After': String(Math.ceil(rl.resetAfterMs / 1000)) } }
    )
  }

  try {
    const body = await request.json()
    const { referenceNumber, email } = body
    
    if (!referenceNumber || !email) {
      return NextResponse.json({
        success: false,
        error: "Reference number and email are required"
      }, { status: 400 })
    }
    
    // Find appointment by reference number AND email (both must match)
    const result = await withRetry(() =>
      prisma.appointmentRequest.findFirst({
        where: {
          referenceNumber: referenceNumber.trim(),
          customerEmail: {
            equals: email.trim(),
            mode: 'insensitive'
          }
        },
        include: { serviceBookings: true },
      })
    )

    if (!result.success) {
      const statusCode = result.errorType === 'connection' ? 503 : 500
      return NextResponse.json(
        { success: false, error: result.error ?? "Failed to lookup appointment" },
        { status: statusCode }
      )
    }

    const appointment = result.data

    if (!appointment) {
      return NextResponse.json({
        success: false,
        error: "No appointment found with that reference number and email"
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
    console.error('Error looking up appointment:', error)
    return NextResponse.json({
      success: false,
      error: "Failed to lookup appointment"
    }, { status: 500 })
  }
}
