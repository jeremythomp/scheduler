import { OfficialBanner } from "@/components/landing/official-banner"

export default function AdminDashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="relative flex min-h-screen w-full flex-col overflow-x-hidden">
      <OfficialBanner />
      {children}
    </div>
  )
}


