import Link from "next/link"
import Image from "next/image"
import { FeedbackForm } from "@/components/feedback/feedback-form"

export function AdminFooter() {
  return (
    <footer className="bg-[#181811] text-white py-12 border-t border-white/10">
      <div className="mx-auto max-w-7xl px-4 md:px-8">
        <div className="mb-12">
          {/* Branding Column */}
          <div>
            <div className="flex items-center gap-3 text-white mb-6">
              <div className="relative size-12 flex items-center justify-center">
                <Image
                  src="/logo.png"
                  alt="Barbados Licensing Authority Logo"
                  width={48}
                  height={48}
                  className="object-contain w-full h-full"
                />
              </div>
              <h2 className="text-lg font-bold">Barbados Licensing Authority</h2>
            </div>
            <p className="text-white/60 text-sm max-w-xs leading-relaxed">
              Internal Staff Portal for managing vehicle inspections, registrations, and appointments.
            </p>
          </div>

          {/* Feedback Section */}
          <div className="mt-8">
            <h4 className="font-bold mb-3 text-white">Feedback</h4>
            <p className="text-white/60 text-sm mb-3 max-w-md">
              Report an issue or share suggestions about the staff portal.
            </p>
            <FeedbackForm source="admin_footer" />
          </div>
        </div>
        
        {/* Bottom Bar */}
        <div className="pt-8 border-t border-white/10 flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-white/40">
          <div className="flex gap-6">
            <Link href="#privacy" className="hover:text-white transition-colors">
              Privacy Policy
            </Link>
            <Link href="#acceptable-use" className="hover:text-white transition-colors">
              Acceptable Use Policy
            </Link>
          </div>
          <p>© 2023 Barbados Licensing Authority. Internal Use Only.</p>
        </div>
      </div>
    </footer>
  )
}

