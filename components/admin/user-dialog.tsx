"use client"

import { useState, useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { PasswordInput } from "@/components/ui/password-input"
import { PasswordRequirements } from "@/components/ui/password-requirements"
import { strongPasswordSchema } from "@/lib/validation"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { createUser, updateUser } from "@/app/(staff)/actions"
import { toast } from "sonner"

// Schema for creating new users (no password field - auto-generated)
const createUserSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  role: z.enum(["admin", "staff"])
})

// Schema for editing existing users (optional password for manual reset)
const editUserSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  password: strongPasswordSchema.optional().or(z.literal("")),
  role: z.enum(["admin", "staff"])
})

type UserFormData = z.infer<typeof createUserSchema> & { password?: string }

interface UserDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  user?: {
    id: number
    name: string
    email: string
    role: string
  }
  onSuccess?: () => void
}

export function UserDialog({ open, onOpenChange, user, onSuccess }: UserDialogProps) {
  const [isLoading, setIsLoading] = useState(false)
  const isEditing = !!user

  const form = useForm<UserFormData>({
    resolver: zodResolver(isEditing ? editUserSchema : createUserSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
      role: "staff"
    }
  })
  
  const password = form.watch("password")

  // Reset form when dialog opens or user changes
  useEffect(() => {
    if (open) {
      if (user) {
        form.reset({
          name: user.name,
          email: user.email,
          password: "",
          role: user.role as "admin" | "staff"
        })
      } else {
        form.reset({
          name: "",
          email: "",
          password: "",
          role: "staff"
        })
      }
    }
  }, [open, user, form])

  async function onSubmit(data: UserFormData) {
    setIsLoading(true)

    try {
      if (isEditing) {
        // Update existing user
        const updateData: any = {
          name: data.name,
          email: data.email,
          role: data.role
        }
        
        // Only include password if it's been changed
        if (data.password && data.password.length > 0) {
          updateData.password = data.password
        }
        
        await updateUser(user.id, updateData)
        toast.success("User updated successfully")
      } else {
        // Create new user - password is auto-generated
        await createUser({
          name: data.name,
          email: data.email,
          role: data.role
        })
        toast.success("User created successfully. Login credentials have been emailed.")
      }

      onOpenChange(false)
      onSuccess?.()
    } catch (error: any) {
      toast.error(error.message || "Failed to save user")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit User" : "Create New User"}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Update the user's information below."
              : "Add a new staff member. A secure temporary password will be generated and emailed to them."}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input placeholder="John Doe" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input type="email" placeholder="john@example.com" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {isEditing && (
              <>
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        Password <span className="text-muted-foreground text-xs">(leave blank to keep current)</span>
                      </FormLabel>
                      <FormControl>
                        <PasswordInput
                          placeholder="Enter new password to reset"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                {/* Show password requirements when editing password */}
                {password && password.length > 0 && (
                  <PasswordRequirements password={password} className="mt-2" />
                )}
              </>
            )}
            
            {!isEditing && (
              <div className="rounded-md bg-blue-50 dark:bg-blue-950/50 p-3 text-sm text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800">
                <p className="font-medium mb-1">Password will be auto-generated</p>
                <p className="text-xs text-blue-600/80 dark:text-blue-400/80">
                  A secure temporary password will be generated and sent to the user's email. 
                  They will be required to change it on first login.
                </p>
              </div>
            )}

            <FormField
              control={form.control}
              name="role"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Role</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a role" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="staff">Staff</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isLoading}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? "Saving..." : isEditing ? "Update User" : "Create User"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
