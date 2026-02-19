import { NextResponse } from "next/server"
import { prisma } from "@/lib/server/prisma"
import { withRetry } from "@/lib/server/db-utils"
import { checkRateLimit, getClientIp } from "@/lib/server/rate-limit"

const MORNING_SLOTS = ["08:30 AM", "09:30 AM", "10:30 AM", "11:30 AM"]
const AFTERNOON_SLOTS = ["12:30 PM", "01:30 PM", "02:30 PM"]
const ALL_SLOTS = [...MORNING_SLOTS, ...AFTERNOON_SLOTS]

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

// Get max capacity based on service type
const getMaxCapacity = (service: string): number => {
  const normalizedKey = reverseServiceTypeMap[service] || service
  switch (normalizedKey) {
    case "weighing":
    case "inspection":
      return 12
    case "registration":
      return 5
    default:
      return 5
  }
}

export async function GET(request: Request) {
  // 60 availability checks per IP per minute
  const ip = getClientIp(request)
  const rl = checkRateLimit(`availability:${ip}`, { limit: 60, windowMs: 60 * 1000 })
  if (!rl.allowed) {
    return NextResponse.json(
      { success: false, error: "Too many requests. Please try again later." },
      { status: 429, headers: { 'Retry-After': String(Math.ceil(rl.resetAfterMs / 1000)) } }
    )
  }

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

  // Query service bookings for confirmed and checked-in appointments, and day blocks
  const result = await withRetry(async () => {
    const [bookings, dayBlocks] = await Promise.all([
      prisma.serviceBooking.findMany({
        where: {
          serviceName: normalizedService,
          scheduledDate: {
            gte: new Date(startDate),
            lte: new Date(endDate)
          },
          appointmentRequest: {
            status: {
              in: ["confirmed", "checked_in"]
            }
          }
        },
        select: {
          scheduledDate: true,
          scheduledTime: true,
          vehicleCount: true
        }
      }),
      prisma.dayBlock.findMany({
        where: {
          date: {
            gte: new Date(startDate),
            lte: new Date(endDate)
          }
        },
        select: {
          date: true,
          blockType: true
        }
      })
    ])
    
    return { bookings, dayBlocks }
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

  const { bookings, dayBlocks } = result.data!

  // Create a map of blocked dates/slots
  const blockedSlotsMap = new Map<string, boolean>()
  
  dayBlocks.forEach(block => {
    const dateStr = block.date.toISOString().split('T')[0]
    let blockedTimes: string[]
    
    if (block.blockType === 'full') {
      blockedTimes = ALL_SLOTS
    } else if (block.blockType === 'morning') {
      blockedTimes = MORNING_SLOTS
    } else {
      blockedTimes = AFTERNOON_SLOTS
    }
    
    blockedTimes.forEach(time => {
      const key = `${dateStr}|${time}`
      blockedSlotsMap.set(key, true)
    })
  })

  // Count vehicles per slot (not records)
  const slotCountMap = new Map<string, number>()
  
  bookings.forEach(booking => {
    const date = booking.scheduledDate.toISOString().split('T')[0]
    const time = booking.scheduledTime
    const key = `${date}|${time}`
    // Sum vehicleCount instead of counting records
    slotCountMap.set(key, (slotCountMap.get(key) || 0) + (booking.vehicleCount || 1))
  })

  // Add blocked slots with max capacity (effectively making them unavailable)
  const maxCapacity = getMaxCapacity(normalizedService)
  blockedSlotsMap.forEach((_, key) => {
    if (!slotCountMap.has(key)) {
      slotCountMap.set(key, maxCapacity)
    } else {
      // Ensure blocked slots show as full
      slotCountMap.set(key, maxCapacity)
    }
  })

  // Transform to array of slot counts
  const slotCounts = Array.from(slotCountMap.entries()).map(([key, count]) => {
    const [date, time] = key.split('|')
    return { date, time, count }
  })

  // Fully blocked dates (blockType === 'full') for calendar closed styling
  const fullyBlockedDates = dayBlocks
    .filter((block) => block.blockType === "full")
    .map((block) => block.date.toISOString().split("T")[0])

  return NextResponse.json({
    success: true,
    slotCounts,
    maxCapacity,
    fullyBlockedDates,
  })
}


