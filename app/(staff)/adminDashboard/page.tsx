import { redirect } from "next/navigation"
import { auth } from "@/auth"
import { getServiceBookings } from "../actions"
import { AdminHeader } from "@/components/admin/admin-header"
import { AdminFooter } from "@/components/admin/admin-footer"
import { AppointmentsPageContent } from "@/components/admin/appointments-page-content"

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

  // Calculate today's stats for header (all services)
  const todayStr = today.toISOString().split('T')[0]
  const todayAppointments = bookings.filter((b) => {
    const bookingDate = new Date(b.scheduledDate).toISOString().split('T')[0]
    return bookingDate === todayStr
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
          <AppointmentsPageContent 
            initialBookings={bookings}
            userRole={session.user?.role || undefined}
          />
        </div>
      </main>

      <AdminFooter />
    </>
  )
}

