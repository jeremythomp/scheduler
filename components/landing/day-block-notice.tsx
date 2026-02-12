import { prisma } from "@/lib/server/prisma"
import { AlertTriangle, X } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

export async function DayBlockNotice() {
  // Query for active day blocks in the next 30 days
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  
  const thirtyDaysFromNow = new Date(today)
  thirtyDaysFromNow.setDate(today.getDate() + 30)
  
  const dayBlocks = await prisma.dayBlock.findMany({
    where: {
      date: {
        gte: today,
        lte: thirtyDaysFromNow
      }
    },
    orderBy: {
      date: 'asc'
    },
    take: 5 // Limit to 5 most recent blocks
  })
  
  if (dayBlocks.length === 0) {
    return null
  }
  
  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      timeZone: 'UTC'
    })
  }
  
  const getBlockTypeLabel = (blockType: string) => {
    switch (blockType) {
      case 'full':
        return 'Full Day'
      case 'morning':
        return 'Morning (8:30 AM - 11:30 AM)'
      case 'afternoon':
        return 'Afternoon (12:30 PM - 2:30 PM)'
      default:
        return blockType
    }
  }
  
  return (
    <div className="bg-red-50 border-t border-b border-red-200 dark:bg-red-900/20 dark:border-red-800">
      <div className="mx-auto max-w-7xl px-4 md:px-8 py-6">
        <div className="space-y-4">
          {dayBlocks.map((block) => (
            <Alert key={block.id} className="bg-white dark:bg-gray-900 border-red-300 dark:border-red-700">
              <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400" />
              <AlertTitle className="text-red-900 dark:text-red-100 font-bold">
                Service Interruption - {formatDate(block.date)}
              </AlertTitle>
              <AlertDescription className="text-red-800 dark:text-red-200">
                <div className="space-y-2 mt-2">
                  <p className="font-medium">
                    {getBlockTypeLabel(block.blockType)} appointments are unavailable.
                  </p>
                  <p className="text-sm">
                    {block.publicNote}
                  </p>
                </div>
              </AlertDescription>
            </Alert>
          ))}
        </div>
      </div>
    </div>
  )
}
