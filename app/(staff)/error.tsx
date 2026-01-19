"use client"

import { useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { AlertCircle, RefreshCw, Home } from "lucide-react"

export default function StaffError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error('Staff dashboard error:', error)
  }, [error])

  const isConnectionError = error.message?.toLowerCase().includes('database') ||
                           error.message?.toLowerCase().includes('connection') ||
                           error.message?.toLowerCase().includes('unavailable')

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <Card className="w-full max-w-lg border-2 border-red-200">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-red-100 p-2">
              <AlertCircle className="h-6 w-6 text-red-600" />
            </div>
            <div>
              <CardTitle className="text-red-900">
                {isConnectionError ? 'Service Temporarily Unavailable' : 'Dashboard Error'}
              </CardTitle>
              <CardDescription>
                {isConnectionError 
                  ? 'Unable to connect to the database'
                  : 'An error occurred while loading the dashboard'
                }
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {isConnectionError ? (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                The database service is temporarily unavailable. This is usually a temporary issue 
                that resolves itself within a few moments.
              </p>
              
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="text-sm font-semibold text-blue-900 mb-2">What you can do:</h4>
                <ul className="text-xs text-blue-800 space-y-1 list-disc list-inside">
                  <li>Wait a moment and click "Try Again"</li>
                  <li>Check if the database service is running</li>
                  <li>Refresh your browser</li>
                  <li>Contact system administrator if the issue persists</li>
                </ul>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                An unexpected error occurred while loading the staff dashboard.
              </p>
              
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <p className="text-xs text-red-800 font-mono break-words">
                  {error.message || "An unexpected error occurred"}
                </p>
              </div>
            </div>
          )}

          <div className="flex flex-col gap-2">
            <Button 
              onClick={reset} 
              className="w-full"
              variant="default"
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Try Again
            </Button>
            
            <Button 
              onClick={() => window.location.href = '/dashboard'} 
              className="w-full"
              variant="outline"
            >
              <Home className="mr-2 h-4 w-4" />
              Reload Dashboard
            </Button>
          </div>

          <p className="text-xs text-muted-foreground text-center">
            If the problem persists after multiple attempts, please contact your system administrator.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}




