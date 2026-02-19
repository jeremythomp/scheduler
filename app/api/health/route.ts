import { NextResponse } from "next/server"
import { checkDatabaseHealth } from "@/lib/server/db-utils"

export async function GET() {
  const dbHealthy = await checkDatabaseHealth()

  if (!dbHealthy) {
    return NextResponse.json(
      { status: "unhealthy", db: "unreachable" },
      { status: 503 }
    )
  }

  return NextResponse.json({ status: "ok", db: "connected" })
}
