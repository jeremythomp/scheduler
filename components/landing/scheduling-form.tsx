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

const SERVICE_ORDER: ServiceType[] = ["weighing", "inspection", "registration"]

const serviceOptions: { value: ServiceType; label: string; icon: any }[] = [
  { value: "weighing", label: "Vehicle Weighing", icon: Scale },
  { value: "inspection", label: "Vehicle Inspection", icon: ClipboardCheck },
  { value: "registration", label: "Vehicle Registration/Customer Service Center", icon: UserCheck },
]

export function SchedulingForm() {
  const router = useRouter()
  const { setUserInfo, setSelectedServices: setSelectedServicesInStore } = useBookingStore()
  
  const [selectedServices, setSelectedServices] = useState<ServiceType[]>([])
  const [firstName, setFirstName] = useState("")
  const [lastName, setLastName] = useState("")
  const [email, setEmail] = useState("")
  const [companyName, setCompanyName] = useState("")
  const [numberOfVehicles, setNumberOfVehicles] = useState<number>(1)
  const [idNumber, setIdNumber] = useState("")

  const toggleService = (service: ServiceType) => {
    setSelectedServices(prev => {
      if (prev.includes(service)) {
        return prev.filter(s => s !== service)
      }
      // Add service and sort by predefined order
      const newServices = [...prev, service]
      return newServices.sort((a, b) => SERVICE_ORDER.indexOf(a) - SERVICE_ORDER.indexOf(b))
    })
  }

  const handleNavigate = (e: React.FormEvent) => {
    e.preventDefault()
    // Save user info to store
    setUserInfo({
      firstName,
      lastName,
      email,
      companyName,
      numberOfVehicles,
      idNumber,
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
                    title={service.label}
                  >
                    <Icon className="h-5 w-5 flex-shrink-0" />
                    <span className="truncate pr-8">{service.label}</span>
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
            <p className="text-xs text-muted-foreground pl-1">
              You may use a family member or friend's email if you don't have your own
            </p>
          </div>
          
          {/* Company Name */}
          <div className="space-y-1.5">
            <Label htmlFor="company-name" className="block text-sm font-bold pl-1">
              Company Name <span className="text-muted-foreground font-normal">(Optional)</span>
            </Label>
            <Input
              id="company-name"
              type="text"
              placeholder="ABC Company Ltd"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              className="rounded-2xl bg-muted border-0 py-6 px-4 ring-1 ring-inset ring-border placeholder:text-muted-foreground focus:ring-2 focus:ring-primary"
            />
          </div>
          
          {/* Number of Vehicles and ID Number */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="space-y-1.5">
              <Label htmlFor="number-of-vehicles" className="block text-sm font-bold pl-1">
                Number of Vehicles
              </Label>
              <Input
                id="number-of-vehicles"
                type="number"
                min="1"
                placeholder="1"
                value={numberOfVehicles}
                onChange={(e) => setNumberOfVehicles(parseInt(e.target.value) || 1)}
                className="rounded-2xl bg-muted border-0 py-6 px-4 ring-1 ring-inset ring-border placeholder:text-muted-foreground focus:ring-2 focus:ring-primary"
              />
              <p className="text-xs text-muted-foreground pl-1">
                We can accommodate up to 84 vehicles per day at this time.
              </p>
            </div>
            
            <div className="space-y-1.5">
              <Label htmlFor="id-number" className="block text-sm font-bold pl-1">
                ID Number
              </Label>
              <Input
                id="id-number"
                type="text"
                placeholder="1234567890"
                maxLength={10}
                value={idNumber}
                onChange={(e) => setIdNumber(e.target.value.replace(/\D/g, ''))}
                className="rounded-2xl bg-muted border-0 py-6 px-4 ring-1 ring-inset ring-border placeholder:text-muted-foreground focus:ring-2 focus:ring-primary"
              />
              <p className="text-xs text-muted-foreground pl-1">
                National registration number, 10 digits (optional)
              </p>
            </div>
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




