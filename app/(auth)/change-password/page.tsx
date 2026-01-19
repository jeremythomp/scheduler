"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { useSession } from "next-auth/react"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { PasswordInput } from "@/components/ui/password-input"
import { PasswordRequirements } from "@/components/ui/password-requirements"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { OfficialBanner } from "@/components/landing/official-banner"
import { strongPasswordSchema } from "@/lib/validation"
import { changePassword } from "@/app/(staff)/actions"
import { toast } from "sonner"

const changePasswordSchema = z.object({
  currentPassword: z.string().optional(),
  newPassword: strongPasswordSchema,
  confirmPassword: z.string()
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
})

type ChangePasswordFormData = z.infer<typeof changePasswordSchema>

export default function ChangePasswordPage() {
  const router = useRouter()
  const { data: session, update } = useSession()
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const form = useForm<ChangePasswordFormData>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: ""
    }
  })

  const newPassword = form.watch("newPassword")

  async function onSubmit(data: ChangePasswordFormData) {
    setIsLoading(true)
    setError(null)

    try {
      await changePassword({
        currentPassword: data.currentPassword,
        newPassword: data.newPassword
      })
      
      // Update the session to clear mustChangePassword flag
      await update()
      
      toast.success("Password changed successfully!")
      
      // Redirect to dashboard after successful password change
      setTimeout(() => {
        router.push("/adminDashboard")
        router.refresh()
      }, 500)
    } catch (err: any) {
      setError(err.message || "Failed to change password")
      toast.error(err.message || "Failed to change password")
    } finally {
      setIsLoading(false)
    }
  }

  // Redirect if user doesn't need to change password
  if (session && session.user.mustChangePassword === false) {
    router.push("/adminDashboard")
    return null
  }
  
  // Show loading while session is being fetched
  if (!session) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p>Loading...</p>
      </div>
    )
  }

  return (
    <div className="relative flex min-h-screen w-full flex-col overflow-hidden">
      <OfficialBanner />
      
      {/* Decorative background elements */}
      <div className="absolute top-1/4 right-0 -z-10 h-[500px] w-[500px] rounded-full bg-primary/5 blur-[120px]" />
      <div className="absolute bottom-0 left-0 -z-10 h-[400px] w-[400px] rounded-full bg-primary/5 blur-[100px]" />
      
      <div className="flex flex-1 items-center justify-center px-4 py-12">
        <div className="w-full max-w-2xl space-y-8">
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
              Password Change Required
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              For security reasons, please change your password before continuing
            </p>
          </div>

          {/* Change Password Card */}
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle>Set New Password</CardTitle>
              <CardDescription>
                Choose a strong password to secure your account
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  <FormField
                    control={form.control}
                    name="currentPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Current Password (if you know it)</FormLabel>
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

                  <FormField
                    control={form.control}
                    name="newPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>New Password</FormLabel>
                        <FormControl>
                          <PasswordInput
                            placeholder="Enter your new password"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Real-time password requirements feedback */}
                  {newPassword && (
                    <PasswordRequirements password={newPassword} className="mt-2" />
                  )}

                  <FormField
                    control={form.control}
                    name="confirmPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Confirm New Password</FormLabel>
                        <FormControl>
                          <PasswordInput
                            placeholder="Re-enter your new password"
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

                  <div className="bg-blue-50 dark:bg-blue-950/50 p-4 rounded-md border border-blue-200 dark:border-blue-800">
                    <p className="text-sm text-blue-800 dark:text-blue-200">
                      <strong>Note:</strong> You must change your password before you can access the system.
                      This is a security measure for all new accounts.
                    </p>
                  </div>

                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? "Changing Password..." : "Change Password"}
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
