"use client"

import { Check, X } from "lucide-react"
import { checkPasswordRequirements } from "@/lib/validation"

interface PasswordRequirementsProps {
  password: string
  className?: string
}

export function PasswordRequirements({ password, className = "" }: PasswordRequirementsProps) {
  const requirements = checkPasswordRequirements(password)
  
  const requirementsList = [
    { id: "minLength", label: "At least 6 characters", met: requirements.minLength },
    { id: "hasUppercase", label: "One uppercase letter", met: requirements.hasUppercase },
    { id: "hasNumber", label: "One number", met: requirements.hasNumber },
    { id: "hasSpecialChar", label: "One special character (!@#$%^&*...)", met: requirements.hasSpecialChar },
  ]

  return (
    <div className={`space-y-2 ${className}`}>
      <p className="text-sm font-medium text-muted-foreground">Password must contain:</p>
      <ul className="space-y-1">
        {requirementsList.map((req) => (
          <li key={req.id} className="flex items-center gap-2 text-sm">
            {req.met ? (
              <Check className="h-4 w-4 text-green-600 dark:text-green-500" />
            ) : (
              <X className="h-4 w-4 text-red-600 dark:text-red-500" />
            )}
            <span className={req.met ? "text-green-700 dark:text-green-400" : "text-muted-foreground"}>
              {req.label}
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}
