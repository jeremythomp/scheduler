import { Worker, Job } from 'bullmq'
import sgMail from '@sendgrid/mail'
import type { EmailJobData } from '../lib/server/email-queue'

// Initialize SendGrid
if (process.env.SENDGRID_API_KEY) {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY)
} else {
  console.error('SENDGRID_API_KEY is not set - worker cannot send emails')
  process.exit(1)
}

const FROM_EMAIL = process.env.FROM_EMAIL || 'noreply@bla.gov.bb'
const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379'

/**
 * Process email jobs by sending them via SendGrid
 */
async function processEmailJob(job: Job<EmailJobData>): Promise<void> {
  const { to, subject, text, html, from, type } = job.data
  
  const msg = {
    to,
    from: from || FROM_EMAIL,
    subject,
    text,
    html,
  }

  try {
    await sgMail.send(msg)
    
    const recipients = Array.isArray(to) ? to.join(', ') : to
    console.log(`✓ Email sent successfully - Job: ${job.id}, Type: ${type}, To: ${recipients}, Subject: ${subject}`)
  } catch (error: any) {
    console.error(`✗ Failed to send email - Job: ${job.id}, Type: ${type}`, error)
    
    // Log SendGrid-specific errors
    if (error.response) {
      console.error('SendGrid error details:', {
        statusCode: error.code,
        body: error.response?.body,
      })
    }
    
    throw error // Re-throw to trigger BullMQ retry logic
  }
}

// Create the worker with Redis connection options
const worker = new Worker<EmailJobData>('email', processEmailJob, {
  connection: {
    url: REDIS_URL,
    maxRetriesPerRequest: 3,
    enableReadyCheck: true,
    retryStrategy(times) {
      const delay = Math.min(times * 50, 2000)
      return delay
    },
  },
  concurrency: 5, // Process up to 5 emails concurrently
  limiter: {
    max: 100, // Max 100 emails
    duration: 1000, // Per second (respects SendGrid rate limits)
  },
})

// Worker event handlers
worker.on('completed', (job) => {
  console.log(`Job ${job.id} completed successfully`)
})

worker.on('failed', (job, err) => {
  console.error(`Job ${job?.id} failed after ${job?.attemptsMade} attempts:`, err.message)
})

worker.on('error', (err) => {
  console.error('Worker error:', err)
})

worker.on('ready', () => {
  console.log('Email worker is ready and listening for jobs')
})

// Graceful shutdown
const gracefulShutdown = async (signal: string) => {
  console.log(`\n${signal} received, shutting down gracefully...`)
  
  await worker.close()
  
  console.log('Worker shutdown complete')
  process.exit(0)
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'))
process.on('SIGINT', () => gracefulShutdown('SIGINT'))

console.log('Email worker started successfully')
console.log(`- Concurrency: 5`)
console.log(`- Rate limit: 100 emails/second`)
console.log(`- SendGrid API Key: ${process.env.SENDGRID_API_KEY ? 'configured' : 'MISSING'}`)
console.log(`- From Email: ${FROM_EMAIL}`)
