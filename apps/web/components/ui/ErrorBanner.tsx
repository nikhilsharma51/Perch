'use client'

import { AlertCircle, RotateCw } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface ErrorBannerProps {
  onRefresh?: () => void
}

export function ErrorBanner({ onRefresh }: ErrorBannerProps) {
  const router = useRouter()

  const handleRefresh = () => {
    if (onRefresh) {
      onRefresh()
    } else if (typeof window !== 'undefined') {
      window.location.reload()
    }
  }

  return (
    <div className="bg-error/10 border-b border-error px-6 py-4">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <AlertCircle className="text-error flex-shrink-0" size={20} />
          <p className="text-error font-medium">
            Could not connect — check your connection and refresh
          </p>
        </div>
        <button
          onClick={handleRefresh}
          className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-error border border-error rounded-sharp hover:bg-error/5 transition-colors flex-shrink-0"
        >
          <RotateCw size={16} />
          Refresh
        </button>
      </div>
    </div>
  )
}
