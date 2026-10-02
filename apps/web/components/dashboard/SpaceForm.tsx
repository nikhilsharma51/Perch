'use client'

import { useState } from 'react'
import type { CreateSpaceInput, UpdateSpaceInput } from '@perch/shared'
import { toDisplay, toStorage } from '@/lib/currency'

interface Space {
  id: string
  name: string
  type: 'podcast' | 'photography' | 'gaming'
  hourlyRate: number
  depositRate: number
  capacity: number
  imageUrl?: string
}

interface SpaceFormProps {
  initialValues?: Partial<Space>
  submitLabel: 'Create space' | 'Update space'
  onSubmit: (data: Record<string, any>) => Promise<void>
  isLoading?: boolean
  error?: string | null
}

// Generate 30-minute time slot options (00:00 to 23:30)
const TIME_OPTIONS = Array.from({ length: 48 }, (_, i) => {
  const hours = Math.floor(i / 2)
    .toString()
    .padStart(2, '0')
  const minutes = ((i % 2) * 30).toString().padStart(2, '0')
  return `${hours}:${minutes}`
})

const DAYS_OF_WEEK = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
]

export function SpaceForm({
  initialValues,
  submitLabel,
  onSubmit,
  isLoading = false,
  error: externalError = null,
}: SpaceFormProps) {
  const [formData, setFormData] = useState({
    name: initialValues?.name || '',
    type: (initialValues?.type || 'podcast') as 'podcast' | 'photography' | 'gaming',
    hourlyRate: initialValues?.hourlyRate
      ? toDisplay(initialValues.hourlyRate).toString()
      : '',
    depositRate: initialValues?.depositRate
      ? toDisplay(initialValues.depositRate).toString()
      : '',
    capacity: initialValues?.capacity?.toString() || '',
    imageUrl: initialValues?.imageUrl || '',
  })

  const [openHours, setOpenHours] = useState({
    0: { start: '10:00', end: '18:00' },
    1: { start: '09:00', end: '18:00' },
    2: { start: '09:00', end: '18:00' },
    3: { start: '09:00', end: '18:00' },
    4: { start: '09:00', end: '18:00' },
    5: { start: '09:00', end: '18:00' },
    6: { start: '10:00', end: '18:00' },
  })

  const [formError, setFormError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleTimeChange = (
    day: number,
    field: 'start' | 'end',
    value: string
  ) => {
    setOpenHours((prev) => ({
      ...prev,
      [day]: { ...prev[day as keyof typeof openHours], [field]: value },
    }))
  }

  const validateForm = (): boolean => {
    if (!formData.name.trim()) {
      setFormError('Space name is required')
      return false
    }
    if (!formData.hourlyRate) {
      setFormError('Hourly rate is required')
      return false
    }
    if (!formData.depositRate && formData.depositRate !== '0') {
      setFormError('Deposit amount is required')
      return false
    }
    if (!formData.capacity) {
      setFormError('Capacity is required')
      return false
    }

    const rate = parseFloat(formData.hourlyRate)
    const deposit = parseFloat(formData.depositRate)
    const capacity = parseInt(formData.capacity)

    if (isNaN(rate) || rate < 0) {
      setFormError('Hourly rate must be a valid non-negative number')
      return false
    }
    if (isNaN(deposit) || deposit < 0) {
      setFormError('Deposit amount must be a valid non-negative number')
      return false
    }
    if (isNaN(capacity) || capacity < 1) {
      setFormError('Capacity must be at least 1')
      return false
    }

    return true
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError(null)

    if (!validateForm()) {
      return
    }

    try {
      setIsSubmitting(true)

      const data: CreateSpaceInput | UpdateSpaceInput = {
        name: formData.name.trim(),
        type: formData.type,
        hourlyRate: toStorage(parseFloat(formData.hourlyRate)),
        depositRate: toStorage(parseFloat(formData.depositRate)),
        capacity: parseInt(formData.capacity),
        imageUrl: formData.imageUrl || undefined,
      }

      await onSubmit(data)
    } catch (err) {
      setFormError(
        err instanceof Error ? err.message : 'Failed to save space'
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl">
      {/* Name */}
      <div>
        <label className="block text-sm font-medium text-ink mb-2">
          Space name
        </label>
        <input
          type="text"
          name="name"
          value={formData.name}
          onChange={handleInputChange}
          disabled={isSubmitting}
          className="w-full bg-surface border border-border rounded-sharp px-4 py-3 text-sm text-ink placeholder:text-text-muted focus:outline-none focus:border-ink focus:ring-2 focus:ring-signal focus:ring-opacity-20 disabled:opacity-50"
          placeholder="e.g., Studio A"
        />
      </div>

      {/* Type */}
      <div>
        <label className="block text-sm font-medium text-ink mb-2">
          Type
        </label>
        <select
          name="type"
          value={formData.type}
          onChange={handleInputChange}
          disabled={isSubmitting}
          className="w-full bg-surface border border-border rounded-sharp px-4 py-3 text-sm text-ink focus:outline-none focus:border-ink focus:ring-2 focus:ring-signal focus:ring-opacity-20 disabled:opacity-50"
        >
          <option value="podcast">Podcast</option>
          <option value="photography">Photography</option>
          <option value="gaming">Gaming</option>
        </select>
      </div>

      {/* Rates */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-ink mb-2">
            Hourly rate (₹)
          </label>
          <input
            type="number"
            name="hourlyRate"
            value={formData.hourlyRate}
            onChange={handleInputChange}
            disabled={isSubmitting}
            step="0.01"
            min="0"
            className="w-full bg-surface border border-border rounded-sharp px-4 py-3 text-sm text-ink placeholder:text-text-muted focus:outline-none focus:border-ink focus:ring-2 focus:ring-signal focus:ring-opacity-20 disabled:opacity-50"
            placeholder="0.00"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-ink mb-2">
            Deposit (₹)
          </label>
          <input
            type="number"
            name="depositRate"
            value={formData.depositRate}
            onChange={handleInputChange}
            disabled={isSubmitting}
            step="0.01"
            min="0"
            className="w-full bg-surface border border-border rounded-sharp px-4 py-3 text-sm text-ink placeholder:text-text-muted focus:outline-none focus:border-ink focus:ring-2 focus:ring-signal focus:ring-opacity-20 disabled:opacity-50"
            placeholder="0.00"
          />
        </div>
      </div>

      {/* Capacity */}
      <div>
        <label className="block text-sm font-medium text-ink mb-2">
          Capacity (people)
        </label>
        <input
          type="number"
          name="capacity"
          value={formData.capacity}
          onChange={handleInputChange}
          disabled={isSubmitting}
          min="1"
          className="w-full bg-surface border border-border rounded-sharp px-4 py-3 text-sm text-ink placeholder:text-text-muted focus:outline-none focus:border-ink focus:ring-2 focus:ring-signal focus:ring-opacity-20 disabled:opacity-50"
          placeholder="1"
        />
      </div>

      {/* Open Hours */}
      <div>
        <label className="block text-sm font-medium text-ink mb-4">
          Open hours per day
        </label>
        <div className="space-y-3">
          {DAYS_OF_WEEK.map((day, idx) => (
            <div key={idx} className="flex items-end gap-3">
              <div className="flex-1 min-w-24">
                <p className="text-xs text-text-muted mb-1">{day}</p>
              </div>
              <select
                value={openHours[idx as keyof typeof openHours].start}
                onChange={(e) => handleTimeChange(idx, 'start', e.target.value)}
                disabled={isSubmitting}
                className="bg-surface border border-border rounded-sharp px-3 py-2 text-sm text-ink focus:outline-none focus:border-ink focus:ring-2 focus:ring-signal focus:ring-opacity-20 disabled:opacity-50"
              >
                {TIME_OPTIONS.map((time) => (
                  <option key={time} value={time}>
                    {time}
                  </option>
                ))}
              </select>
              <span className="text-text-muted">–</span>
              <select
                value={openHours[idx as keyof typeof openHours].end}
                onChange={(e) => handleTimeChange(idx, 'end', e.target.value)}
                disabled={isSubmitting}
                className="bg-surface border border-border rounded-sharp px-3 py-2 text-sm text-ink focus:outline-none focus:border-ink focus:ring-2 focus:ring-signal focus:ring-opacity-20 disabled:opacity-50"
              >
                {TIME_OPTIONS.map((time) => (
                  <option key={time} value={time}>
                    {time}
                  </option>
                ))}
              </select>
            </div>
          ))}
        </div>
      </div>

      {/* Error states */}
      {(formError || externalError) && (
        <div className="bg-error/10 border border-error rounded-sharp p-4 text-error text-sm">
          <p className="font-medium">{formError || externalError}</p>
        </div>
      )}

      {/* Submit button */}
      <div className="pt-4">
        <button
          type="submit"
          disabled={isSubmitting}
          className="inline-flex items-center justify-center rounded-sharp border border-ink bg-ink px-6 py-3 text-sm font-medium leading-none text-paper transition-colors hover:bg-[#2e2d2a] active:bg-[#3d3c39] disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSubmitting ? 'Saving...' : submitLabel}
        </button>
      </div>
    </form>
  )
}
