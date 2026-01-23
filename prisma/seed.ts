import { PrismaClient } from '@prisma/client'
import { hash } from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('Seeding database...')

  // Create default admin user (email: admin@example.com, password: admin123)
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
  
  console.log('\n===========================================')
  console.log('Default Admin Login Credentials:')
  console.log('===========================================')
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






