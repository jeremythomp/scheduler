import { NextResponse } from "next/server"
import { prisma } from "@/lib/server/prisma"
import { withRetry } from "@/lib/server/db-utils"
import { feedbackSchema } from "@/lib/validation"
import { checkRateLimit, getClientIp } from "@/lib/server/rate-limit"

export async function POST(request: Request) {
  // 5 feedback submissions per IP per hour
  const ip = getClientIp(request)
  const rl = checkRateLimit(`feedback:${ip}`, { limit: 5, windowMs: 60 * 60 * 1000 })
  if (!rl.allowed) {
    return NextResponse.json(
      { success: false, error: "Too many requests. Please try again later." },
      { status: 429, headers: { 'Retry-After': String(Math.ceil(rl.resetAfterMs / 1000)) } }
    )
  }

  try {
    const body = await request.json()
    const parsed = feedbackSchema.safeParse(body)

    if (!parsed.success) {
      const firstError = parsed.error.issues[0]
      const message = firstError?.message ?? "Invalid request data"
      return NextResponse.json(
        { success: false, error: message },
        { status: 400 }
      )
    }

    const userAgent = request.headers.get("user-agent") ?? undefined

    const result = await withRetry(() =>
      prisma.feedback.create({
        data: {
          message: parsed.data.message,
          source: parsed.data.source,
          path: parsed.data.path ?? null,
          userAgent,
        },
      })
    )

    if (!result.success) {
      console.error("Error creating feedback:", result.error)
      const statusCode = result.errorType === "connection" ? 503 : 500
      return NextResponse.json(
        {
          success: false,
          error: result.error ?? "Failed to submit feedback",
        },
        { status: statusCode }
      )
    }

    return NextResponse.json(
      { success: true, message: "Thank you for your feedback." },
      { status: 201 }
    )
  } catch (error) {
    console.error("Error in feedback route:", error)
    return NextResponse.json(
      { success: false, error: "Failed to submit feedback" },
      { status: 500 }
    )
  }
}
