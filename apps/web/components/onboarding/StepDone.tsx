'use client'

import React from 'react'
import { useRouter } from 'next/navigation'

interface StepDoneProps {
  onDone?: () => void
}

export function StepDone({ onDone }: StepDoneProps) {
  const router = useRouter()

  const handleGoToDashboard = () => {
    if (onDone) {
      onDone()
    }
    router.push('/dashboard')
  }

  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-paper via-paper to-yellow-50/20">
      <div className="w-full max-w-md px-4">
        {/* Wordmark */}
        <div className="mb-12 flex justify-center">
          <h1 className="font-display text-[28px] leading-[36px] text-ink">
            Perch
          </h1>
        </div>

        {/* Done Card */}
        <div className="rounded-sharp border border-border bg-surface p-12 shadow-sm flex flex-col items-center text-center">
          <h2 className="mb-2 font-ui text-lg font-medium text-ink">
            You're all set!
          </h2>
          <p className="mb-8 text-sm text-text-secondary">
            Your organization is ready to start accepting bookings. You can add
            more spaces anytime from the dashboard.
          </p>

          {/* Go to Dashboard Button */}
          <button
            onClick={handleGoToDashboard}
            className="rounded-sharp border border-ink bg-ink px-6 py-3 text-sm font-medium leading-none text-paper transition-colors hover:bg-[#2e2d2a] active:bg-[#3d3c39]"
          >
            Go to dashboard
          </button>
        </div>
      </div>
    </div>
  )
}
