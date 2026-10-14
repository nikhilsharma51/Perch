'use client'

import Link from 'next/link'
import { cn } from '@/lib/utils'

interface EmptyStateProps {
  title: string
  actionText?: string
  actionHref?: string
  onAction?: () => void
  className?: string
}

/**
 * Shared empty state component for lists with no items.
 * Shows title + optional action button.
 * Used for: no spaces, no staff, no bookings, etc.
 */
export function EmptyState({
  title,
  actionText,
  actionHref,
  onAction,
  className = '',
}: EmptyStateProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center py-16 text-center', className)}>
      <p className="text-lg font-semibold text-ink mb-4">{title}</p>
      {actionText && (actionHref || onAction) && (
        actionHref ? (
          <Link
            href={actionHref}
            className="inline-flex px-4 py-2 bg-signal text-paper rounded-sharp font-medium hover:opacity-90 transition-opacity"
          >
            {actionText}
          </Link>
        ) : (
          <button
            onClick={onAction}
            className="inline-flex px-4 py-2 bg-signal text-paper rounded-sharp font-medium hover:opacity-90 transition-colors"
          >
            {actionText}
          </button>
        )
      )}
    </div>
  )
}
