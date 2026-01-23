"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { AlertCircle, Calendar, CheckCircle, Loader2, Search, XCircle } from "lucide-react"
import Link from "next/link"

interface ServiceBooking {
  serviceName: string
  scheduledDate: string
  scheduledTime: string
}

interface Appointment {
  id: number
  referenceNumber: string
  customerName: string
  customerEmail: string
  servicesRequested: string[]
  serviceBookings: ServiceBooking[]
  status: string
}

export default function ManagePage() {
  const [referenceNumber, setReferenceNumber] = useState("")
  const [email, setEmail] = useState("")
  const [isLookingUp, setIsLookingUp] = useState(false)
  const [isCancelling, setIsCancelling] = useState(false)
  const [appointment, setAppointment] = useState<Appointment | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [cancelled, setCancelled] = useState(false)
  const [reason, setReason] = useState("")
  
  const handleLookup = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLookingUp(true)
    setError(null)
    setAppointment(null)
    
    try {
      const response = await fetch('/api/appointments/lookup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          referenceNumber: referenceNumber.trim(),
          email: email.trim()
        })
      })
      
      const data = await response.json()
      
      if (data.success) {
        setAppointment(data.appointment)
      } else {
        setError(data.error || "Failed to find appointment")
      }
    } catch (error) {
      setError("Failed to connect to server")
    } finally {
      setIsLookingUp(false)
    }
  }
  
  const handleCancel = async () => {
    if (!appointment) return
    
    setIsCancelling(true)
    setError(null)
    
    try {
      const response = await fetch('/api/appointments/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          appointmentId: appointment.id,
          reason: reason.trim() || null,
          cancelledVia: 'lookup_page'
        })
      })
      
      const data = await response.json()
      
      if (data.success) {
        setCancelled(true)
      } else {
        setError(data.error || "Failed to cancel appointment")
      }
    } catch (error) {
      setError("Failed to connect to server")
    } finally {
      setIsCancelling(false)
    }
  }
  
  const handleReset = () => {
    setAppointment(null)
    setError(null)
    setCancelled(false)
    setReason("")
    setReferenceNumber("")
    setEmail("")
  }
  
  if (cancelled) {
    return (
      <div className="bg-gradient-to-b from-background to-muted/30 py-12 px-4 min-h-screen flex items-center justify-center">
        <Card className="w-full max-w-2xl shadow-xl">
          <CardHeader className="text-center border-b bg-gradient-to-r from-green-50 to-emerald-50">
            <div className="mx-auto mb-4 w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
              <CheckCircle className="w-10 h-10 text-green-600" />
            </div>
            <CardTitle className="text-3xl font-bold text-green-600">Appointment Cancelled</CardTitle>
            <CardDescription className="text-base mt-2">
              Your appointment has been successfully cancelled
            </CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-6 pt-6">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-800">
                A cancellation confirmation has been sent to your email address.
                If you need to reschedule, please visit our website to book a new appointment.
              </p>
            </div>
            
            <div className="flex gap-3">
              <Button variant="outline" onClick={handleReset} className="flex-1">
                Look Up Another
              </Button>
              <Link href="/" className="flex-1">
                <Button className="w-full">Return to Home</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }
  
  if (appointment) {
    return (
      <div className="bg-gradient-to-b from-background to-muted/30 py-12 px-4 min-h-screen flex items-center justify-center">
        <Card className="w-full max-w-2xl shadow-xl">
          <CardHeader className="border-b">
            <CardTitle className="text-2xl flex items-center gap-2">
              <AlertCircle className="h-6 w-6 text-amber-500" />
              Cancel Appointment
            </CardTitle>
            <CardDescription>
              Review your appointment details before cancelling
            </CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-6 pt-6">
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex gap-2">
                  <XCircle className="h-5 w-5 text-red-600 flex-shrink-0" />
                  <p className="text-sm text-red-800">{error}</p>
                </div>
              </div>
            )}
            
            {/* Appointment Details */}
            <div className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="text-sm text-blue-600 font-medium mb-1">Booking Reference</div>
                <div className="text-xl font-bold text-blue-900 font-mono">{appointment.referenceNumber}</div>
              </div>
              
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <div className="text-sm font-medium text-muted-foreground">Customer Name</div>
                  <div className="text-base">{appointment.customerName}</div>
                </div>
                <div>
                  <div className="text-sm font-medium text-muted-foreground">Email</div>
                  <div className="text-base">{appointment.customerEmail}</div>
                </div>
              </div>
              
              <div>
                <div className="text-sm font-medium text-muted-foreground mb-2">Scheduled Services</div>
                <div className="space-y-2">
                  {appointment.serviceBookings.map((booking, index) => (
                    <div key={index} className="flex items-start gap-2 p-3 bg-muted rounded-lg">
                      <Calendar className="h-4 w-4 text-muted-foreground mt-0.5" />
                      <div>
                        <div className="font-medium">{booking.serviceName}</div>
                        <div className="text-sm text-muted-foreground">
                          {new Date(booking.scheduledDate).toLocaleDateString('en-US', { 
                            weekday: 'long', 
                            year: 'numeric', 
                            month: 'long', 
                            day: 'numeric' 
                          })} at {booking.scheduledTime}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            
            {/* Optional Reason */}
            <div className="space-y-2">
              <Label htmlFor="reason">Reason for cancellation (optional)</Label>
              <Textarea
                id="reason"
                placeholder="Help us improve by letting us know why you're cancelling..."
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={3}
                className="resize-none"
              />
            </div>
            
            {/* Warning */}
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <div className="flex gap-2">
                <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0" />
                <div className="text-sm text-amber-800">
                  <p className="font-semibold mb-1">This action cannot be undone</p>
                  <p>Once cancelled, you will need to create a new appointment if you wish to reschedule.</p>
                </div>
              </div>
            </div>
            
            {/* Action Buttons */}
            <div className="flex gap-3 pt-4">
              <Button variant="outline" className="flex-1" onClick={handleReset}>
                Back to Lookup
              </Button>
              <Button 
                variant="destructive" 
                className="flex-1"
                onClick={handleCancel}
                disabled={isCancelling}
              >
                {isCancelling ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Cancelling...
                  </>
                ) : (
                  'Cancel Appointment'
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }
  
  return (
    <div className="bg-gradient-to-b from-background to-muted/30 py-12 px-4 min-h-screen flex items-center justify-center">
      <Card className="w-full max-w-xl shadow-xl">
        <CardHeader className="border-b">
          <CardTitle className="text-2xl">Manage Your Appointment</CardTitle>
          <CardDescription>
            Enter your reference number and email to view or cancel your appointment
          </CardDescription>
        </CardHeader>
        
        <CardContent className="pt-6">
          <form onSubmit={handleLookup} className="space-y-6">
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex gap-2">
                  <XCircle className="h-5 w-5 text-red-600 flex-shrink-0" />
                  <p className="text-sm text-red-800">{error}</p>
                </div>
              </div>
            )}
            
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="reference">Reference Number</Label>
                <Input
                  id="reference"
                  type="text"
                  placeholder="e.g., REQ-20260114-042"
                  value={referenceNumber}
                  onChange={(e) => setReferenceNumber(e.target.value)}
                  required
                  className="font-mono"
                />
                <p className="text-xs text-muted-foreground">
                  Found in your confirmation email
                </p>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="your.email@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
                <p className="text-xs text-muted-foreground">
                  The email you used when booking
                </p>
              </div>
            </div>
            
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex gap-2">
                <AlertCircle className="h-5 w-5 text-blue-600 flex-shrink-0" />
                <p className="text-sm text-blue-800">
                  Both your reference number and email must match exactly for security purposes.
                </p>
              </div>
            </div>
            
            <div className="flex gap-3">
              <Link href="/" className="flex-1">
                <Button type="button" variant="outline" className="w-full">
                  Back to Home
                </Button>
              </Link>
              <Button type="submit" className="flex-1" disabled={isLookingUp}>
                {isLookingUp ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Looking up...
                  </>
                ) : (
                  <>
                    <Search className="h-4 w-4 mr-2" />
                    Find Appointment
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
