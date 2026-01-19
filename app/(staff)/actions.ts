"use server"

import { auth } from "@/auth"
import { prisma } from "@/lib/server/prisma"
import { withRetry } from "@/lib/server/db-utils"
import { revalidatePath } from "next/cache"
import { sendApprovalEmail, sendDenialEmail, sendWelcomeEmail } from "@/lib/server/email"

// Helper function to generate a secure temporary password
function generateTemporaryPassword(): string {
  const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
  const lowercase = 'abcdefghijklmnopqrstuvwxyz'
  const numbers = '0123456789'
  const specials = '!@#$%^&*'
  
  // Ensure at least one of each required character type
  let password = ''
  password += uppercase[Math.floor(Math.random() * uppercase.length)]
  password += numbers[Math.floor(Math.random() * numbers.length)]
  password += specials[Math.floor(Math.random() * specials.length)]
  
  // Fill the rest with random characters from all sets
  const allChars = uppercase + lowercase + numbers + specials
  for (let i = 0; i < 9; i++) {
    password += allChars[Math.floor(Math.random() * allChars.length)]
  }
  
  // Shuffle the password to randomize character positions
  return password.split('').sort(() => Math.random() - 0.5).join('')
}

export async function getRequests(filters?: {
  status?: string
  search?: string
}) {
  const session = await auth()
  if (!session) throw new Error("Unauthorized")
  
  const where: any = {}
  
  if (filters?.status && filters.status !== "all") {
    where.status = filters.status
  }
  
  if (filters?.search) {
    where.OR = [
      { customerName: { contains: filters.search, mode: "insensitive" } },
      { customerPhone: { contains: filters.search } },
      { licensePlate: { contains: filters.search, mode: "insensitive" } },
      { referenceNumber: { contains: filters.search, mode: "insensitive" } }
    ]
  }
  
  const result = await withRetry(async () => {
    return await prisma.appointmentRequest.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: { 
        approvedByUser: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    })
  })
  
  if (!result.success) {
    throw new Error(result.error || "Database temporarily unavailable")
  }
  
  return result.data!
}

export async function getRequestById(id: number) {
  const session = await auth()
  if (!session) throw new Error("Unauthorized")
  
  const result = await withRetry(async () => {
    return await prisma.appointmentRequest.findUnique({
      where: { id },
      include: { 
        approvedByUser: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    })
  })
  
  if (!result.success) {
    throw new Error(result.error || "Database temporarily unavailable")
  }
  
  return result.data!
}

export async function approveRequest(id: number, staffNotes?: string) {
  const session = await auth()
  if (!session?.user) throw new Error("Unauthorized")
  
  const result = await withRetry(async () => {
    return await prisma.appointmentRequest.update({
      where: { id },
      data: {
        status: "approved",
        approvedBy: parseInt(session.user.id!),
        reviewedAt: new Date(),
        staffNotes: staffNotes || null
      }
    })
  })
  
  if (!result.success) {
    throw new Error(result.error || "Failed to approve request")
  }
  
  // Send approval email asynchronously
  sendApprovalEmail(result.data!).catch(error => {
    console.error('Failed to send approval email:', error)
  })
  
  revalidatePath("/dashboard")
  
  return result.data!
}

export async function denyRequest(id: number, staffNotes?: string) {
  const session = await auth()
  if (!session?.user) throw new Error("Unauthorized")
  
  const result = await withRetry(async () => {
    return await prisma.appointmentRequest.update({
      where: { id },
      data: {
        status: "denied",
        approvedBy: parseInt(session.user.id!),
        reviewedAt: new Date(),
        staffNotes: staffNotes || null
      }
    })
  })
  
  if (!result.success) {
    throw new Error(result.error || "Failed to deny request")
  }
  
  // Send denial email asynchronously
  sendDenialEmail(result.data!).catch(error => {
    console.error('Failed to send denial email:', error)
  })
  
  revalidatePath("/dashboard")
  
  return result.data!
}

export async function getServiceBookings(filters?: {
  serviceType?: string
  startDate?: Date
  endDate?: Date
  search?: string
}) {
  const session = await auth()
  if (!session) throw new Error("Unauthorized")
  
  const where: any = {}
  
  // Filter by service type
  if (filters?.serviceType && filters.serviceType !== "all") {
    where.serviceName = filters.serviceType
  }
  
  // Filter by date range
  if (filters?.startDate || filters?.endDate) {
    where.scheduledDate = {}
    if (filters.startDate) {
      where.scheduledDate.gte = filters.startDate
    }
    if (filters.endDate) {
      where.scheduledDate.lte = filters.endDate
    }
  }
  
  const result = await withRetry(async () => {
    const bookings = await prisma.serviceBooking.findMany({
      where,
      orderBy: { scheduledDate: "asc" },
      include: {
        appointmentRequest: {
          select: {
            id: true,
            referenceNumber: true,
            customerName: true,
            customerEmail: true,
            customerPhone: true,
            vehicleType: true,
            vehicleMake: true,
            vehicleModel: true,
            licensePlate: true,
            vin: true,
            additionalNotes: true,
            status: true,
            createdAt: true
          }
        }
      }
    })
    
    // Apply search filter in memory if needed (searching across appointment data)
    if (filters?.search) {
      const searchLower = filters.search.toLowerCase()
      return bookings.filter(booking => 
        booking.appointmentRequest.customerName.toLowerCase().includes(searchLower) ||
        booking.appointmentRequest.referenceNumber.toLowerCase().includes(searchLower) ||
        (booking.appointmentRequest.customerEmail?.toLowerCase().includes(searchLower)) ||
        (booking.appointmentRequest.licensePlate?.toLowerCase().includes(searchLower))
      )
    }
    
    return bookings
  })
  
  if (!result.success) {
    throw new Error(result.error || "Database temporarily unavailable")
  }
  
  return result.data!
}

// ============================================================================
// User Management Actions (Admin Only)
// ============================================================================

export async function getUsers() {
  const session = await auth()
  if (!session?.user || session.user.role !== "admin") {
    throw new Error("Unauthorized: Admin access required")
  }
  
  const result = await withRetry(async () => {
    return await prisma.staffUser.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
        updatedAt: true
      },
      orderBy: { createdAt: "desc" }
    })
  })
  
  if (!result.success) {
    throw new Error(result.error || "Database temporarily unavailable")
  }
  
  return result.data!
}

