import { NextResponse } from "next/server"
import { prisma } from "@/lib/server/prisma"
import { withRetry } from "@/lib/server/db-utils"

// Map short service names to full database names
const serviceTypeMap: Record<string, string> = {
  inspection: "Vehicle Inspection",
  weighing: "Vehicle Weighing",
  registration: "Vehicle Registration/Customer Service Center"
}

// Reverse map for flexibility
const reverseServiceTypeMap: Record<string, string> = {
  "Vehicle Inspection": "inspection",
  "Vehicle Weighing": "weighing",
  "Vehicle Registration/Customer Service Center": "registration"
}

// Maximum capacity per time slot
const MAX_CAPACITY_PER_SLOT = 5

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

  // Count bookings per slot
  const slotCountMap = new Map<string, number>()
  
  result.data!.forEach(booking => {
    const date = booking.scheduledDate.toISOString().split('T')[0]
    const time = booking.scheduledTime
    const key = `${date}|${time}`
    slotCountMap.set(key, (slotCountMap.get(key) || 0) + 1)
  })

  // Transform to array of slot counts
  const slotCounts = Array.from(slotCountMap.entries()).map(([key, count]) => {
    const [date, time] = key.split('|')
    return { date, time, count }
  })

  return NextResponse.json({
    success: true,
    slotCounts,
    maxCapacity: MAX_CAPACITY_PER_SLOT
  })
}


