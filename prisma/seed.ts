import { PrismaClient } from '@prisma/client'
import { hash } from 'bcryptjs'
import crypto from 'crypto'

const prisma = new PrismaClient()

// Helper functions
function generateReferenceNumber(): string {
  const date = new Date().toISOString().split('T')[0].replace(/-/g, '')
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0')
  return `REQ-${date}-${random}`
}

function generateCancellationToken(): string {
  return crypto.randomBytes(32).toString('hex')
}

// Service configuration
const SERVICES = [
  "Vehicle Weighing",
  "Vehicle Inspection",
  "Vehicle Registration/Customer Service Center"
]

const TIME_SLOTS = ["08:30 AM", "09:30 AM", "10:30 AM", "11:30 AM", "12:30 PM", "01:30 PM", "02:30 PM"]

// Sample data
const FIRST_NAMES = [
  "John", "Jane", "Michael", "Sarah", "David", "Emily", "Robert", "Jessica",
  "William", "Ashley", "James", "Amanda", "Christopher", "Melissa", "Daniel",
  "Michelle", "Matthew", "Kimberly", "Anthony", "Amy", "Mark", "Angela",
  "Donald", "Lisa", "Steven", "Nancy", "Paul", "Karen", "Andrew", "Betty"
]

const LAST_NAMES = [
  "Smith", "Johnson", "Williams", "Brown", "Jones", "Garcia", "Miller", "Davis",
  "Rodriguez", "Martinez", "Hernandez", "Lopez", "Wilson", "Anderson", "Thomas",
  "Taylor", "Moore", "Jackson", "Martin", "Lee", "Thompson", "White", "Harris",
  "Sanchez", "Clark", "Ramirez", "Lewis", "Robinson", "Walker", "Young"
]

const COMPANY_SUFFIXES = [
  "Transport", "Logistics", "Freight", "Trucking", "Haulage", "Shipping",
  "Services", "Enterprises", "Group", "Corporation", "Limited", "Inc"
]

const COMPANY_TYPES = [
  "Transport", "Logistics", "Freight", "Trucking", "Haulage", "Shipping",
  "Services", "Enterprises", "Group", "Corporation", "Limited", "Inc"
]

// Generate random customer data
function generateCustomer(isCompany: boolean, vehicleCount: number) {
  const firstName = FIRST_NAMES[Math.floor(Math.random() * FIRST_NAMES.length)]
  const lastName = LAST_NAMES[Math.floor(Math.random() * LAST_NAMES.length)]
  const companyName = isCompany 
    ? `${lastName} ${COMPANY_SUFFIXES[Math.floor(Math.random() * COMPANY_SUFFIXES.length)]}`
    : null
  
  const email = isCompany
    ? `${firstName.toLowerCase()}.${lastName.toLowerCase()}@${companyName?.toLowerCase().replace(/\s+/g, '')}.com`
    : `${firstName.toLowerCase()}.${lastName.toLowerCase()}@email.com`
  
  const phone = `+1${Math.floor(Math.random() * 9000000000) + 1000000000}`
  
  return {
    customerName: `${firstName} ${lastName}`,
    customerEmail: email,
    customerPhone: phone,
    companyName,
    numberOfVehicles: vehicleCount,
    idNumber: `ID${Math.floor(Math.random() * 900000) + 100000}`
  }
}

// Helper to skip weekends
function skipWeekends(date: Date): Date {
  const result = new Date(date)
  while (result.getDay() === 0 || result.getDay() === 6) {
    result.setDate(result.getDate() + 1)
  }
  return result
}

// Generate a random date in the next 30 days (excluding weekends for more realistic distribution)
function getRandomUpcomingDate(startDays: number = 1, endDays: number = 30): Date {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  
  const daysToAdd = Math.floor(Math.random() * (endDays - startDays + 1)) + startDays
  const date = new Date(today)
  date.setDate(date.getDate() + daysToAdd)
  
  return skipWeekends(date)
}

