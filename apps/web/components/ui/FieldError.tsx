'use client'

import { AlertCircle } from 'lucide-react'

interface FieldErrorProps {
  error?: string
  id?: string
}

/**
 * Reusable field error component for form validation messages.
 * Used with aria-describedby and aria-invalid for accessibility.
 */
export function FieldError({ error, id }: FieldErrorProps) {
  if (!error) return null

  return (
    <div
      id={id}
      className="mt-1.5 flex items-start gap-1.5 text-sm text-error"
      role="alert"
    >
      <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
      <span>{error}</span>
    </div>
  )
}
