'use client'

import { Lock } from 'lucide-react'

interface PermissionDeniedProps {
  className?: string
}

export function PermissionDenied({ className = '' }: PermissionDeniedProps) {
  return (
    <div className={`bg-surface border border-border rounded-sharp p-6 text-center ${className}`}>
      <div className="flex justify-center mb-3">
        <div className="w-12 h-12 bg-text-muted/10 rounded-full flex items-center justify-center">
          <Lock size={24} className="text-text-muted" />
        </div>
      </div>
      <p className="text-ink font-medium">You don't have permission to do this</p>
    </div>
  )
}
