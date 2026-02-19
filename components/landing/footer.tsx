import Link from "next/link"
import Image from "next/image"
import { FeedbackForm } from "@/components/feedback/feedback-form"

export function Footer() {
  return (
    <footer className="bg-[#181811] text-white py-12 border-t border-white/10">
      <div className="mx-auto max-w-7xl px-4 md:px-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-10 mb-12">
          {/* Branding Column */}
          <div className="col-span-1 md:col-span-2">
            <div className="flex items-center gap-3 text-white mb-6">
              <div className="relative size-8 flex items-center justify-center">
                <Image 
                  src="/logo.png" 
                  alt="Barbados Licensing Authority Logo" 
                  width={32} 
                  height={32}
                  className="object-contain w-full h-full"
                />
              </div>
              <h2 className="text-lg font-bold">Barbados Licensing Authority</h2>
            </div>
            <p className="text-white/60 text-sm max-w-xs leading-relaxed">
              Schedule your appointments easily and securely with the Barbados Licensing Authority.
            </p>
          </div>
          
          {/* Quick Links Column */}
          <div>
            <h4 className="font-bold mb-4 text-white">Quick Links</h4>
            <ul className="space-y-2 text-sm text-white/60">
              <li>
                <Link
                  href="/request"
                  className="hover:text-primary transition-colors"
                >
                  Schedule Appointment
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Feedback Section */}
        <div className="mb-12">
          <h4 className="font-bold mb-3 text-white">Feedback</h4>
          <p className="text-white/60 text-sm mb-3 max-w-md">
            Found an issue or have a suggestion? Let us know.
          </p>
          <FeedbackForm source="public_footer" />
        </div>
        
        {/* Bottom Bar */}
        <div className="pt-8 border-t border-white/10 flex justify-center items-center text-xs text-white/40">
          <p>© 2026 Barbados Licensing Authority. All rights reserved.</p>
        </div>
      </div>
    </footer>
  )
}










