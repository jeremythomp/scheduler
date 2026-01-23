"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { ClipboardCheck, Scale, UserCheck, CheckCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useBookingStore } from "@/lib/stores/booking-store"

type ServiceType = "inspection" | "weighing" | "registration"

const serviceOptions: { value: ServiceType; label: string; icon: any }[] = [
  { value: "inspection", label: "Vehicle Inspection", icon: ClipboardCheck },
  { value: "weighing", label: "Vehicle Weighing", icon: Scale },
  { value: "registration", label: "Vehicle Registration", icon: UserCheck },
]

export function SchedulingForm() {
  const router = useRouter()
  const { setUserInfo, setSelectedServices: setSelectedServicesInStore } = useBookingStore()
  
  const [selectedServices, setSelectedServices] = useState<ServiceType[]>([])
  const [firstName, setFirstName] = useState("")
  const [lastName, setLastName] = useState("")
  const [email, setEmail] = useState("")
  const [referenceNumber, setReferenceNumber] = useState("")

  const toggleService = (service: ServiceType) => {
    setSelectedServices(prev =>
      prev.includes(service)
        ? prev.filter(s => s !== service)
        : [...prev, service]
    )
  }

  const handleNavigate = (e: React.FormEvent) => {
    e.preventDefault()
    // Save user info to store
    setUserInfo({
      firstName,
      lastName,
      email,
      referenceNumber,
    })
    // Save all selected services as array
    setSelectedServicesInStore(selectedServices)
    // Navigate to request page
    router.push("/request")
  }

  return (
    <Card className="relative overflow-hidden rounded-3xl shadow-xl ring-1 ring-border">
      <div className="absolute top-0 left-0 w-full h-2 bg-primary" />
      
      <CardContent className="p-6 md:p-8">
        <div className="mb-6">
          <h3 className="text-2xl font-bold text-foreground">Quick Schedule</h3>
          <p className="text-muted-foreground text-sm mt-1">
            Fill in details to see calendar availability
          </p>
          <p className="text-primary text-xs font-medium mt-2 bg-primary/10 p-2 rounded-lg">
            Payment (online or in-person) is required before booking an appointment
          </p>
        </div>
        
        <form onSubmit={handleNavigate} className="space-y-5">
          {/* Service Selection */}
          <div className="space-y-2">
            <Label className="block text-sm font-bold pl-1">
              Select Services *
            </Label>
            <div className="flex flex-col sm:flex-row sm:flex-wrap gap-2">
              {serviceOptions.map((service) => {
                const isSelected = selectedServices.includes(service.value)
                const Icon = service.icon
                
                return (
                  <Button
                    key={service.value}
                    type="button"
                    variant={isSelected ? "default" : "outline"}
                    onClick={() => toggleService(service.value)}
                    className={`w-full sm:w-auto sm:flex-1 rounded-2xl py-6 text-sm font-bold transition-all flex items-center justify-start gap-3 relative ${
                      isSelected ? "ring-2 ring-primary" : "hover:bg-muted"
                    }`}
                  >
                    <Icon className="h-5 w-5" />
                    <span>{service.label}</span>
                    {isSelected && (
                      <CheckCircle className="h-5 w-5 absolute right-4" />
                    )}
                  </Button>
                )
              })}
            </div>
            {selectedServices.length > 0 && (
              <p className="text-xs text-primary font-medium pl-1">
                {selectedServices.length} service{selectedServices.length > 1 ? 's' : ''} selected
              </p>
            )}
          </div>
          
          {/* Name Fields */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="space-y-1.5">
              <Label htmlFor="first-name" className="block text-sm font-bold pl-1">
                First Name
              </Label>
              <Input
                id="first-name"
                type="text"
                placeholder="John"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="rounded-2xl bg-muted border-0 py-6 px-4 ring-1 ring-inset ring-border placeholder:text-muted-foreground focus:ring-2 focus:ring-primary"
              />
            </div>
            
            <div className="space-y-1.5">
              <Label htmlFor="last-name" className="block text-sm font-bold pl-1">
                Last Name
              </Label>
              <Input
                id="last-name"
                type="text"
                placeholder="Doe"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="rounded-2xl bg-muted border-0 py-6 px-4 ring-1 ring-inset ring-border placeholder:text-muted-foreground focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>
          
          {/* Email */}
          <div className="space-y-1.5">
            <Label htmlFor="email" className="block text-sm font-bold pl-1">
              Email Address
            </Label>
            <Input
              id="email"
              type="email"
              placeholder="john.doe@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="rounded-2xl bg-muted border-0 py-6 px-4 ring-1 ring-inset ring-border placeholder:text-muted-foreground focus:ring-2 focus:ring-primary"
            />
          </div>
          
          {/* Reference Number */}
          <div className="space-y-1.5">
            <Label htmlFor="reference" className="block text-sm font-bold pl-1">
              Payment Reference Number *
            </Label>
            <Input
              id="reference"
              type="text"
              placeholder="Enter reference number"
              value={referenceNumber}
              onChange={(e) => setReferenceNumber(e.target.value)}
              className="rounded-2xl bg-muted border-0 py-6 px-4 ring-1 ring-inset ring-border placeholder:text-muted-foreground focus:ring-2 focus:ring-primary"
            />
            <p className="text-xs text-muted-foreground pl-1 pt-1">
              Found on your payment receipt
            </p>
          </div>
          
          <Button
            type="submit"
            disabled={selectedServices.length === 0}
            className="w-full rounded-full py-6 text-sm font-bold shadow-sm transition-colors mt-4"
          >
            Continue to Scheduling
          </Button>
          
          <p className="text-center text-xs text-muted-foreground">
            By continuing, you agree to our Terms of Service.
          </p>
        </form>
      </CardContent>
    </Card>
  )
}




