// Type definitions for the application
export interface ServiceBooking {
  id: number;
  serviceName: string;
  scheduledDate: string;
  scheduledTime: string;
  createdAt: string;
  updatedAt: string;
}

export interface AppointmentRequest {
  id: number;
  referenceNumber: string;
  status: 'pending' | 'approved' | 'denied' | 'confirmed';
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  vehicleType: string;
  vehicleMake: string;
  vehicleModel: string;
  licensePlate: string;
  vin?: string;
  servicesRequested: string[];
  preferredDate?: string;
  preferredTime?: string;
  serviceBookings?: ServiceBooking[];
  additionalNotes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface StaffUser {
  id: number;
  email: string;
  name: string;
  role: string;
}

export interface Service {
  id: number;
  name: string;
  description: string;
}

