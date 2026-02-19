"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "sonner"

type FeedbackSource = "public_footer" | "admin_footer"

interface FeedbackFormProps {
  source: FeedbackSource
}

export function FeedbackForm({ source }: FeedbackFormProps) {
  const [message, setMessage] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = message.trim()
    if (!trimmed) {
      toast.error("Please enter your feedback")
      return
    }
    if (trimmed.length < 5) {
      toast.error("Please enter at least 5 characters")
      return
    }
    setIsSubmitting(true)
    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: trimmed,
          source,
          path: typeof window !== "undefined" ? window.location.pathname : undefined,
        }),
      })
      const data = await res.json()
      if (res.ok && data.success) {
        toast.success(data.message ?? "Thank you for your feedback.")
        setMessage("")
      } else {
        toast.error(data.error ?? "Failed to submit feedback. Please try again.")
      }
    } catch {
      toast.error("Failed to submit feedback. Please try again.")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-2">
      <Textarea
        placeholder="Share feedback or report an issue..."
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        disabled={isSubmitting}
        rows={3}
        maxLength={2000}
        className="min-h-18 resize-y bg-white/5 border-white/20 text-white placeholder:text-white/50 focus-visible:ring-white/30"
        aria-label="Feedback message"
      />
      <Button
        type="submit"
        size="sm"
        disabled={isSubmitting || !message.trim()}
        variant="secondary"
        className="bg-white/10 text-white hover:bg-white/20 border border-white/20"
      >
        {isSubmitting ? "Sending..." : "Send feedback"}
      </Button>
    </form>
  )
}
