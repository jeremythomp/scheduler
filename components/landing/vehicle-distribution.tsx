"use client"

import { useState, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { Car, Check, AlertCircle } from "lucide-react"
import { VehicleSlotAssignment } from "@/lib/stores/booking-store"
import { SlotAvailability, SuggestedDistribution } from "@/lib/booking-utils"

interface VehicleDistributionProps {
  totalVehicles: number
  availableSlots: SlotAvailability[]
  suggestedDistribution: SuggestedDistribution[]
  onAcceptSuggestion: () => void
  onCustomDistribution: (distribution: Array<{time: string, date: string, vehicleCount: number}>) => void
  constraints?: VehicleSlotAssignment[]
}

export function VehicleDistribution({
  totalVehicles,
  availableSlots,
  suggestedDistribution,
  onAcceptSuggestion,
  onCustomDistribution,
  constraints = []
}: VehicleDistributionProps) {
  const [customMode, setCustomMode] = useState(false)
  const [customAllocations, setCustomAllocations] = useState<Record<string, number>>({})
  
  // Calculate allocated and remaining vehicles in custom mode
  const allocatedVehicles = useMemo(() => {
    return Object.values(customAllocations).reduce((sum, count) => sum + count, 0)
  }, [customAllocations])
  
  const remainingVehicles = totalVehicles - allocatedVehicles
  
  // Check if custom distribution is valid
  const isCustomDistributionValid = useMemo(() => {
    if (!customMode) return true
    
    // Must allocate all vehicles
    if (allocatedVehicles !== totalVehicles) return false
    
    // Each slot must not exceed its capacity
    for (const [slotKey, count] of Object.entries(customAllocations)) {
      if (count > 0) {
        const [date, time] = slotKey.split('|')
        const slot = availableSlots.find(s => s.date === date && s.time === time)
        if (!slot || count > slot.availableCapacity) {
          return false
        }
      }
    }
    
    return true
  }, [customMode, customAllocations, totalVehicles, allocatedVehicles, availableSlots])
  
  // Format slot key
  const getSlotKey = (date: string, time: string) => `${date}|${time}`
  
  // Handle custom allocation change
  const handleCustomChange = (date: string, time: string, value: string) => {
    const numValue = parseInt(value) || 0
    const slotKey = getSlotKey(date, time)
    const slot = availableSlots.find(s => s.date === date && s.time === time)
    
    if (!slot) return
    
    // Limit to available capacity
    const clamped = Math.max(0, Math.min(numValue, slot.availableCapacity))
    
    setCustomAllocations(prev => ({
      ...prev,
      [slotKey]: clamped
    }))
  }
  
  // Handle custom distribution submit
  const handleCustomSubmit = () => {
    if (!isCustomDistributionValid) return
    
    const distribution = Object.entries(customAllocations)
      .filter(([_, count]) => count > 0)
      .map(([slotKey, count]) => {
        const [date, time] = slotKey.split('|')
        return { date, time, vehicleCount: count }
      })
    
    onCustomDistribution(distribution)
  }
  
  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <h3 className="font-semibold text-blue-900 mb-1">
              Multiple Vehicles Detected
            </h3>
            <p className="text-sm text-blue-800">
              You have {totalVehicles} vehicles to schedule. We've suggested an optimal distribution across available time slots.
            </p>
            {constraints.length > 0 && (
              <p className="text-xs text-blue-700 mt-2">
                Time slots must be after your previous service bookings.
              </p>
            )}
          </div>
        </div>
      </div>
      
      {/* Suggestion Mode */}
      {!customMode && suggestedDistribution.length > 0 && (
        <div className="space-y-3">
          <h4 className="font-semibold text-sm">Suggested Distribution:</h4>
          
          <div className="grid gap-2">
            {suggestedDistribution.map((slot, idx) => (
              <div
                key={`${slot.date}-${slot.time}-${idx}`}
                className="flex items-center justify-between p-3 bg-cyan-50 border-2 border-cyan-200 rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <div className="bg-cyan-600 text-white rounded-full w-8 h-8 flex items-center justify-center font-bold text-sm">
                    {idx + 1}
                  </div>
                  <div>
                    <div className="font-semibold text-cyan-900">{slot.time}</div>
                    <div className="text-xs text-cyan-700">
                      {(() => {
                        const [year, month, day] = slot.date.split('-').map(Number)
                        const date = new Date(year, month - 1, day)
                        return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
                      })()}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-cyan-900">
                  <Car className="h-4 w-4" />
                  <span className="font-bold">{slot.vehicleCount}</span>
                  <span className="text-sm">vehicle{slot.vehicleCount !== 1 ? 's' : ''}</span>
                </div>
              </div>
            ))}
          </div>
          
          <div className="flex gap-2">
            <Button
              onClick={onAcceptSuggestion}
              className="flex-1"
              size="lg"
            >
              <Check className="mr-2 h-4 w-4" />
              Accept Suggestion
            </Button>
            <Button
              onClick={() => setCustomMode(true)}
              variant="outline"
              className="flex-1"
              size="lg"
            >
              Choose My Own Times
            </Button>
          </div>
        </div>
      )}
      
      {/* No Valid Suggestion */}
      {!customMode && suggestedDistribution.length === 0 && (
        <div className="space-y-3">
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-sm text-amber-800">
            Unable to automatically allocate all vehicles. Please manually select time slots.
          </div>
          <Button
            onClick={() => setCustomMode(true)}
            className="w-full"
            size="lg"
          >
            Choose Times Manually
          </Button>
        </div>
      )}
      
      {/* Custom Mode */}
      {customMode && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="font-semibold text-sm">Custom Distribution:</h4>
            <div className="text-sm">
              <span className={cn(
                "font-bold",
                remainingVehicles === 0 ? "text-green-600" : "text-amber-600"
              )}>
                {remainingVehicles}
              </span>
              <span className="text-muted-foreground ml-1">remaining</span>
            </div>
          </div>
          
          <div className="border rounded-lg overflow-hidden">
            <div className="bg-muted px-3 py-2 text-xs font-semibold text-muted-foreground grid grid-cols-3 gap-2">
              <div>Time Slot</div>
              <div className="text-center">Available</div>
              <div className="text-center">Allocate</div>
            </div>
            
            <div className="divide-y max-h-80 overflow-y-auto">
              {availableSlots
                .filter(slot => slot.availableCapacity > 0)
                .map(slot => {
                  const slotKey = getSlotKey(slot.date, slot.time)
                  const allocated = customAllocations[slotKey] || 0
                  
                  return (
                    <div
                      key={slotKey}
                      className="grid grid-cols-3 gap-2 p-3 items-center hover:bg-muted/50"
                    >
                      <div>
                        <div className="font-medium text-sm">{slot.time}</div>
                        <div className="text-xs text-muted-foreground">
                          {(() => {
                            const [year, month, day] = slot.date.split('-').map(Number)
                            const date = new Date(year, month - 1, day)
                            return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                          })()}
                        </div>
                      </div>
                      <div className="text-center">
                        <div className="inline-flex items-center gap-1 text-sm">
                          <Car className="h-3 w-3" />
                          <span className="font-semibold">{slot.availableCapacity}</span>
                        </div>
                      </div>
                      <div className="flex justify-center">
                        <Input
                          type="number"
                          min="0"
                          max={slot.availableCapacity}
                          value={allocated || ''}
                          onChange={(e) => handleCustomChange(slot.date, slot.time, e.target.value)}
                          className="w-20 text-center"
                          placeholder="0"
                        />
                      </div>
                    </div>
                  )
                })}
            </div>
          </div>
          
          {!isCustomDistributionValid && allocatedVehicles > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-800">
              {allocatedVehicles !== totalVehicles
                ? `Please allocate exactly ${totalVehicles} vehicles (currently ${allocatedVehicles})`
                : "Invalid allocation - some slots exceed capacity"
              }
            </div>
          )}
          
          <div className="flex gap-2">
            <Button
              onClick={() => setCustomMode(false)}
              variant="outline"
              className="flex-1"
            >
              Back to Suggestion
            </Button>
            <Button
              onClick={handleCustomSubmit}
              disabled={!isCustomDistributionValid}
              className="flex-1"
              size="lg"
            >
              <Check className="mr-2 h-4 w-4" />
              Confirm Distribution
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