export async function createUser(data: {
  name: string
  email: string
  role: string
}) {
  const session = await auth()
  if (!session?.user || session.user.role !== "admin") {
    throw new Error("Unauthorized: Admin access required")
  }
  
  // Generate a secure temporary password
  const temporaryPassword = generateTemporaryPassword()
  
  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/41ada7fd-1087-4968-83f9-c46a84381e41',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'actions.ts:290',message:'Generated password (plain)',data:{password:temporaryPassword,length:temporaryPassword.length,email:data.email},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'H1,H2'})}).catch(()=>{});
  // #endregion
  
  // Import hash dynamically to avoid issues
  const { hash } = await import("bcryptjs")
  const passwordHash = await hash(temporaryPassword, 10)
  
  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/41ada7fd-1087-4968-83f9-c46a84381e41',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'actions.ts:299',message:'Hashed password',data:{hashLength:passwordHash.length,hashPrefix:passwordHash.substring(0,7)},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'H1,H3'})}).catch(()=>{});
  // #endregion
  
  const result = await withRetry(async () => {
    return await prisma.staffUser.create({
      data: {
        name: data.name,
        email: data.email,
        passwordHash,
        role: data.role,
        mustChangePassword: true
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
        updatedAt: true
      }
    })
  })
  
  if (!result.success) {
    throw new Error(result.error || "Failed to create user")
  }
  
  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/41ada7fd-1087-4968-83f9-c46a84381e41',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'actions.ts:326',message:'Before sending email',data:{passwordToEmail:temporaryPassword,userId:result.data?.id},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'H1,H2,H4'})}).catch(()=>{});
  // #endregion
  
  // Send welcome email with credentials (async, non-blocking)
  sendWelcomeEmail({
    name: data.name,
    email: data.email,
    temporaryPassword
  }).catch(error => {
    console.error('Failed to send welcome email:', error)
  })
  
  revalidatePath("/adminDashboard/users")
  
  return result.data!
}

export async function updateUser(
  id: number,
  data: {
    name?: string
    email?: string
    password?: string
    role?: string
  }
) {
  const session = await auth()
  if (!session?.user || session.user.role !== "admin") {
    throw new Error("Unauthorized: Admin access required")
  }
  
  const updateData: any = {
    name: data.name,
    email: data.email,
    role: data.role
  }
  
  // Only update password if provided
  if (data.password) {
    const { hash } = await import("bcryptjs")
    updateData.passwordHash = await hash(data.password, 10)
  }
  
  const result = await withRetry(async () => {
    return await prisma.staffUser.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
        updatedAt: true
      }
    })
  })
  
  if (!result.success) {
    throw new Error(result.error || "Failed to update user")
  }
  
  revalidatePath("/adminDashboard/users")
  
  return result.data!
}

export async function deleteUser(id: number) {
  const session = await auth()
  if (!session?.user || session.user.role !== "admin") {
    throw new Error("Unauthorized: Admin access required")
  }
  
  // Prevent self-deletion
  if (parseInt(session.user.id) === id) {
    throw new Error("Cannot delete your own account")
  }
  
  const result = await withRetry(async () => {
    return await prisma.staffUser.delete({
      where: { id }
    })
  })
  
  if (!result.success) {
    throw new Error(result.error || "Failed to delete user")
  }
  
  revalidatePath("/adminDashboard/users")
  
  return { success: true }
}

// ============================================================================
// Password Management Actions
// ============================================================================

export async function changePassword(data: {
  currentPassword?: string
  newPassword: string
}) {
  const session = await auth()
  if (!session?.user) {
    throw new Error("Unauthorized")
  }
  
  const userId = parseInt(session.user.id)
  
  // Get the user's current password hash
  const userResult = await withRetry(async () => {
    return await prisma.staffUser.findUnique({
      where: { id: userId },
      select: { passwordHash: true, mustChangePassword: true }
    })
  })
  
  if (!userResult.success || !userResult.data) {
    throw new Error("User not found")
  }
  
  const user = userResult.data
  
  // If current password is provided, verify it
  if (data.currentPassword) {
    const { compare } = await import("bcryptjs")
    const isValid = await compare(data.currentPassword, user.passwordHash)
    
    if (!isValid) {
      throw new Error("Current password is incorrect")
    }
  }
  
  // Validate new password meets strong password requirements
  const { strongPasswordSchema } = await import("@/lib/validation")
  try {
    strongPasswordSchema.parse(data.newPassword)
  } catch (error: any) {
    throw new Error(error.errors?.[0]?.message || "Password does not meet requirements")
  }
  
  // Hash the new password
  const { hash } = await import("bcryptjs")
  const newPasswordHash = await hash(data.newPassword, 10)
  
  // Update the password and clear mustChangePassword flag
  const updateResult = await withRetry(async () => {
    return await prisma.staffUser.update({
      where: { id: userId },
      data: {
        passwordHash: newPasswordHash,
        mustChangePassword: false
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true
      }
    })
  })
  
  if (!updateResult.success) {
    throw new Error(updateResult.error || "Failed to update password")
  }
  
  return { success: true }
}



