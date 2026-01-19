import { redirect } from "next/navigation"
import { auth } from "@/auth"
import { getServiceBookings } from "../actions"
import { AdminHeader } from "@/components/admin/admin-header"
import { AdminSidebar } from "@/components/admin/admin-sidebar"
import { AdminFooter } from "@/components/admin/admin-footer"
import { AppointmentsView } from "@/components/admin/appointments-view"

export default async function AdminDashboardPage() {
  const session = await auth()

  if (!session) {
    redirect("/login")
  }

  // Fetch all service bookings for the current month
  const today = new Date()
  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1)
  const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0)

  const bookings = await getServiceBookings({
    startDate: startOfMonth,
    endDate: endOfMonth
  })

  // Calculate today's appointments
  const todayStr = today.toISOString().split('T')[0]
  const todayAppointments = bookings.filter((b) => {
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

  const weekAppointments = bookings.filter((b) => {
    const bookingDate = new Date(b.scheduledDate)
    return bookingDate >= startOfWeek && bookingDate <= endOfWeek
  })

  const todayStats = {
    processed: todayAppointments.length,
    total: todayAppointments.length,
    approved: todayAppointments.length,
    rejected: 0,
  }

  return (
    <>
      <AdminHeader
        userName={session.user?.name || undefined}
        userEmail={session.user?.email || undefined}
        userRole={session.user?.role || undefined}
        pendingCount={0} // No more pending approvals
        todayStats={todayStats}
      />

      <main className="flex-1 py-8 md:py-12">
        <div className="mx-auto max-w-7xl px-4 md:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            <AdminSidebar 
              pendingCount={0} 
              todayStats={{
                today: todayAppointments.length,
                thisWeek: weekAppointments.length,
                total: bookings.length
              }}
              userRole={session.user?.role || undefined}
            />
            <div className="lg:col-span-9">
              <AppointmentsView initialBookings={bookings} />
            </div>
          </div>
        </div>
      </main>

      <AdminFooter />
    </>
  )
}

