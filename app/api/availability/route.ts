import { NextResponse } from "next/server"
import { prisma } from "@/lib/server/prisma"
import { withRetry } from "@/lib/server/db-utils"

// Map short service names to full database names
const serviceTypeMap: Record<string, string> = {
  inspection: "Vehicle Inspection",
  weighing: "Vehicle Weighing",
  registration: "Vehicle Registration"
}

// Reverse map for flexibility
const reverseServiceTypeMap: Record<string, string> = {
  "Vehicle Inspection": "inspection",
  "Vehicle Weighing": "weighing",
  "Vehicle Registration": "registration"
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const service = searchParams.get("service")
  const startDate = searchParams.get("startDate")
  const endDate = searchParams.get("endDate")

  if (!service || !startDate || !endDate) {
    return NextResponse.json(
      { 
        success: false,
        error: "Missing required parameters: service, startDate, endDate" 
      },
      { status: 400 }
    )
  }

  // Normalize service name (accept both formats)
  const normalizedService = serviceTypeMap[service] || service

  // Query service bookings for confirmed appointments
  const result = await withRetry(async () => {
    return await prisma.serviceBooking.findMany({
      where: {
        serviceName: normalizedService,
        scheduledDate: {
          gte: new Date(startDate),
          lte: new Date(endDate)
        },
        appointmentRequest: {
          status: "confirmed"
        }
      },
      select: {
        scheduledDate: true,
        scheduledTime: true
      }
    })
  })

  if (!result.success) {
    console.error("Error fetching availability:", result.error)
    
    // Return 503 for connection errors, 500 for other errors
    const statusCode = result.errorType === 'connection' ? 503 : 500
    
    return NextResponse.json(
      { 
        success: false,
        error: result.error || "Failed to fetch availability",
        errorType: result.errorType
      },
      { status: statusCode }
    )
  }

  // Transform to a simple structure for the frontend
  const bookedSlots = result.data!.map(booking => ({
    date: booking.scheduledDate.toISOString().split('T')[0],
    time: booking.scheduledTime
  }))

  return NextResponse.json({
    success: true,
    bookedSlots
  })
}


