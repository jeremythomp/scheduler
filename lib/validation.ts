import { z } from "zod"

// Schema for individual service booking
export const serviceBookingSchema = z.object({
  serviceName: z.string().min(1, "Service name is required"),
  scheduledDate: z.string().min(1, "Scheduled date is required"),
  scheduledTime: z.string().min(1, "Scheduled time is required"),
})

export type ServiceBookingInput = z.infer<typeof serviceBookingSchema>

// Schema for creating appointment request with multiple service bookings
export const appointmentRequestSchema = z.object({
  customerName: z.string().min(2, "Name must be at least 2 characters"),
  customerEmail: z.string().email("Invalid email address"),
  customerPhone: z.string().optional().default(""),
  vehicleType: z.string().min(1, "Vehicle type is required"),
  vehicleMake: z.string().optional(),
  vehicleModel: z.string().optional(),
  licensePlate: z.string().optional(),
  vin: z.string().optional(),
  servicesRequested: z.array(z.string()).min(1, "At least one service must be selected"),
  serviceBookings: z.array(serviceBookingSchema).min(1, "At least one service booking is required"),
  additionalNotes: z.string().optional()
})

export type AppointmentRequestInput = z.infer<typeof appointmentRequestSchema>

// Schema for the booking wizard form (user information step)
export const bookingFormSchema = z.object({
  firstName: z.string().min(2, "First name must be at least 2 characters"),
  lastName: z.string().min(2, "Last name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  referenceNumber: z.string().min(1, "Reference number is required"),
})

export type BookingFormInput = z.infer<typeof bookingFormSchema>

// Schema for service selection step
export const serviceSelectionSchema = z.object({
  selectedServices: z.array(z.string()).min(1, "At least one service must be selected"),
})

export type ServiceSelectionInput = z.infer<typeof serviceSelectionSchema>

// Strong password validation schema
export const strongPasswordSchema = z.string()
  .min(6, "Password must be at least 6 characters")
  .regex(/[A-Z]/, "Password must contain an uppercase letter")
  .regex(/[0-9]/, "Password must contain a number")
  .regex(/[!@#$%^&*(),.?":{}|<>]/, "Password must contain a special character")

// Helper function to check individual password requirements
export function checkPasswordRequirements(password: string) {
  return {
    minLength: password.length >= 6,
    hasUppercase: /[A-Z]/.test(password),
    hasNumber: /[0-9]/.test(password),
    hasSpecialChar: /[!@#$%^&*(),.?":{}|<>]/.test(password),
  }
}
