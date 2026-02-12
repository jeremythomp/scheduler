import { redirect } from "next/navigation"
import { auth } from "@/auth"
import { getUsers, getCancellationStats } from "../../actions"
import { AdminHeader } from "@/components/admin/admin-header"
import { AdminSidebar } from "@/components/admin/admin-sidebar"
import { AdminFooter } from "@/components/admin/admin-footer"
import { UsersTable } from "@/components/admin/users-table"

export default async function UsersPage() {
  const session = await auth()

  if (!session) {
    redirect("/login")
  }

  // Only admins can access this page
  if (session.user.role !== "admin") {
    redirect("/adminDashboard")
  }

  // Fetch all users and cancellation stats
  const [users, cancellationStats] = await Promise.all([
    getUsers(),
    getCancellationStats()
  ])

  return (
    <>
      <AdminHeader
        userName={session.user?.name || undefined}
        userEmail={session.user?.email || undefined}
        userRole={session.user?.role || undefined}
        pendingCount={0}
        todayStats={{
          processed: 0,
          total: 0,
          approved: 0,
          rejected: 0,
        }}
      />

      <main className="flex-1 py-8 md:py-12">
        <div className="mx-auto max-w-7xl px-4 md:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            <AdminSidebar 
              pendingCount={0} 
              todayStats={{
                today: 0,
                thisWeek: 0,
                total: 0
              }}
              cancellationStats={cancellationStats}
              userRole={session.user.role}
            />
            <div className="lg:col-span-9">
              <UsersTable users={users} currentUserId={session.user.id} />
            </div>
          </div>
        </div>
      </main>

      <AdminFooter />
    </>
  )
}
