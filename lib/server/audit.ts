import { Prisma } from "@prisma/client"
import { prisma } from "@/lib/server/prisma"

export async function logAudit(params: {
  action: string
  staffId: number
  staffName: string
  targetType?: string
  targetId?: string
  metadata?: Record<string, unknown>
}): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        action: params.action,
        staffId: params.staffId,
        staffName: params.staffName,
        targetType: params.targetType,
        targetId: params.targetId,
        metadata: params.metadata as Prisma.InputJsonValue | undefined,
      },
    })
  } catch (error) {
    console.error("[audit] Failed to write audit log:", error)
  }
}
