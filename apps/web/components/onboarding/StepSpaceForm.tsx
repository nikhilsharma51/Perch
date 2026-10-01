'use client'

import React, { useState, FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'
import { api } from '@/lib/api'
import type { CreateSpaceInput } from '@perch/shared'

interface StepSpaceFormProps {
  onContinue: () => void
}

export function StepSpaceForm({ onContinue }: StepSpaceFormProps) {
  const router = useRouter()
  const { user } = useAuth()
  const orgId = user?.orgId

  const [formData, setFormData] = useState<CreateSpaceInput>({
    name: '',
    type: 'podcast',
    hourlyRate: 0,
    depositRate: 0,
    capacity: 1,
  })

  const [errors, setErrors] = useState<Partial<Record<keyof CreateSpaceInput, string>>>({})
  const [isLoading, setIsLoading] = useState(false)

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target

    if (name === 'type') {
      setFormData((prev) => ({
        ...prev,
        [name]: value as 'podcast' | 'photography' | 'gaming',
      }))
    } else if (['hourlyRate', 'depositRate', 'capacity'].includes(name)) {
      setFormData((prev) => ({
        ...prev,
        [name]: Math.max(0, parseInt(value, 10) || 0),
      }))
    } else {
      setFormData((prev) => ({
        ...prev,
        [name]: value,
      }))
    }

    // Clear error for this field when user starts typing
    if (errors[name as keyof CreateSpaceInput]) {
      setErrors((prev) => ({
        ...prev,
        [name]: undefined,
      }))
    }
  }

  const validateForm = (): boolean => {
    const newErrors: Partial<Record<keyof CreateSpaceInput, string>> = {}

    if (!formData.name.trim()) {
      newErrors.name = 'Space name is required'
    }
    if (formData.name.length > 255) {
      newErrors.name = 'Space name must be less than 255 characters'
    }

    if (formData.hourlyRate <= 0) {
      newErrors.hourlyRate = 'Hourly rate must be greater than 0'
    }

    if (formData.depositRate < 0) {
      newErrors.depositRate = 'Deposit rate must be non-negative'
    }

    if (formData.capacity < 1) {
      newErrors.capacity = 'Capacity must be at least 1'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()

    if (!validateForm()) {
      return
    }

    if (!orgId) {
      setErrors({ name: 'Organization ID not found. Please go back and create an organization.' })
      return
    }

    setIsLoading(true)
    try {
      await api.spaces.create(orgId, formData)
      onContinue()
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to create space'
      setErrors({ name: errorMessage })
    } finally {
      setIsLoading(false)
    }
  }

  const handleSkip = () => {
    // Skip space creation and go directly to dashboard
    router.push('/dashboard')
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <label htmlFor="name" className="text-sm font-medium text-ink">
          Space name
        </label>
        <input
          id="name"
          type="text"
          name="name"
          placeholder="Studio A"
          value={formData.name}
          onChange={handleInputChange}
          className="rounded-sharp border border-border bg-surface px-4 py-3 text-base text-ink placeholder-text-muted focus:border-ink focus:outline-none focus:ring-2 focus:ring-signal focus:ring-opacity-20"
        />
        {errors.name && (
          <p className="text-xs text-error">{errors.name}</p>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="type" className="text-sm font-medium text-ink">
          Space type
        </label>
        <select
          id="type"
          name="type"
          value={formData.type}
          onChange={handleInputChange}
          className="rounded-sharp border border-border bg-surface px-4 py-3 text-base text-ink focus:border-ink focus:outline-none focus:ring-2 focus:ring-signal focus:ring-opacity-20"
        >
          <option value="podcast">Podcast Studio</option>
          <option value="photography">Photography Studio</option>
          <option value="gaming">Gaming Café</option>
        </select>
        {errors.type && (
          <p className="text-xs text-error">{errors.type}</p>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="hourlyRate" className="text-sm font-medium text-ink">
          Hourly rate (₹)
        </label>
        <input
          id="hourlyRate"
          type="number"
          name="hourlyRate"
          placeholder="5000"
          value={formData.hourlyRate || ''}
          onChange={handleInputChange}
          min="1"
          step="100"
          className="rounded-sharp border border-border bg-surface px-4 py-3 text-base text-ink placeholder-text-muted focus:border-ink focus:outline-none focus:ring-2 focus:ring-signal focus:ring-opacity-20"
        />
        {errors.hourlyRate && (
          <p className="text-xs text-error">{errors.hourlyRate}</p>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="depositRate" className="text-sm font-medium text-ink">
          Deposit amount (₹)
        </label>
        <input
          id="depositRate"
          type="number"
          name="depositRate"
          placeholder="2000"
          value={formData.depositRate || ''}
          onChange={handleInputChange}
          min="0"
          step="100"
          className="rounded-sharp border border-border bg-surface px-4 py-3 text-base text-ink placeholder-text-muted focus:border-ink focus:outline-none focus:ring-2 focus:ring-signal focus:ring-opacity-20"
        />
        {errors.depositRate && (
          <p className="text-xs text-error">{errors.depositRate}</p>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="capacity" className="text-sm font-medium text-ink">
          Capacity (people)
        </label>
        <input
          id="capacity"
          type="number"
          name="capacity"
          placeholder="6"
          value={formData.capacity || ''}
          onChange={handleInputChange}
          min="1"
          step="1"
          className="rounded-sharp border border-border bg-surface px-4 py-3 text-base text-ink placeholder-text-muted focus:border-ink focus:outline-none focus:ring-2 focus:ring-signal focus:ring-opacity-20"
        />
        {errors.capacity && (
          <p className="text-xs text-error">{errors.capacity}</p>
        )}
      </div>

    
      {errors.name && formData.name && !formData.name.trim() === false && errors.name.includes('not found') && (
        <div className="rounded-sharp border border-error/20 bg-error/5 px-4 py-3 text-sm text-error">
          {errors.name}
        </div>
      )}

      <div className="flex flex-col gap-2 mt-4">
        <button
          type="submit"
          disabled={isLoading}
          className="flex items-center justify-center gap-2 rounded-sharp border border-ink bg-ink px-5 py-3 text-sm font-medium leading-none text-paper transition-colors hover:bg-[#2e2d2a] active:bg-[#3d3c39] disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? 'Creating space...' : 'Continue'}
        </button>

        <button
          type="button"
          onClick={handleSkip}
          disabled={isLoading}
          className="rounded-sharp border border-border bg-surface px-5 py-3 text-sm font-medium leading-none text-ink transition-colors hover:bg-surface-elevated disabled:opacity-50 disabled:cursor-not-allowed"
        >
          I'll add spaces later
        </button>
      </div>
    </form>
  )
}
