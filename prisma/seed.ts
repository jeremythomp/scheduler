import { PrismaClient } from '@prisma/client'
import { hash } from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('Seeding database...')

  // Create default services
  const services = await Promise.all([
    prisma.service.upsert({
      where: { id: 1 },
      update: {},
      create: {
        name: 'Vehicle Inspection',
        description: 'Complete vehicle safety inspection',
        active: true
      }
    }),
    prisma.service.upsert({
      where: { id: 2 },
      update: {},
      create: {
        name: 'Vehicle Weighing',
        description: 'Commercial vehicle weighing service',
        active: true
      }
    }),
    prisma.service.upsert({
      where: { id: 3 },
      update: {},
      create: {
        name: 'Vehicle Registration',
        description: 'Vehicle registration processing',
        active: true
      }
    })
  ])

  console.log('Created services:', services)

  // Create default staff user (email: admin@example.com, password: admin123)
  const passwordHash = await hash('admin123', 10)
  
  const staffUser = await prisma.staffUser.upsert({
    where: { email: 'admin@example.com' },
    update: {},
    create: {
      email: 'admin@example.com',
      passwordHash,
      name: 'Admin User',
      role: 'admin'
    }
  })

  console.log('Created staff user:', { email: staffUser.email, name: staffUser.name })
  console.log('\nDefault login credentials:')
  console.log('Email: admin@example.com')
  console.log('Password: admin123')
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










