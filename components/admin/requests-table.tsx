"use client"

import { useState, useTransition } from "react"
import { AppointmentRequest, StaffUser } from "@prisma/client"
import { Search, Filter, Check, X, ChevronLeft, ChevronRight, Car, BadgeCheck, Scale, ArrowRightLeft } from "lucide-react"
import { approveRequest, denyRequest } from "@/app/(staff)/actions"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

type RequestWithUser = AppointmentRequest & {
  approvedByUser: Pick<StaffUser, 'id' | 'name' | 'email'> | null
}

interface RequestsTableProps {
  initialRequests: RequestWithUser[]
}

const serviceIcons: Record<string, { icon: any; color: string }> = {
  "Vehicle Inspection": { icon: Car, color: "orange" },
  "Vehicle Registration": { icon: BadgeCheck, color: "blue" },
  "Vehicle Weighing": { icon: Scale, color: "gray" },
  "Vehicle Transfer": { icon: ArrowRightLeft, color: "teal" },
}

export function RequestsTable({ initialRequests }: RequestsTableProps) {
  const [requests, setRequests] = useState(initialRequests)
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState("confirmed")
  const [selectedRequest, setSelectedRequest] = useState<RequestWithUser | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [staffNotes, setStaffNotes] = useState("")
  const [isPending, startTransition] = useTransition()

  const filteredRequests = requests.filter((request) => {
    const matchesStatus = statusFilter === "all" || request.status === statusFilter
    const matchesSearch =
      !searchQuery ||
      request.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      request.customerPhone.includes(searchQuery) ||
      request.referenceNumber.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesStatus && matchesSearch
  })

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2)
  }

  const getServiceBadge = (service: string) => {
    const config = serviceIcons[service] || { icon: Car, color: "gray" }
    const Icon = config.icon

    const colorClasses: Record<string, string> = {
      orange: "bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-300 ring-orange-600/20",
      blue: "bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 ring-blue-600/20",
      gray: "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 ring-gray-600/20",
      teal: "bg-teal-50 dark:bg-teal-900/20 text-teal-700 dark:text-teal-300 ring-teal-600/20",
    }

    return (
      <span
        className={cn(
          "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset",
          colorClasses[config.color]
        )}
      >
        <Icon className="h-3 w-3" />
        {service.replace("Vehicle ", "")}
      </span>
    )
  }

  const getAvatarColor = (name: string) => {
    const colors = [
      "bg-blue-100 text-blue-600",
      "bg-purple-100 text-purple-600",
      "bg-yellow-100 text-yellow-700",
      "bg-pink-100 text-pink-600",
      "bg-green-100 text-green-600",
    ]
    const index = name.charCodeAt(0) % colors.length
    return colors[index]
  }

  const handleApprove = (request: RequestWithUser) => {
    startTransition(async () => {
      try {
        const updated = await approveRequest(request.id, staffNotes)
        setRequests((prev) => prev.map((r) => (r.id === request.id ? (updated as RequestWithUser) : r)))
        setDialogOpen(false)
        setSelectedRequest(null)
        setStaffNotes("")
        toast.success("Request approved successfully")
      } catch (error) {
        toast.error("Failed to approve request")
      }
    })
  }

  const handleReject = (request: RequestWithUser) => {
    startTransition(async () => {
      try {
        const updated = await denyRequest(request.id, staffNotes)
        setRequests((prev) => prev.map((r) => (r.id === request.id ? (updated as RequestWithUser) : r)))
        setDialogOpen(false)
        setSelectedRequest(null)
        setStaffNotes("")
        toast.success("Request rejected")
      } catch (error) {
        toast.error("Failed to reject request")
      }
    })
  }

  const openDialog = (request: RequestWithUser) => {
    setSelectedRequest(request)
    setStaffNotes(request.staffNotes || "")
    setDialogOpen(true)
  }

  return (
    <div className="lg:col-span-9 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Booking Requests</h1>
          <p className="text-muted-foreground text-sm">
            Manage incoming appointment requests for vehicle services.
          </p>
        </div>
        <div className="flex gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search applicant..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 w-full md:w-64"
            />
          </div>
          <Button variant="outline" size="icon">
            <Filter className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={statusFilter} onValueChange={setStatusFilter} className="w-full">
        <TabsList className="w-full justify-start border-b border-border rounded-none bg-transparent h-auto p-0">
          <TabsTrigger
            value="pending"
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none"
          >
            Pending Review
          </TabsTrigger>
          <TabsTrigger
            value="confirmed"
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none"
          >
            Confirmed
          </TabsTrigger>
          <TabsTrigger
            value="approved"
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none"
          >
            Approved
          </TabsTrigger>
          <TabsTrigger
            value="denied"
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none"
          >
            Rejected
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Table */}
      <div className="bg-card rounded-3xl shadow-sm ring-1 ring-border overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead className="py-4 pl-6 pr-3 text-xs font-bold uppercase tracking-wider">
                  Applicant
                </TableHead>
                <TableHead className="px-3 py-4 text-xs font-bold uppercase tracking-wider">
                  Service Type
                </TableHead>
                <TableHead className="px-3 py-4 text-xs font-bold uppercase tracking-wider">
                  Date & Time
                </TableHead>
                <TableHead className="relative py-4 pl-3 pr-6 text-right text-xs font-bold uppercase tracking-wider">
                  Actions
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="divide-y divide-border">
              {filteredRequests.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                    No requests found
                  </TableCell>
                </TableRow>
              ) : (
                filteredRequests.map((request) => (
                  <TableRow
                    key={request.id}
                    className="hover:bg-muted/50 transition-colors group cursor-pointer"
                    onClick={() => openDialog(request)}
                  >
                    <TableCell className="whitespace-nowrap py-4 pl-6 pr-3">
                      <div className="flex items-center">
                        <Avatar className="h-10 w-10 flex-shrink-0">
                          <AvatarFallback className={cn("font-bold text-sm", getAvatarColor(request.customerName))}>
                            {getInitials(request.customerName)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="ml-4">
                          <div className="font-bold text-foreground">{request.customerName}</div>
                          <div className="text-xs text-muted-foreground">ID: {request.referenceNumber}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="whitespace-nowrap px-3 py-4">
                      <div className="flex flex-wrap gap-1">
                        {request.servicesRequested.slice(0, 2).map((service, idx) => (
                          <div key={idx}>{getServiceBadge(service)}</div>
                        ))}
                        {request.servicesRequested.length > 2 && (
                          <Badge variant="secondary" className="text-xs">
                            +{request.servicesRequested.length - 2}
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="whitespace-nowrap px-3 py-4 text-sm">
                      {request.preferredDate ? (
                        <>
                          <div className="font-medium">
                            {new Date(request.preferredDate).toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            })}
                          </div>
                          <div className="text-xs text-muted-foreground">{request.preferredTime}</div>
                        </>
                      ) : (
                        <div className="text-xs text-muted-foreground">
                          {request.servicesRequested.length} service{request.servicesRequested.length !== 1 ? 's' : ''} scheduled
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="whitespace-nowrap py-4 pl-3 pr-6 text-right text-sm font-medium">
                      {request.status === "pending" && (
                        <div className="flex justify-end gap-2 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                          <Button
                            size="icon"
                            className="rounded-lg bg-green-50 hover:bg-green-100 text-green-600 ring-1 ring-green-600/20"
                            onClick={(e) => {
                              e.stopPropagation()
                              openDialog(request)
                            }}
                            title="Approve"
                          >
                            <Check className="h-4 w-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="rounded-lg bg-red-50 hover:bg-red-100 text-red-600 ring-1 ring-red-600/20"
                            onClick={(e) => {
                              e.stopPropagation()
                              openDialog(request)
                            }}
                            title="Reject"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                      {request.status !== "pending" && (
                        <Badge variant={
                          request.status === "approved" || request.status === "confirmed" ? "default" : "destructive"
                        }>
                          {request.status}
                        </Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination */}
        <div className="border-t border-border px-6 py-4 flex items-center justify-between">
          <span className="text-xs text-muted-foreground">
            Showing <strong>1-{Math.min(filteredRequests.length, 4)}</strong> of{" "}
            <strong>{filteredRequests.length}</strong> {statusFilter} requests
          </span>
          <div className="flex gap-2">
            <Button variant="ghost" size="icon" disabled>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" disabled={filteredRequests.length <= 4}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Detail Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Request Details</DialogTitle>
            <DialogDescription>Reference: {selectedRequest?.referenceNumber}</DialogDescription>
          </DialogHeader>

          {selectedRequest && (
            <div className="space-y-4">
              {/* Customer Info */}
              <div>
                <h4 className="font-semibold mb-2">Customer Information</h4>
                <div className="bg-muted p-3 rounded space-y-1 text-sm">
                  <div>
                    <span className="font-medium">Name:</span> {selectedRequest.customerName}
                  </div>
                  <div>
                    <span className="font-medium">Email:</span> {selectedRequest.customerEmail}
                  </div>
                  <div>
                    <span className="font-medium">Phone:</span> {selectedRequest.customerPhone}
                  </div>
                </div>
              </div>

              {/* Services & Schedule */}
              <div>
                <h4 className="font-semibold mb-2">Services & Schedule</h4>
                {selectedRequest.preferredDate ? (
                  <div className="bg-muted p-3 rounded space-y-1 text-sm">
                    <div>
                      <span className="font-medium">Services:</span> {selectedRequest.servicesRequested.join(", ")}
                    </div>
                    <div>
                      <span className="font-medium">Preferred Date:</span>{" "}
                      {new Date(selectedRequest.preferredDate).toLocaleDateString()}
                    </div>
                    <div>
                      <span className="font-medium">Preferred Time:</span> {selectedRequest.preferredTime}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {selectedRequest.servicesRequested.map((service, idx) => (
                      <div key={idx} className="bg-muted p-3 rounded text-sm flex items-center justify-between">
                        <div>
                          <div className="font-medium">{service}</div>
                          <div className="text-xs text-muted-foreground mt-1">
                            Individual time slot scheduled
                          </div>
                        </div>
                        {getServiceBadge(service)}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Additional Notes */}
              {selectedRequest.additionalNotes && (
                <div>
                  <h4 className="font-semibold mb-2">Customer Notes</h4>
                  <div className="bg-muted p-3 rounded text-sm">{selectedRequest.additionalNotes}</div>
                </div>
              )}

              {/* Staff Notes */}
              {selectedRequest.status === "pending" && (
                <div>
                  <h4 className="font-semibold mb-2">Staff Notes</h4>
                  <Textarea
                    value={staffNotes}
                    onChange={(e) => setStaffNotes(e.target.value)}
                    placeholder="Add notes for the customer..."
                    className="h-24"
                  />
                </div>
              )}

              {selectedRequest.status !== "pending" && selectedRequest.staffNotes && (
                <div>
                  <h4 className="font-semibold mb-2">Staff Notes</h4>
                  <div className="bg-muted p-3 rounded text-sm">{selectedRequest.staffNotes}</div>
                </div>
              )}

              {/* Actions */}
              {selectedRequest.status === "pending" && (
                <div className="flex gap-2 pt-4">
                  <Button onClick={() => handleApprove(selectedRequest)} disabled={isPending} className="flex-1">
                    {isPending ? "Processing..." : "Approve"}
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={() => handleReject(selectedRequest)}
                    disabled={isPending}
                    className="flex-1"
                  >
                    {isPending ? "Processing..." : "Reject"}
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}