// Generate service bookings respecting service order
function generateServiceBookings(
  servicesRequested: string[],
  vehicleCount: number,
  baseDate: Date
): Array<{serviceName: string, scheduledDate: Date, scheduledTime: string, vehicleCount: number}> {
  const bookings: Array<{serviceName: string, scheduledDate: Date, scheduledTime: string, vehicleCount: number}> = []
  
  // Service order: Weighing → Inspection → Registration
  const serviceOrder = [
    "Vehicle Weighing",
    "Vehicle Inspection",
    "Vehicle Registration/Customer Service Center"
  ]
  
  const orderedServices = serviceOrder.filter(s => servicesRequested.includes(s))
  
  let currentDate = new Date(baseDate)
  let timeSlotIndex = 0
  
  for (const service of orderedServices) {
    // Sometimes spread across multiple days for large vehicle counts
    const daysOffset = Math.floor(Math.random() * 2) // 0 or 1 day offset
    const bookingDate = new Date(currentDate)
    bookingDate.setDate(bookingDate.getDate() + daysOffset)
    let finalDate = skipWeekends(bookingDate)
    
    // Ensure we don't go past available time slots
    if (timeSlotIndex >= TIME_SLOTS.length) {
      timeSlotIndex = 0
      finalDate.setDate(finalDate.getDate() + 1)
      finalDate = skipWeekends(finalDate)
    }
    
    bookings.push({
      serviceName: service,
      scheduledDate: finalDate,
      scheduledTime: TIME_SLOTS[timeSlotIndex],
      vehicleCount: vehicleCount
    })
    
    // Next service should be at a later time slot or later date
    timeSlotIndex += Math.floor(Math.random() * 2) + 1 // Skip 1-2 slots
    if (timeSlotIndex >= TIME_SLOTS.length) {
      timeSlotIndex = 0
      currentDate = new Date(finalDate)
      currentDate.setDate(currentDate.getDate() + 1)
      currentDate = skipWeekends(currentDate)
    } else {
      currentDate = new Date(finalDate)
    }
  }
  
  return bookings
}

