import { Header } from "@/components/landing/header"
import { Footer } from "@/components/landing/footer"
import { OfficialBanner } from "@/components/landing/official-banner"

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="relative flex min-h-screen w-full flex-col overflow-x-hidden">
      <OfficialBanner />
      <Header />
      <main className="flex-1 flex flex-col">
        {children}
      </main>
      <Footer />
    </div>
  )
}







