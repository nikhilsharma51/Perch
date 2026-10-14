'use client'

import { classifyError, getFieldErrors, getErrorMessage } from '@/lib/errors'
import { useToast } from '@/components/ui/Toast'

interface HandleErrorOptions {
  setFieldErrors?: (errors: Record<string, string[]>) => void
  setPageError?: (error: string | null) => void
  onForbidden?: () => void
  onNetworkError?: () => void
}

/**
 * Hook that provides error handling for API calls.
 * Applies context-specific handling based on error type:
 * - network: sets page-level error
 * - validation: calls setFieldErrors with field-level errors
 * - forbidden: sets page-level error (can render PermissionDenied)
 * - server/unknown: shows toast
 */
export function useApiError() {
  const { error: showError } = useToast()

  const handleError = (err: unknown, options: HandleErrorOptions = {}) => {
    const { setFieldErrors, setPageError, onForbidden, onNetworkError } = options
    const errorType = classifyError(err)
    const message = getErrorMessage(err)

    switch (errorType) {
      case 'network':
        setPageError?.('network')
        onNetworkError?.()
        break

      case 'validation':
        const fieldErrors = getFieldErrors(err)
        setFieldErrors?.(fieldErrors)
        break

      case 'forbidden':
        setPageError?.('forbidden')
        onForbidden?.()
        break

      case 'server':
      case 'unknown':
        showError('Something went wrong on our end — try again')
        break
    }
  }

  return { handleError }
}