async function main() {
  console.log('Seeding database...')

  // Create default admin user
  const passwordHash = await hash('admin123', 10)
  
  const adminUser = await prisma.staffUser.upsert({
    where: { email: 'admin@example.com' },
    update: {},
    create: {
      email: 'admin@example.com',
      passwordHash,
      name: 'Admin User',
      role: 'admin',
      mustChangePassword: false
    }
  })

  console.log('Created admin user:', { 
    email: adminUser.email, 
    name: adminUser.name, 
    role: adminUser.role 
  })

  // Clear existing appointments (optional - comment out if you want to keep existing data)
  console.log('\nClearing existing appointments...')
  await prisma.serviceBooking.deleteMany({})
  await prisma.appointmentRequest.deleteMany({})
  console.log('Cleared existing appointments')

  // Generate appointments
  console.log('\nGenerating appointments...')
  
  const appointmentsToCreate = []
  
  // Individual customers (1 vehicle) - 40% of appointments
  for (let i = 0; i < 25; i++) {
    const vehicleCount = 1
    const isCompany = false
    
    // Vary services - some only need weighing, others need all services
    const serviceOptions = [
      ["Vehicle Weighing"],
      ["Vehicle Weighing", "Vehicle Inspection"],
      ["Vehicle Weighing", "Vehicle Inspection", "Vehicle Registration/Customer Service Center"]
    ]
    const servicesRequested = serviceOptions[Math.floor(Math.random() * serviceOptions.length)]
    
    const customer = generateCustomer(isCompany, vehicleCount)
    const baseDate = getRandomUpcomingDate(1, 30)
    const serviceBookings = generateServiceBookings(servicesRequested, vehicleCount, baseDate)
    
    appointmentsToCreate.push({
      customer,
      servicesRequested,
      serviceBookings,
      additionalNotes: Math.random() > 0.7 ? "Please call upon arrival" : null
    })
  }
  
  // Small companies (2-5 vehicles) - 30% of appointments
  for (let i = 0; i < 18; i++) {
    const vehicleCount = Math.floor(Math.random() * 4) + 2 // 2-5 vehicles
    const isCompany = true
    
    const servicesRequested = [
      "Vehicle Weighing",
      "Vehicle Inspection",
      "Vehicle Registration/Customer Service Center"
    ]
    
    const customer = generateCustomer(isCompany, vehicleCount)
    const baseDate = getRandomUpcomingDate(1, 30)
    const serviceBookings = generateServiceBookings(servicesRequested, vehicleCount, baseDate)
    
    appointmentsToCreate.push({
      customer,
      servicesRequested,
      serviceBookings,
      additionalNotes: Math.random() > 0.6 ? `Fleet of ${vehicleCount} vehicles` : null
    })
  }
  
  // Medium companies (6-15 vehicles) - 20% of appointments
  for (let i = 0; i < 12; i++) {
    const vehicleCount = Math.floor(Math.random() * 10) + 6 // 6-15 vehicles
    const isCompany = true
    
    const servicesRequested = [
      "Vehicle Weighing",
      "Vehicle Inspection",
      "Vehicle Registration/Customer Service Center"
    ]
    
    const customer = generateCustomer(isCompany, vehicleCount)
    const baseDate = getRandomUpcomingDate(1, 30)
    const serviceBookings = generateServiceBookings(servicesRequested, vehicleCount, baseDate)
    
    appointmentsToCreate.push({
      customer,
      servicesRequested,
      serviceBookings,
      additionalNotes: `Large fleet booking - ${vehicleCount} vehicles`
    })
  }
  
  // Large companies (16-30 vehicles) - 10% of appointments
  for (let i = 0; i < 6; i++) {
    const vehicleCount = Math.floor(Math.random() * 15) + 16 // 16-30 vehicles
    const isCompany = true
    
    const servicesRequested = [
      "Vehicle Weighing",
      "Vehicle Inspection",
      "Vehicle Registration/Customer Service Center"
    ]
    
    const customer = generateCustomer(isCompany, vehicleCount)
    const baseDate = getRandomUpcomingDate(1, 30)
    const serviceBookings = generateServiceBookings(servicesRequested, vehicleCount, baseDate)
    
    appointmentsToCreate.push({
      customer,
      servicesRequested,
      serviceBookings,
      additionalNotes: `Major fleet operation - ${vehicleCount} vehicles. May require multiple days.`
    })
  }
  
  // Create appointments in batches to respect capacity constraints
  console.log(`Creating ${appointmentsToCreate.length} appointments...`)
  
  let createdCount = 0
  let skippedCount = 0
  
  for (const appointmentData of appointmentsToCreate) {
    try {
      // Check capacity before creating
      let hasCapacity = true
      for (const booking of appointmentData.serviceBookings) {
        const existingBookings = await prisma.serviceBooking.findMany({
          where: {
            serviceName: booking.serviceName,
            scheduledDate: booking.scheduledDate,
            scheduledTime: booking.scheduledTime,
            appointmentRequest: {
              status: "confirmed"
            }
          },
          select: {
            vehicleCount: true
          }
        })
        
        const currentCount = existingBookings.reduce((sum, b) => sum + (b.vehicleCount || 1), 0)
        const maxCapacity = booking.serviceName === "Vehicle Registration/Customer Service Center" ? 5 : 12
        const availableCapacity = maxCapacity - currentCount
        
        if (booking.vehicleCount > availableCapacity) {
          hasCapacity = false
          break
        }
      }
      
      if (!hasCapacity) {
        skippedCount++
        continue
      }
      
      // Create appointment
      const referenceNumber = generateReferenceNumber()
      const cancellationToken = generateCancellationToken()
      
      const appointment = await prisma.appointmentRequest.create({
        data: {
          ...appointmentData.customer,
          servicesRequested: appointmentData.servicesRequested,
          additionalNotes: appointmentData.additionalNotes,
          referenceNumber,
          cancellationToken,
          status: "confirmed",
          serviceBookings: {
            create: appointmentData.serviceBookings.map(booking => ({
              serviceName: booking.serviceName,
              scheduledDate: booking.scheduledDate,
              scheduledTime: booking.scheduledTime,
              vehicleCount: booking.vehicleCount
            }))
          }
        }
      })
      
      createdCount++
      if (createdCount % 10 === 0) {
        console.log(`  Created ${createdCount} appointments...`)
      }
    } catch (error) {
      console.error(`Error creating appointment:`, error)
      skippedCount++
    }
  }
  
  console.log(`\n✅ Created ${createdCount} appointments`)
  if (skippedCount > 0) {
    console.log(`⚠️  Skipped ${skippedCount} appointments due to capacity constraints`)
  }
  
  // Print summary
  const totalAppointments = await prisma.appointmentRequest.count()
  const totalBookings = await prisma.serviceBooking.count()
  const individualCount = await prisma.appointmentRequest.count({
    where: { companyName: null }
  })
  const companyCount = await prisma.appointmentRequest.count({
    where: { companyName: { not: null } }
  })
  
  console.log('\n===========================================')
  console.log('Seeding Summary:')
  console.log('===========================================')
  console.log(`Total Appointments: ${totalAppointments}`)
  console.log(`  - Individual customers: ${individualCount}`)
  console.log(`  - Companies: ${companyCount}`)
  console.log(`Total Service Bookings: ${totalBookings}`)
  console.log('\nDefault Admin Login Credentials:')
  console.log('Email:    admin@example.com')
  console.log('Password: admin123')
  console.log('===========================================')
  console.log('\nSeeding completed successfully!')
}

main()
  .catch((e) => {
    console.error('Error seeding database:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })






