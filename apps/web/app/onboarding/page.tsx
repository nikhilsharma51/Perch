'use client'

import React, { useState } from 'react'
import { StepIndicator } from '@/components/onboarding/StepIndicator'
import { StepOrgForm } from '@/components/onboarding/StepOrgForm'

export default function OnboardingPage() {
  const [step, setStep] = useState<1 | 2 | 3>(1)

  const handleContinueStep1 = () => {
    setStep(2)
  }

  const handleContinueStep2 = () => {
    setStep(3)
  }

  const handleGoToDashboard = () => {
    // This will be handled in a future phase when the dashboard exists
    // For now, just a placeholder
    window.location.href = '/dashboard'
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-paper px-6 py-12">
      <div className="w-full max-w-md">
        {/* Wordmark */}
        <div className="mb-8 flex justify-center">
          <h1 className="font-display text-[28px] leading-[36px] text-ink">
            Perch
          </h1>
        </div>

        {/* Progress Indicator */}
        <StepIndicator currentStep={step} totalSteps={3} />

        {/* Step Content Container */}
        <div className="rounded-sharp border border-border bg-surface p-8">
          {step === 1 && (
            <div>
              <h2 className="mb-2 font-ui text-lg font-medium text-ink">
                Name your organization
              </h2>
              <p className="mb-6 text-sm text-text-secondary">
                This is your studio's legal name and public URL slug.
              </p>
              <StepOrgForm onContinue={handleContinueStep1} />
            </div>
          )}

          {step === 2 && (
            <div>
              <h2 className="mb-2 font-ui text-lg font-medium text-ink">
                Add your first space
              </h2>
              <p className="mb-6 text-sm text-text-secondary">
                Step 2 placeholder — space creation form will go here
              </p>
              <div className="space-y-4">
                <button
                  onClick={handleContinueStep2}
                  className="w-full rounded-sharp border border-ink bg-ink px-5 py-3 text-sm font-medium leading-none text-paper transition-colors hover:bg-[#2e2d2a] active:bg-[#3d3c39]"
                >
                  Continue to Step 3
                </button>
                <button
                  onClick={() => setStep(3)}
                  className="w-full rounded-sharp border border-border bg-surface px-5 py-3 text-sm font-medium leading-none text-ink transition-colors hover:bg-surface-elevated"
                >
                  Skip for now
                </button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div>
              <h2 className="mb-2 font-ui text-lg font-medium text-ink">
                You're all set!
              </h2>
              <p className="mb-6 text-sm text-text-secondary">
                Your organization has been created. Step 3 placeholder — done screen with gradient will go here
              </p>
              <button
                onClick={handleGoToDashboard}
                className="w-full rounded-sharp border border-ink bg-ink px-5 py-3 text-sm font-medium leading-none text-paper transition-colors hover:bg-[#2e2d2a] active:bg-[#3d3c39]"
              >
                Go to dashboard
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
