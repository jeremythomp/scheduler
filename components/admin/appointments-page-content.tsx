"use client"

import { useState, useMemo } from "react"
import { ServiceBooking, AppointmentRequest } from "@prisma/client"
import { AdminSidebar } from "./admin-sidebar"
import { AppointmentsView } from "./appointments-view"

type ServiceBookingWithRequest = ServiceBooking & {
  appointmentRequest: Pick<
    AppointmentRequest,
    'id' | 'referenceNumber' | 'customerName' | 'customerEmail' | 'customerPhone' | 
    'numberOfVehicles' | 'idNumber' | 'additionalNotes' | 'status' | 'createdAt'
  >
}

interface AppointmentsPageContentProps {
  initialBookings: ServiceBookingWithRequest[]
  cancellationStats?: {
    today: number
    thisWeek: number
    thisMonth: number
  }
  userRole?: string
}

export function AppointmentsPageContent({ 
  initialBookings, 
  cancellationStats,
  userRole 
}: AppointmentsPageContentProps) {
  const [serviceFilter, setServiceFilter] = useState("all")

  // Filter bookings based on selected service
  const filteredBookings = useMemo(() => {
    if (serviceFilter === "all") {
      return initialBookings
    }
    return initialBookings.filter(booking => booking.serviceName === serviceFilter)
  }, [initialBookings, serviceFilter])

  // Calculate stats from filtered bookings
  const todayStats = useMemo(() => {
    const today = new Date()
    const todayStr = today.toISOString().split('T')[0]
    
    // Calculate today's appointments
    const todayAppointments = filteredBookings.filter((b) => {
      const bookingDate = new Date(b.scheduledDate).toISOString().split('T')[0]
      return bookingDate === todayStr
    })

    // Calculate this week's appointments
    const startOfWeek = new Date(today)
    startOfWeek.setDate(today.getDate() - today.getDay())
    startOfWeek.setHours(0, 0, 0, 0)
    
    const endOfWeek = new Date(startOfWeek)
    endOfWeek.setDate(startOfWeek.getDate() + 6)
    endOfWeek.setHours(23, 59, 59, 999)

    const weekAppointments = filteredBookings.filter((b) => {
      const bookingDate = new Date(b.scheduledDate)
      return bookingDate >= startOfWeek && bookingDate <= endOfWeek
    })

    return {
      today: todayAppointments.length,
      thisWeek: weekAppointments.length,
      total: filteredBookings.length
    }
  }, [filteredBookings])

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
      <AdminSidebar 
        pendingCount={0} 
        todayStats={todayStats}
        cancellationStats={cancellationStats}
        userRole={userRole}
      />
      <div className="lg:col-span-9">
        <AppointmentsView 
          initialBookings={initialBookings}
          serviceFilter={serviceFilter}
          onServiceFilterChange={setServiceFilter}
        />
      </div>
    </div>
  )
}
