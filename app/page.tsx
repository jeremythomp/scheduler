import { OfficialBanner } from "@/components/landing/official-banner"
import { Header } from "@/components/landing/header"
import { Hero } from "@/components/landing/hero"
import { CalendarSection } from "@/components/landing/calendar-section"
import { Footer } from "@/components/landing/footer"

export default function Home() {
  return (
    <div className="relative flex min-h-screen w-full flex-col overflow-x-hidden">
      <OfficialBanner />
      <Header />
      <main className="flex-1 flex flex-col">
        <Hero />
        <CalendarSection />
      </main>
      <Footer />
    </div>
  )
}
