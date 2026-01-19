"use client"

import { useSearchParams, useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { CheckCircle, Calendar, Clock, Mail, Printer, AlertCircle, Home } from "lucide-react"
import Link from "next/link"

interface ServiceBooking {
  serviceName: string
  scheduledDate: string
  scheduledTime: string
}

interface AppointmentDetails {
  referenceNumber: string
  customerName: string
  customerEmail: string
  serviceBookings: ServiceBooking[]
}

export default function ConfirmationPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const referenceNumber = searchParams.get("ref")
  const [appointmentDetails, setAppointmentDetails] = useState<AppointmentDetails | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  // Note: In a real implementation, you would fetch appointment details from an API
  // For now, we'll just display the reference number

  const handlePrint = () => {
    window.print()
  }

  return (
    <div className="bg-gradient-to-b from-background to-muted/30 py-12 px-4 min-h-screen flex items-center justify-center">
      <Card className="w-full max-w-3xl shadow-xl">
        <CardHeader className="text-center border-b bg-gradient-to-r from-green-50 to-emerald-50">
          <div className="mx-auto mb-4 w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
            <CheckCircle className="w-10 h-10 text-green-600" />
          </div>
          <CardTitle className="text-3xl font-bold text-green-600">Appointment Confirmed!</CardTitle>
          <CardDescription className="text-base mt-2">
            Your booking has been confirmed. No further approval needed.
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-6 pt-6">
          {/* Reference Number */}
          {referenceNumber && (
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-6 text-center">
              <div className="text-sm text-blue-600 font-medium mb-1">Your Booking Reference</div>
              <div className="text-3xl font-bold text-blue-900 font-mono mb-2">{referenceNumber}</div>
              <div className="text-xs text-blue-600">
                Please save this for your records
              </div>
            </div>
          )}

          {/* Confirmation Details */}
          <div className="space-y-4">
            <h3 className="font-semibold text-lg">What's Next?</h3>
            
            <div className="space-y-3">
              <div className="flex gap-3 items-start">
                <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                </div>
                <div>
                  <div className="font-medium">Confirmation Email Sent</div>
                  <div className="text-sm text-muted-foreground">
                    Check your email for detailed appointment information and what to bring.
                  </div>
                </div>
              </div>

              <div className="flex gap-3 items-start">
                <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                  <Calendar className="h-4 w-4 text-blue-600" />
                </div>
                <div>
                  <div className="font-medium">Arrive on Time</div>
                  <div className="text-sm text-muted-foreground">
                    Please arrive at least 5 minutes before your scheduled time.
                  </div>
                </div>
              </div>

              <div className="flex gap-3 items-start">
                <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0">
                  <AlertCircle className="h-4 w-4 text-purple-600" />
                </div>
                <div>
                  <div className="font-medium">Payment Verification</div>
                  <div className="text-sm text-muted-foreground">
                    Staff will verify your payment when you arrive. Please bring your payment receipt.
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* What to Bring */}
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
            <h4 className="font-semibold text-amber-900 mb-3 flex items-center gap-2">
              <AlertCircle className="h-5 w-5" />
              What to Bring
            </h4>
            <ul className="space-y-2 text-sm text-amber-800">
              <li className="flex items-start gap-2">
                <span className="font-bold">•</span>
                <span>Valid identification (Driver's License or ID Card)</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-bold">•</span>
                <span>Payment receipt (for verification)</span>
              </li>
            </ul>
          </div>

          {/* Important Notice */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-800">
            <p className="mb-2">
              <strong>Need to cancel or reschedule?</strong>
            </p>
            <p className="mb-3">
              You can cancel your appointment at any time using the cancellation link in your confirmation email,
              or by visiting our{" "}
              <Link href="/manage" className="underline font-semibold hover:text-blue-900">
                appointment management page
              </Link>.
            </p>
            <p className="text-xs text-blue-700">
              Your cooperation helps us serve everyone better.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4 print:hidden">
            <Button 
              onClick={handlePrint} 
              variant="outline" 
              className="flex-1"
            >
              <Printer className="h-4 w-4 mr-2" />
              Print Confirmation
            </Button>
            <Link href="/" className="flex-1">
              <Button variant="default" className="w-full">
                <Home className="h-4 w-4 mr-2" />
                Return to Home
              </Button>
            </Link>
          </div>

          {/* Confirmation Message */}
          <div className="text-center text-sm text-muted-foreground pt-4 border-t">
            <Mail className="h-4 w-4 inline mr-1" />
            A detailed confirmation has been sent to your email address
          </div>
        </CardContent>
      </Card>

      {/* Print Styles */}
      <style jsx global>{`
        @media print {
          body {
            background: white !important;
          }
          .print\\:hidden {
            display: none !important;
          }
        }
      `}</style>
    </div>
  )
}
