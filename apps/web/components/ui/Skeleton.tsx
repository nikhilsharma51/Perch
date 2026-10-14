'use client'

import { cn } from '@/lib/utils'

interface SkeletonProps {
  className?: string
}

/**
 * Reusable skeleton placeholder component using the surface-elevated token.
 * Use for loading states that match the content shape.
 * Automatically applies a subtle pulse animation.
 */
export function Skeleton({ className = '' }: SkeletonProps) {
  return (
    <div
      className={cn(
        'bg-surface-elevated rounded-sharp animate-pulse',
        className
      )}
      aria-hidden="true"
    />
  )
}
