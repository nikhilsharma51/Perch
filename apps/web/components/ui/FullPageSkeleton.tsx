'use client'

export function FullPageSkeleton() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-paper">
      <div className="space-y-4 w-full max-w-md px-4">
        {/* Header skeleton */}
        <div className="h-12 bg-surface-elevated rounded-object animate-pulse" />
        
        {/* Content skeleton - 3 rows */}
        <div className="space-y-3 mt-8">
          <div className="h-4 bg-surface-elevated rounded-object animate-pulse w-full" />
          <div className="h-4 bg-surface-elevated rounded-object animate-pulse w-5/6" />
          <div className="h-4 bg-surface-elevated rounded-object animate-pulse w-4/6" />
        </div>

        {/* Button skeleton */}
        <div className="h-10 bg-surface-elevated rounded-object animate-pulse mt-8" />
      </div>
    </div>
  )
}
