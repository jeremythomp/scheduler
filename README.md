# Vehicle Inspection Scheduler

A modern full-stack Next.js application for managing vehicle inspection appointment requests.

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- PostgreSQL 16+ (or use Docker)

### Local Development

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Configure environment** (`.env.local`):
   ```env
   DATABASE_URL="postgresql://scheduler_user:scheduler_pass@localhost:5432/scheduler"
   AUTH_SECRET="your-random-secret-here"
   SENDGRID_API_KEY="your-sendgrid-api-key"
   FROM_EMAIL="noreply@yourcompany.com"
   COMPANY_NAME="Your Company Name"
   ```

3. **Set up database:**
   ```bash
   npm run db:push
   npm run db:seed
   ```

4. **Start development server:**
   ```bash
   npm run dev
   ```

Visit http://localhost:3000

**Default Login:**
- Email: `admin@example.com`
- Password: `admin123`

### Docker Deployment

1. **Configure `.env` file:**
   ```env
   DB_PASSWORD=secure_password
   AUTH_SECRET=random_secret
   SENDGRID_API_KEY=your_key
   FROM_EMAIL=noreply@example.com
   COMPANY_NAME=Your Company
   ```

2. **Start containers:**
   ```bash
   docker-compose up -d
   ```

3. **Initialize database:**
   ```bash
   docker exec -it scheduler-app npx prisma db push
   docker exec -it scheduler-app npx prisma db seed
   ```

## 📁 Tech Stack

- **Framework:** Next.js 16 with App Router
- **Database:** PostgreSQL + Prisma ORM
- **Auth:** Auth.js (NextAuth v5)
- **UI:** shadcn/ui + Tailwind CSS v4
- **Forms:** React Hook Form + Zod
- **Email:** SendGrid
- **Deployment:** Docker

## 📚 Documentation

- [`MIGRATION_COMPLETE.md`](MIGRATION_COMPLETE.md) - Full migration details and architecture
- [`PROJECT.md`](PROJECT.md) - Original project requirements
- [`ARCHITECTURE.md`](ARCHITECTURE.md) - Original architecture documentation

## 🔧 Scripts

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server
npm run db:generate  # Generate Prisma Client
npm run db:push      # Push schema to database
npm run db:migrate   # Create migration
npm run db:seed      # Seed database
npm run db:studio    # Open Prisma Studio
```

## 🎯 Features

### Public
- Submit appointment requests
- Select multiple services
- Automatic email confirmations
- Reference number tracking

### Staff (Protected)
- Secure authentication
- View all requests
- Filter and search
- Approve/deny with notes
- Automatic email notifications

## 📝 License

Private project - All rights reserved

---

For detailed setup instructions, see [`MIGRATION_COMPLETE.md`](MIGRATION_COMPLETE.md)
