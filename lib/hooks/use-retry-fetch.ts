import { useState, useCallback } from 'react'

export interface RetryFetchOptions {
  maxRetries?: number
  initialDelay?: number
  onError?: (error: Error, attempt: number) => void
}

export interface RetryFetchState<T> {
  data: T | null
  error: string | null
  isLoading: boolean
  retryCount: number
}

/**
 * Custom hook for fetching data with automatic retry on failure
 * Provides exponential backoff for connection errors
 */
export function useRetryFetch<T>(
  options: RetryFetchOptions = {}
) {
  const {
    maxRetries = 3,
    initialDelay = 1000,
    onError
  } = options

  const [state, setState] = useState<RetryFetchState<T>>({
    data: null,
    error: null,
    isLoading: false,
    retryCount: 0
  })

  const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

  const fetchWithRetry = useCallback(async (
    url: string,
    fetchOptions?: RequestInit
  ): Promise<void> => {
    setState(prev => ({ ...prev, isLoading: true, error: null, retryCount: 0 }))

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const response = await fetch(url, fetchOptions)
        const data = await response.json()

        if (!response.ok) {
          // If it's a 503 (service unavailable), retry
          if (response.status === 503 && attempt < maxRetries) {
            const delay = initialDelay * Math.pow(2, attempt)
            console.warn(`Service unavailable (attempt ${attempt + 1}/${maxRetries + 1}). Retrying in ${delay}ms...`)
            
            setState(prev => ({ ...prev, retryCount: attempt + 1 }))
            
            if (onError) {
              onError(new Error(data.error || 'Service unavailable'), attempt + 1)
            }
            
            await sleep(delay)
            continue
          }

          // For other errors, throw immediately
          throw new Error(data.error || `Request failed with status ${response.status}`)
        }

        // Success!
        setState({
          data,
          error: null,
          isLoading: false,
          retryCount: attempt
        })
        return
      } catch (error) {
        const isLastAttempt = attempt === maxRetries
        const errorMessage = error instanceof Error ? error.message : 'Network request failed'

        if (isLastAttempt) {
          console.error(`Failed after ${maxRetries + 1} attempts:`, error)
          setState({
            data: null,
            error: errorMessage,
            isLoading: false,
            retryCount: attempt
          })
          
          if (onError) {
            onError(error instanceof Error ? error : new Error(errorMessage), attempt + 1)
          }
          return
        }

        // Exponential backoff
        const delay = initialDelay * Math.pow(2, attempt)
        console.warn(`Request failed (attempt ${attempt + 1}/${maxRetries + 1}). Retrying in ${delay}ms...`)
        
        setState(prev => ({ ...prev, retryCount: attempt + 1 }))
        
        if (onError) {
          onError(error instanceof Error ? error : new Error(errorMessage), attempt + 1)
        }
        
        await sleep(delay)
      }
    }
  }, [maxRetries, initialDelay, onError])

  const reset = useCallback(() => {
    setState({
      data: null,
      error: null,
      isLoading: false,
      retryCount: 0
    })
  }, [])

  return {
    ...state,
    fetchWithRetry,
    reset
  }
}




