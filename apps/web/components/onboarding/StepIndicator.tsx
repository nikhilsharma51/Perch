'use client'

interface StepIndicatorProps {
  currentStep: 1 | 2 | 3
  totalSteps: number
}

export function StepIndicator({ currentStep, totalSteps }: StepIndicatorProps) {
  return (
    <div className="flex items-center justify-center mb-8">
      <p className="text-sm font-medium text-text-secondary">
        Step {currentStep} of {totalSteps}
      </p>
    </div>
  )
}
