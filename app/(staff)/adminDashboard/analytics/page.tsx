import { redirect } from "next/navigation"
import { auth } from "@/auth"
import {
  getAnalyticsData,
  getCompaniesReport,
  getCancellationsReport,
  getCancellationStats,
} from "../../actions"
import { AdminHeader } from "@/components/admin/admin-header"
import { AdminSidebar } from "@/components/admin/admin-sidebar"
import { AdminFooter } from "@/components/admin/admin-footer"
import { AnalyticsPageContent } from "@/components/admin/analytics-page-content"

export default async function AnalyticsPage() {
  const session = await auth()

  if (!session) {
    redirect("/login")
  }

  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0)

  const [summary, companies, cancellations, cancellationStats] = await Promise.all([
    getAnalyticsData({
      startDate: startOfMonth,
      endDate: endOfMonth,
    }),
    getCompaniesReport({
      startDate: startOfMonth,
      endDate: endOfMonth,
    }),
    getCancellationsReport({
      startDate: startOfMonth,
      endDate: endOfMonth,
    }),
    getCancellationStats(),
  ])

  return (
    <>
      <AdminHeader
        userName={session.user?.name || undefined}
        userEmail={session.user?.email || undefined}
        userRole={session.user?.role || undefined}
        pendingCount={0}
        todayStats={{ processed: 0, total: 0, approved: 0, rejected: 0 }}
      />

      <main className="flex-1 py-8 md:py-12">
        <div className="mx-auto max-w-7xl px-4 md:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            <AdminSidebar
              pendingCount={0}
              todayStats={{ today: 0, thisWeek: 0, total: 0 }}
              cancellationStats={cancellationStats}
              userRole={session.user?.role}
            />
            <div className="lg:col-span-9">
              <AnalyticsPageContent
                initialSummary={summary}
                initialCompanies={companies}
                initialCancellations={cancellations}
                cancellationStats={cancellationStats}
                userRole={session.user?.role}
              />
            </div>
          </div>
        </div>
      </main>

      <AdminFooter />
    </>
  )
}
