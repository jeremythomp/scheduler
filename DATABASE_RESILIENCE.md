# Database Resilience Implementation

## Overview

This document describes the database resilience features implemented to handle database connection failures gracefully and prevent application crashes when the database is temporarily unavailable.

## Features Implemented

### 1. Database Utility Wrapper with Retry Logic (`lib/server/db-utils.ts`)

A comprehensive utility that wraps Prisma operations with:

- **Exponential Backoff Retry**: Automatically retries failed database operations up to 3 times with increasing delays (500ms, 1000ms, 2000ms)
- **Error Classification**: Distinguishes between connection errors, validation errors, and other errors
- **Health Check**: Function to verify database connectivity
- **Typed Results**: Returns structured results with success status, data, and error information

**Key Functions:**
- `withRetry<T>(operation, maxRetries?, initialDelay?)` - Wraps any Prisma operation with retry logic
- `checkDatabaseHealth()` - Verifies database is accessible
- `disconnectDatabase()` - Gracefully disconnects (useful for cleanup)

**Error Types Detected:**
- `P1001` - Can't reach database server
- `P1002` - Database server timeout
- `P1008` - Operations timed out
- `P1017` - Server has closed the connection
- Connection-related error messages (ECONNREFUSED, timeout, etc.)

### 2. Next.js Error Boundaries

**Root Error Boundary (`app/error.tsx`):**
- Catches errors across the entire application
- Displays user-friendly error UI with retry button
- Provides option to return to home page
- Logs errors for monitoring

**Staff Section Error Boundary (`app/(staff)/error.tsx`):**
- Specialized error handling for staff dashboard
- Detects database connection errors specifically
- Provides contextual help and retry suggestions
- Maintains professional UI for staff users

### 3. Server Actions Error Handling (`app/(staff)/actions.ts`)

All server actions now use the retry wrapper:

- `getRequests()` - Fetch appointment requests with retry
- `getRequestById()` - Fetch single request with retry
- `approveRequest()` - Approve request with retry
- `denyRequest()` - Deny request with retry

Each action:
- Wraps Prisma calls with `withRetry()`
- Returns meaningful error messages on failure
- Throws errors that are caught by error boundaries

### 4. Authentication Error Handling (`auth.ts`)

NextAuth credential provider now uses retry logic:
- Database lookups for user authentication are wrapped with retry
- Failed connections are logged but don't crash the login page
- Returns null on failure (standard NextAuth behavior)

### 5. API Routes with 503 Status Codes

All API routes enhanced with proper error handling:

**`/api/services`** - Service listing
- Returns 503 for connection errors
- Returns 500 for other errors
- Includes error type in response

**`/api/requests`** - Appointment creation
- Retries database operations
- Returns 503 for connection errors
- Distinguishes between validation errors (400) and server errors

**`/api/availability`** - Availability checking
- Retries availability queries
- Returns 503 for connection errors
- Gracefully handles missing data

All API routes now return structured error responses:
```json
{
  "success": false,
  "error": "Database temporarily unavailable. Please try again in a moment.",
  "errorType": "connection"
}
```

### 6. Client-Side Retry Hook (`lib/hooks/use-retry-fetch.ts`)

Reusable React hook for client-side API calls with retry:

```typescript
const { data, error, isLoading, retryCount, fetchWithRetry, reset } = useRetryFetch<T>({
  maxRetries: 3,
  initialDelay: 1000,
  onError: (error, attempt) => {
    console.log(`Attempt ${attempt} failed:`, error)
  }
})
```

**Features:**
- Exponential backoff for retries
- Automatic 503 detection and retry
- Retry count tracking
- Error callbacks
- Manual reset capability

### 7. Request Page Enhanced (`app/(public)/request/page.tsx`)

The booking request page now:
- Automatically retries availability fetching
- Shows loading states during retries
- Displays toast notifications for connection errors
- Degrades gracefully if availability can't be loaded

## Error Flow

```
User Action
    ↓
Server/API Call
    ↓
Prisma Operation (wrapped with withRetry)
    ↓
Connection Error?
    ↓ Yes
  Retry 1 (500ms delay)
    ↓ Still failing?
  Retry 2 (1000ms delay)
    ↓ Still failing?
  Retry 3 (2000ms delay)
    ↓ Still failing?
Return Error
    ↓
API: Return 503 Status
Server Action: Throw Error
    ↓
Error Boundary Catches
    ↓
Display User-Friendly Error UI
with Retry Button
```

## User Experience

### When Database is Unavailable:

1. **Initial Request**: System automatically retries 3 times with increasing delays
2. **If Still Failing**: User sees friendly error message (not a crash)
3. **Retry Option**: User can click "Try Again" to reload
4. **Helpful Context**: Error messages explain the issue and suggest actions

### What Users See:

- **Public Pages**: Error boundary with retry button and home link
- **Staff Dashboard**: Specialized error with troubleshooting tips
- **Booking Form**: Toast notifications for availability fetch failures
- **API Errors**: Proper HTTP status codes (503 vs 500)

## Configuration

### Retry Settings

Default values (can be adjusted):
- **Max Retries**: 3 attempts
- **Initial Delay**: 500ms (server) / 1000ms (client)
- **Backoff**: Exponential (2x each retry)

### Modifying Retry Behavior

To change retry settings, update the calls to `withRetry()`:

```typescript
// Custom retry settings
const result = await withRetry(
  async () => prisma.model.operation(),
  5,    // maxRetries
  1000  // initialDelay in ms
)
```

## Testing Database Failures

To test the resilience features:

1. **Stop the database**:
   ```bash
   docker-compose stop db
   ```

2. **Try using the application**:
   - Visit the staff dashboard
   - Try to book an appointment
   - Attempt to login

3. **Observe behavior**:
   - Should see retry attempts in console
   - Should see user-friendly error messages
   - Should NOT see application crash
   - Retry button should work

4. **Restart database**:
   ```bash
   docker-compose start db
   ```

5. **Click retry**: Application should recover automatically

## Monitoring and Logging

All database errors are logged to console with context:
- Error type (connection, validation, unknown)
- Retry attempts
- Operation that failed
- Full error details

In production, these logs can be sent to your error tracking service (Sentry, LogRocket, etc.) by modifying the `console.error()` calls in:
- `lib/server/db-utils.ts`
- Error boundary components
- API routes

## Benefits

✅ **No More Crashes**: Database unavailability doesn't crash the app
✅ **Automatic Recovery**: System retries failed operations automatically
✅ **User-Friendly**: Clear error messages and recovery options
✅ **Production-Ready**: Proper HTTP status codes and error handling
✅ **Flexible**: Easy to adjust retry settings per operation
✅ **Comprehensive**: Covers all database interaction points

## Future Enhancements

Potential improvements to consider:
- Circuit breaker pattern to prevent overwhelming a failing database
- Health check endpoint for monitoring
- Graceful degradation with cached data
- Database connection pooling optimization
- Metrics collection for retry success rates




