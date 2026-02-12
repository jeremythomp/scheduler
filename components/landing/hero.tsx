"use client"

import { CalendarClock } from "lucide-react"
import { SchedulingForm } from "./scheduling-form"

export function Hero() {
  const scrollToAvailability = () => {
    const availabilitySection = document.getElementById('real-time-availability')
    if (availabilitySection) {
      availabilitySection.scrollIntoView({ 
        behavior: 'smooth',
        block: 'start'
      })
    }
  }

  return (
    <section className="relative py-12 md:py-20 lg:py-24 overflow-hidden">
      {/* Background decorative elements */}
      <div className="absolute top-0 right-0 -z-10 h-[600px] w-[600px] rounded-full bg-primary/5 blur-[120px]" />
      <div className="absolute bottom-0 left-0 -z-10 h-[400px] w-[400px] rounded-full bg-primary/5 blur-[100px]" />
      
      <div className="mx-auto max-w-7xl px-4 md:px-8">
        <div className="grid lg:grid-cols-12 gap-12 lg:gap-8 items-start">
          {/* Left Column: Content */}
          <div className="lg:col-span-6 flex flex-col justify-center pt-4">
            <h1 className="font-sans text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight text-foreground leading-[1.1] mb-6">
              Schedule Your{" "}
              <br />
              <span className="relative inline-block">
                <span className="relative z-10">Weighing,</span>
                <span className="absolute bottom-2 left-0 h-3 w-full bg-primary/60 -z-0" />
              </span>{" "}
              <span className="relative inline-block">
                <span className="relative z-10">Inspection</span>
                <span className="absolute bottom-2 left-0 h-3 w-full bg-primary/60 -z-0" />
              </span>{" "}
              and{" "}
              <span className="relative inline-block">
                <span className="relative z-10">Registration</span>
                <span className="absolute bottom-2 left-0 h-3 w-full bg-primary/60 -z-0" />
              </span>
            </h1>
            
            <p className="text-lg text-muted-foreground max-w-lg mb-10 leading-relaxed">
              Book official appointments for weighing, inspections, renewals and
              registration renewal online. Avoid the line by reserving your spot
              today.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 mb-12">
              <button 
                onClick={scrollToAvailability}
                className="flex items-center gap-3 rounded-2xl bg-card p-4 shadow-sm ring-1 ring-border hover:shadow-md hover:ring-primary/50 transition-all cursor-pointer group"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted text-foreground group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                  <CalendarClock className="h-5 w-5" />
                </div>
                <div className="flex flex-col">
                  <span className="text-sm font-bold">Real-time Slots</span>
                  <span className="text-xs text-muted-foreground">
                    View availability
                  </span>
                </div>
              </button>
            </div>
          </div>
          
          {/* Right Column: Scheduling Card */}
          <div className="lg:col-span-6 lg:pl-8">
            <SchedulingForm />
          </div>
        </div>
      </div>
    </section>
  )
}

