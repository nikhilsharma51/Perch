'use client'

import React, { useState } from 'react'
import { StepIndicator } from '@/components/onboarding/StepIndicator'
import { StepOrgForm } from '@/components/onboarding/StepOrgForm'
import { StepSpaceForm } from '@/components/onboarding/StepSpaceForm'
import { StepDone } from '@/components/onboarding/StepDone'

export default function OnboardingPage() {
  const [step, setStep] = useState<1 | 2 | 3>(1)

  const handleContinueStep1 = () => {
    setStep(2)
  }

  const handleContinueStep2 = () => {
    setStep(3)
  }

  return (
    <>
      {step === 3 ? (
        <StepDone />
      ) : (
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
                    Create a studio or room to start accepting bookings.
                  </p>
                  <StepSpaceForm onContinue={handleContinueStep2} />
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
