"use client"

import { useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { AlertCircle, RefreshCw } from "lucide-react"

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error('Application error:', error)
  }, [error])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-background to-muted/30 px-4">
      <Card className="w-full max-w-md border-2 border-red-200">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-red-100 p-2">
              <AlertCircle className="h-6 w-6 text-red-600" />
            </div>
            <div>
              <CardTitle className="text-red-900">Something Went Wrong</CardTitle>
              <CardDescription>
                We encountered an unexpected error
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            The application encountered an error while processing your request. 
            This could be due to a temporary connectivity issue or service interruption.
          </p>
          
          <div className="bg-red-50 border border-red-200 rounded-lg p-3">
            <p className="text-xs text-red-800 font-mono break-words">
              {error.message || "An unexpected error occurred"}
            </p>
          </div>

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
              onClick={() => window.location.href = '/'} 
              className="w-full"
              variant="outline"
            >
              Return to Home
            </Button>
          </div>

          <p className="text-xs text-muted-foreground text-center">
            If the problem persists, please contact support or try again later.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}




