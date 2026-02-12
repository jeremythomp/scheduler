"use client"

import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"

interface ServiceFilterProps {
  value: string
  onValueChange: (value: string) => void
}

export function ServiceFilter({ value, onValueChange }: ServiceFilterProps) {
  return (
    <Tabs value={value} onValueChange={onValueChange} className="w-full">
      <TabsList className="grid w-full grid-cols-4">
        <TabsTrigger value="all">All Services</TabsTrigger>
        <TabsTrigger value="Vehicle Weighing">Weighing</TabsTrigger>
        <TabsTrigger value="Vehicle Inspection">Inspection</TabsTrigger>
        <TabsTrigger value="Vehicle Registration/Customer Service Center">Registration</TabsTrigger>
      </TabsList>
    </Tabs>
  )
}
