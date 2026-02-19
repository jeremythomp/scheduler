import { Queue } from 'bullmq'
import { redis } from './redis'

// Email job data structure
export interface EmailJobData {
  type: 'confirmation' | 'approval' | 'denial' | 'cancellation' | 'welcome' | 'rescheduling' | 'staff-cancellation'
  to: string | string[]
  subject: string
  text: string
  html: string
  from?: string
}

// BullMQ requires its own connection instance (it calls quit/disconnect on it),
// so we pass connection options rather than the shared client directly.
const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379'

export const emailQueue = new Queue<EmailJobData>('email', {
  connection: {
    url: REDIS_URL,
    maxRetriesPerRequest: 3,
    enableReadyCheck: true,
    retryStrategy(times) {
      return Math.min(times * 50, 2000)
    },
  },
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 1000,
    },
    removeOnComplete: {
      age: 24 * 3600,
      count: 1000,
    },
    removeOnFail: {
      age: 7 * 24 * 3600,
    },
  },
})

/**
 * Enqueues an email to be sent asynchronously.
 * Returns when the job is enqueued — not when the email is actually sent.
 */
export async function enqueueEmail(data: EmailJobData): Promise<void> {
  try {
    const job = await emailQueue.add('send-email', data, {
      priority: data.type === 'welcome' ? 1 : 10,
    })

    const recipients = Array.isArray(data.to) ? data.to.join(', ') : data.to
    console.log(`Email job enqueued: ${job.id} - Type: ${data.type}, To: ${recipients}`)
  } catch (error) {
    console.error('Failed to enqueue email:', error)
    throw error
  }
}

export async function closeEmailQueue(): Promise<void> {
  await emailQueue.close()
}

// Export the shared redis client for any other server-side usage
export { redis }
