import { Prisma } from '@prisma/client'
import { prisma } from './prisma'

export interface DBResult<T> {
  success: boolean
  data?: T
  error?: string
  errorType?: 'connection' | 'validation' | 'unknown'
}

/**
 * Check if an error is a database connection error
 */
function isDatabaseConnectionError(error: unknown): boolean {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    // P1001: Can't reach database server
    // P1002: Database server timeout
    // P1008: Operations timed out
    // P1017: Server has closed the connection
    return ['P1001', 'P1002', 'P1008', 'P1017'].includes(error.code)
  }
  
  if (error instanceof Prisma.PrismaClientInitializationError) {
    return true
  }
  
  if (error instanceof Prisma.PrismaClientRustPanicError) {
    return true
  }
  
  // Check for common connection error messages
  if (error instanceof Error) {
    const message = error.message.toLowerCase()
    return message.includes('connection') ||
           message.includes('econnrefused') ||
           message.includes('timeout') ||
           message.includes('enetunreach')
  }
  
  return false
}

/**
 * Sleep for a given number of milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * Execute a database operation with exponential backoff retry
 * @param operation - The database operation to execute
 * @param maxRetries - Maximum number of retry attempts (default: 3)
 * @param initialDelay - Initial delay in ms before first retry (default: 500ms)
 */
export async function withRetry<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  initialDelay: number = 500
): Promise<DBResult<T>> {
  let lastError: unknown
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const data = await operation()
      return { success: true, data }
    } catch (error) {
      lastError = error
      
      // If it's not a connection error, don't retry
      if (!isDatabaseConnectionError(error)) {
        console.error('Database operation failed (non-connection error):', error)
        
        if (error instanceof Prisma.PrismaClientValidationError) {
          return {
            success: false,
            error: 'Invalid data provided',
            errorType: 'validation'
          }
        }
        
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Database operation failed',
          errorType: 'unknown'
        }
      }
      
      // If we've exhausted retries, return error
      if (attempt === maxRetries) {
        console.error(`Database connection failed after ${maxRetries} retries:`, error)
        return {
          success: false,
          error: 'Database temporarily unavailable. Please try again in a moment.',
          errorType: 'connection'
        }
      }
      
      // Calculate exponential backoff delay
      const delay = initialDelay * Math.pow(2, attempt)
      console.warn(`Database connection attempt ${attempt + 1} failed. Retrying in ${delay}ms...`)
      await sleep(delay)
    }
  }
  
  // This should never be reached, but TypeScript needs it
  return {
    success: false,
    error: 'Database temporarily unavailable. Please try again in a moment.',
    errorType: 'connection'
  }
}

/**
 * Check if the database is available
 */
export async function checkDatabaseHealth(): Promise<boolean> {
  try {
    await prisma.$queryRaw`SELECT 1`
    return true
  } catch (error) {
    console.error('Database health check failed:', error)
    return false
  }
}

/**
 * Disconnect from the database (useful for cleanup in tests)
 */
export async function disconnectDatabase(): Promise<void> {
  await prisma.$disconnect()
}




