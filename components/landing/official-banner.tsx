import { Flag, Lock } from "lucide-react"

export function OfficialBanner() {
  return (
    <div className="w-full bg-black text-white px-4 py-2 text-xs font-bold uppercase tracking-widest z-50">
      <div className="mx-auto max-w-7xl px-4 md:px-8 flex items-center gap-3">
        <Flag className="h-4 w-4" />
        <span>An official government website</span>
        <span className="ml-auto flex items-center gap-1 normal-case font-normal text-white/70">
          <Lock className="h-3 w-3" />
          Secure &amp; Encrypted
        </span>
      </div>
    </div>
  )
}










