import { Queue } from 'bullmq'

// Email job data structure
export interface EmailJobData {
  type: 'confirmation' | 'approval' | 'denial' | 'cancellation' | 'welcome' | 'rescheduling' | 'staff-cancellation'
  to: string | string[]
  subject: string
  text: string
  html: string
  from?: string
}

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379'

// Create the email queue with Redis connection options
// BullMQ will create its own Redis connection internally
export const emailQueue = new Queue<EmailJobData>('email', {
  connection: {
    url: REDIS_URL,
    maxRetriesPerRequest: 3,
    enableReadyCheck: true,
    retryStrategy(times) {
      const delay = Math.min(times * 50, 2000)
      return delay
    },
  },
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 1000, // Start with 1 second, then 2s, 4s, 8s...
    },
    removeOnComplete: {
      age: 24 * 3600, // Keep completed jobs for 24 hours
      count: 1000, // Keep max 1000 completed jobs
    },
    removeOnFail: {
      age: 7 * 24 * 3600, // Keep failed jobs for 7 days
    },
  },
})

/**
 * Enqueues an email to be sent asynchronously
 * @param data - Email job data including type, recipient, subject, and content
 * @returns Promise that resolves when the job is enqueued (not when email is sent)
 */
export async function enqueueEmail(data: EmailJobData): Promise<void> {
  try {
    const job = await emailQueue.add('send-email', data, {
      priority: data.type === 'welcome' ? 1 : 10, // Welcome emails get higher priority
    })
    
    const recipients = Array.isArray(data.to) ? data.to.join(', ') : data.to
    console.log(`Email job enqueued: ${job.id} - Type: ${data.type}, To: ${recipients}`)
  } catch (error) {
    console.error('Failed to enqueue email:', error)
    throw error
  }
}

// Graceful shutdown handler
export async function closeEmailQueue(): Promise<void> {
  await emailQueue.close()
}
