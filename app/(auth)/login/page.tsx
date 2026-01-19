"use client"

import { useState } from "react"
import { signIn } from "next-auth/react"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import Link from "next/link"
import Image from "next/image"
import { ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { PasswordInput } from "@/components/ui/password-input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { OfficialBanner } from "@/components/landing/official-banner"

const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required")
})

type LoginFormData = z.infer<typeof loginSchema>

export default function LoginPage() {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const form = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: ""
    }
  })

  async function onSubmit(data: LoginFormData) {
    setIsLoading(true)
    setError(null)

    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/41ada7fd-1087-4968-83f9-c46a84381e41',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'login/page.tsx:42',message:'Login form submitted',data:{email:data.email,passwordLength:data.password.length},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'H5'})}).catch(()=>{});
    // #endregion

    try {
      const result = await signIn("credentials", {
        email: data.email,
        password: data.password,
        redirect: false
      })

      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/41ada7fd-1087-4968-83f9-c46a84381e41',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'login/page.tsx:54',message:'signIn result',data:{hasError:!!result?.error,errorMsg:result?.error,isOk:result?.ok,status:result?.status},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'H5'})}).catch(()=>{});
      // #endregion

      if (result?.error) {
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/41ada7fd-1087-4968-83f9-c46a84381e41',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'login/page.tsx:60',message:'Login error branch',data:{error:result.error},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'H5'})}).catch(()=>{});
        // #endregion
        setError("Invalid email or password")
      } else if (result?.ok) {
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/41ada7fd-1087-4968-83f9-c46a84381e41',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'login/page.tsx:67',message:'Login success branch',data:{},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'H5'})}).catch(()=>{});
        // #endregion
        
        // Fetch the session to check mustChangePassword flag
        const response = await fetch('/api/auth/session')
        const session = await response.json()
        
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/41ada7fd-1087-4968-83f9-c46a84381e41',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'login/page.tsx:76',message:'Session fetched',data:{hasSession:!!session,hasUser:!!session?.user,mustChangePassword:session?.user?.mustChangePassword},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'H5'})}).catch(()=>{});
        // #endregion
        
        // Redirect based on mustChangePassword status
        if (session?.user?.mustChangePassword) {
          router.push("/change-password")
        } else {
          router.push("/adminDashboard")
        }
        router.refresh()
      }
    } catch (err) {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/41ada7fd-1087-4968-83f9-c46a84381e41',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'login/page.tsx:92',message:'Exception caught',data:{errorMsg:(err as Error)?.message},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'H5'})}).catch(()=>{});
      // #endregion
      setError("An error occurred. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="relative flex min-h-screen w-full flex-col overflow-hidden">
      <OfficialBanner />
      
      {/* Decorative background elements */}
      <div className="absolute top-1/4 right-0 -z-10 h-[500px] w-[500px] rounded-full bg-primary/5 blur-[120px]" />
      <div className="absolute bottom-0 left-0 -z-10 h-[400px] w-[400px] rounded-full bg-primary/5 blur-[100px]" />
      
      <div className="flex flex-1 items-center justify-center px-4 py-12">
        <div className="w-full max-w-md space-y-8">
          {/* Logo and Branding */}
          <div className="flex flex-col items-center text-center">
            <div className="relative mb-4 flex h-16 w-16 items-center justify-center">
              <Image 
                src="/logo.png" 
                alt="Barbados Licensing Authority Logo" 
                width={64} 
                height={64}
                className="h-full w-full object-contain"
                priority
              />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Barbados Licensing Authority
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Staff Portal
            </p>
          </div>

          {/* Login Card */}
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle>Staff Login</CardTitle>
              <CardDescription>
                Enter your credentials to access the staff dashboard
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input
                            type="email"
                            placeholder="staff@example.com"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Password</FormLabel>
                        <FormControl>
                          <PasswordInput
                            placeholder="••••••••"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {error && (
                    <div className="rounded-md bg-red-50 p-3 text-sm text-red-600 dark:bg-red-950/50 dark:text-red-400">
                      {error}
                    </div>
                  )}

                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? "Signing in..." : "Sign In"}
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>

          {/* Back to Home Link */}
          <div className="text-center">
            <Link 
              href="/" 
              className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-primary"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Home
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
