"use client"

import { useState, useTransition } from "react"
import { AppointmentRequest, StaffUser } from "@prisma/client"
import { approveRequest, denyRequest } from "@/app/(staff)/actions"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "sonner"

type RequestWithUser = AppointmentRequest & {
  approvedByUser: Pick<StaffUser, 'id' | 'name' | 'email'> | null
}

export function DashboardContent({ initialRequests }: { initialRequests: RequestWithUser[] }) {
  const [requests, setRequests] = useState(initialRequests)
  const [statusFilter, setStatusFilter] = useState("all")
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedRequest, setSelectedRequest] = useState<RequestWithUser | null>(null)
  const [staffNotes, setStaffNotes] = useState("")
  const [isPending, startTransition] = useTransition()

  const filteredRequests = requests.filter(request => {
    const matchesStatus = statusFilter === "all" || request.status === statusFilter
    const matchesSearch = !searchQuery || 
      request.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      request.customerPhone?.includes(searchQuery) ||
      request.referenceNumber.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesStatus && matchesSearch
  })

  function handleApprove(request: RequestWithUser) {
    startTransition(async () => {
      try {
        const updated = await approveRequest(request.id, staffNotes)
        setRequests(prev => prev.map(r => r.id === request.id ? updated as RequestWithUser : r))
        setSelectedRequest(null)
        setStaffNotes("")
        toast.success("Request approved successfully")
      } catch (error) {
        toast.error("Failed to approve request")
      }
    })
  }

  function handleDeny(request: RequestWithUser) {
    startTransition(async () => {
      try {
        const updated = await denyRequest(request.id, staffNotes)
        setRequests(prev => prev.map(r => r.id === request.id ? updated as RequestWithUser : r))
        setSelectedRequest(null)
        setStaffNotes("")
        toast.success("Request denied")
      } catch (error) {
        toast.error("Failed to deny request")
      }
    })
  }

  function getStatusBadge(status: string) {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      pending: "outline",
      approved: "default",
      denied: "destructive"
    }
    return <Badge variant={variants[status] || "secondary"}>{status.toUpperCase()}</Badge>
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Appointment Requests</CardTitle>
          <CardDescription>View and manage customer appointment requests</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <Input
                placeholder="Search by name, phone, or reference number..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Requests</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="denied">Denied</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Requests Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Reference</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Services</TableHead>
                  <TableHead>Preferred Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRequests.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-gray-500 py-8">
                      No requests found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredRequests.map(request => (
                    <TableRow key={request.id}>
                      <TableCell className="font-mono text-sm">{request.referenceNumber}</TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{request.customerName}</div>
                          <div className="text-sm text-gray-500">{request.customerPhone}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {request.servicesRequested.join(", ")}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {request.preferredDate ? new Date(request.preferredDate).toLocaleDateString('en-US', { timeZone: 'UTC' }) : 'N/A'}
                          <div className="text-gray-500">{request.preferredTime || 'N/A'}</div>
                        </div>
                      </TableCell>
                      <TableCell>{getStatusBadge(request.status)}</TableCell>
                      <TableCell>
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => {
                                setSelectedRequest(request)
                                setStaffNotes(request.staffNotes || "")
                              }}
                            >
                              View
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                            <DialogHeader>
                              <DialogTitle>Request Details</DialogTitle>
                              <DialogDescription>
                                Reference: {request.referenceNumber}
                              </DialogDescription>
                            </DialogHeader>
                            
                            {selectedRequest && selectedRequest.id === request.id && (
                              <div className="space-y-4">
                                {/* Customer Info */}
                                <div>
                                  <h4 className="font-semibold mb-2">Customer Information</h4>
                                  <div className="bg-gray-50 p-3 rounded space-y-1 text-sm">
                                    <div><span className="font-medium">Name:</span> {request.customerName}</div>
                                    <div><span className="font-medium">Email:</span> {request.customerEmail}</div>
                                    <div><span className="font-medium">Phone:</span> {request.customerPhone}</div>
                                  </div>
                                </div>

                                {/* Services & Schedule */}
                                <div>
                                  <h4 className="font-semibold mb-2">Services & Schedule</h4>
                                    <div className="bg-gray-50 p-3 rounded space-y-1 text-sm">
                                      <div><span className="font-medium">Services:</span> {request.servicesRequested.join(", ")}</div>
                                      <div><span className="font-medium">Preferred Date:</span> {request.preferredDate ? new Date(request.preferredDate).toLocaleDateString('en-US', { timeZone: 'UTC' }) : 'N/A'}</div>
                                      <div><span className="font-medium">Preferred Time:</span> {request.preferredTime || 'N/A'}</div>
                                    </div>
                                </div>

                                {/* Additional Notes */}
                                {request.additionalNotes && (
                                  <div>
                                    <h4 className="font-semibold mb-2">Customer Notes</h4>
                                    <div className="bg-gray-50 p-3 rounded text-sm">
                                      {request.additionalNotes}
                                    </div>
                                  </div>
                                )}

                                {/* Staff Notes */}
                                {request.status === "pending" && (
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

                                {request.status !== "pending" && request.staffNotes && (
                                  <div>
                                    <h4 className="font-semibold mb-2">Staff Notes</h4>
                                    <div className="bg-gray-50 p-3 rounded text-sm">
                                      {request.staffNotes}
                                    </div>
                                  </div>
                                )}

                                {/* Review Status */}
                                {request.status !== "pending" && (
                                  <div>
                                    <h4 className="font-semibold mb-2">Review Information</h4>
                                    <div className="bg-gray-50 p-3 rounded space-y-1 text-sm">
                                      <div><span className="font-medium">Status:</span> {getStatusBadge(request.status)}</div>
                                      {request.approvedByUser && (
                                        <div><span className="font-medium">Reviewed by:</span> {request.approvedByUser.name}</div>
                                      )}
                                      {request.reviewedAt && (
                                        <div><span className="font-medium">Reviewed at:</span> {new Date(request.reviewedAt).toLocaleString('en-US', { timeZone: 'UTC' })}</div>
                                      )}
                                    </div>
                                  </div>
                                )}

                                {/* Actions */}
                                {request.status === "pending" && (
                                  <div className="flex gap-2 pt-4">
                                    <Button
                                      onClick={() => handleApprove(request)}
                                      disabled={isPending}
                                      className="flex-1"
                                    >
                                      {isPending ? "Processing..." : "Approve"}
                                    </Button>
                                    <Button
                                      variant="destructive"
                                      onClick={() => handleDeny(request)}
                                      disabled={isPending}
                                      className="flex-1"
                                    >
                                      {isPending ? "Processing..." : "Deny"}
                                    </Button>
                                  </div>
                                )}
                              </div>
                            )}
                          </DialogContent>
                        </Dialog>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}










