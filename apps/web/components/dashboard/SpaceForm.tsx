'use client'

import { useState } from 'react'
import type { CreateSpaceInput, UpdateSpaceInput } from '@perch/shared'
import { toDisplay, toStorage } from '@/lib/currency'
import Link from 'next/link'
import { motion } from 'framer-motion'
import {
  Buildings,
  Camera,
  Coins,
  GameController,
  Microphone,
  Users,
  Clock,
  Image as ImageIcon,
  Check,
  WarningCircle,
} from 'phosphor-react'
import { CircleAlertIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'

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

const SPACE_TYPES = [
  {
    value: 'podcast' as const,
    label: 'Podcast Studio',
    description: 'Acoustically treated room optimized for voice and streaming',
    icon: Microphone,
  },
  {
    value: 'photography' as const,
    label: 'Photo Studio',
    description: 'Equipped with professional backdrops and lighting gear',
    icon: Camera,
  },
  {
    value: 'gaming' as const,
    label: 'Gaming Lounge',
    description: 'High-spec setups and console stations for team tournaments',
    icon: GameController,
  },
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
  const [dialogOpen, setDialogOpen] = useState(false)

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

  const performSubmit = async () => {
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    await performSubmit()
  }

  const handleConfirmPublish = async () => {
    setDialogOpen(false)
    await performSubmit()
  }

  return (
    <motion.form
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      onSubmit={handleSubmit}
      className="space-y-6 max-w-4xl"
    >
      {/* Module 1: General Space Information */}
      <div className="bg-surface border border-border rounded-sharp p-6 shadow-xs space-y-6">
        <div className="flex items-center gap-3 border-b border-border pb-4">
          <div className="h-8 w-8 rounded-sharp bg-paper border border-border flex items-center justify-center text-ink flex-shrink-0">
            <Buildings size={18} weight="regular" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-ink uppercase tracking-wider">
              General Information
            </h2>
            <p className="text-xs text-text-muted mt-0.5">
              Specify the identity, category, and capacity for this space
            </p>
          </div>
        </div>

        {/* Space Name */}
        <div>
          <label className="block text-sm font-medium text-ink mb-1.5">
            Space name <span className="text-signal">*</span>
          </label>
          <input
            type="text"
            name="name"
            value={formData.name}
            onChange={handleInputChange}
            disabled={isSubmitting || isLoading}
            className="w-full bg-paper/40 border border-border rounded-sharp px-4 py-2.5 text-sm text-ink placeholder:text-text-muted focus:outline-none focus:border-ink focus:ring-2 focus:ring-ink/10 transition-all disabled:opacity-50"
            placeholder="e.g., Studio Alpha / Podcast Suite A"
          />
        </div>

        {/* Type Selection Tiles */}
        <div>
          <label className="block text-sm font-medium text-ink mb-2">
            Space Category <span className="text-signal">*</span>
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {SPACE_TYPES.map((t) => {
              const isSelected = formData.type === t.value
              const Icon = t.icon
              return (
                <div
                  key={t.value}
                  onClick={() => {
                    if (!isSubmitting && !isLoading) {
                      setFormData((prev) => ({ ...prev, type: t.value }))
                    }
                  }}
                  className={cn(
                    'p-4 rounded-sharp border cursor-pointer transition-all duration-150 flex flex-col justify-between select-none relative',
                    isSelected
                      ? 'border-ink bg-surface shadow-xs ring-1 ring-ink'
                      : 'border-border bg-paper/30 hover:border-ink/40 hover:bg-paper/70'
                  )}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div
                      className={cn(
                        'h-8 w-8 rounded-sharp flex items-center justify-center transition-colors',
                        isSelected
                          ? 'bg-ink text-paper'
                          : 'bg-paper text-text-secondary border border-border'
                      )}
                    >
                      <Icon size={18} weight="regular" />
                    </div>
                    {isSelected && (
                      <span className="h-5 w-5 rounded-full bg-ink text-paper flex items-center justify-center text-xs">
                        <Check size={12} weight="bold" />
                      </span>
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-ink">{t.label}</p>
                    <p className="text-xs text-text-muted mt-1 leading-relaxed">
                      {t.description}
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
          {/* Accessible fallback select */}
          <select
            name="type"
            value={formData.type}
            onChange={handleInputChange}
            className="sr-only"
            tabIndex={-1}
          >
            <option value="podcast">Podcast</option>
            <option value="photography">Photography</option>
            <option value="gaming">Gaming</option>
          </select>
        </div>

        {/* Capacity */}
        <div className="max-w-xs">
          <label className="block text-sm font-medium text-ink mb-1.5">
            Maximum Capacity (people) <span className="text-signal">*</span>
          </label>
          <div className="relative">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none">
              <Users size={16} weight="regular" />
            </span>
            <input
              type="number"
              name="capacity"
              value={formData.capacity}
              onChange={handleInputChange}
              disabled={isSubmitting || isLoading}
              min="1"
              className="w-full bg-paper/40 border border-border rounded-sharp pl-10 pr-4 py-2.5 text-sm text-ink placeholder:text-text-muted focus:outline-none focus:border-ink focus:ring-2 focus:ring-ink/10 transition-all disabled:opacity-50 tabular-nums"
              placeholder="e.g. 4"
            />
          </div>
        </div>
      </div>

      {/* Module 2: Rates & Deposit */}
      <div className="bg-surface border border-border rounded-sharp p-6 shadow-xs space-y-6">
        <div className="flex items-center gap-3 border-b border-border pb-4">
          <div className="h-8 w-8 rounded-sharp bg-paper border border-border flex items-center justify-center text-ink flex-shrink-0">
            <Coins size={18} weight="regular" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-ink uppercase tracking-wider">
              Pricing & Deposit
            </h2>
            <p className="text-xs text-text-muted mt-0.5">
              Set hourly booking fees and mandatory upfront confirmation deposits
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div>
            <label className="block text-sm font-medium text-ink mb-1.5">
              Hourly rate (₹) <span className="text-signal">*</span>
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted font-medium text-sm pointer-events-none">
                ₹
              </span>
              <input
                type="number"
                name="hourlyRate"
                value={formData.hourlyRate}
                onChange={handleInputChange}
                disabled={isSubmitting || isLoading}
                step="0.01"
                min="0"
                className="w-full bg-paper/40 border border-border rounded-sharp pl-8 pr-4 py-2.5 text-sm text-ink placeholder:text-text-muted focus:outline-none focus:border-ink focus:ring-2 focus:ring-ink/10 transition-all disabled:opacity-50 tabular-nums"
                placeholder="0.00"
              />
            </div>
            <p className="text-xs text-text-muted mt-1.5">
              Charged to renters for each hour reserved
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-ink mb-1.5">
              Required deposit (₹) <span className="text-signal">*</span>
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted font-medium text-sm pointer-events-none">
                ₹
              </span>
              <input
                type="number"
                name="depositRate"
                value={formData.depositRate}
                onChange={handleInputChange}
                disabled={isSubmitting || isLoading}
                step="0.01"
                min="0"
                className="w-full bg-paper/40 border border-border rounded-sharp pl-8 pr-4 py-2.5 text-sm text-ink placeholder:text-text-muted focus:outline-none focus:border-ink focus:ring-2 focus:ring-ink/10 transition-all disabled:opacity-50 tabular-nums"
                placeholder="0.00"
              />
            </div>
            <p className="text-xs text-text-muted mt-1.5">
              Non-refundable deposit paid to hold the slot
            </p>
          </div>
        </div>
      </div>

      {/* Module 3: Space Media */}
      <div className="bg-surface border border-border rounded-sharp p-6 shadow-xs space-y-4">
        <div className="flex items-center gap-3 border-b border-border pb-4">
          <div className="h-8 w-8 rounded-sharp bg-paper border border-border flex items-center justify-center text-ink flex-shrink-0">
            <ImageIcon size={18} weight="regular" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-ink uppercase tracking-wider">
              Space Media
            </h2>
            <p className="text-xs text-text-muted mt-0.5">
              Add a high-resolution photo of this space for renters to preview
            </p>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-ink mb-1.5">
            Image URL (Optional)
          </label>
          <input
            type="url"
            name="imageUrl"
            value={formData.imageUrl}
            onChange={handleInputChange}
            disabled={isSubmitting || isLoading}
            className="w-full bg-paper/40 border border-border rounded-sharp px-4 py-2.5 text-sm text-ink placeholder:text-text-muted focus:outline-none focus:border-ink focus:ring-2 focus:ring-ink/10 transition-all disabled:opacity-50"
            placeholder="https://images.unsplash.com/photo-..."
          />
        </div>

        {formData.imageUrl && (
          <div className="mt-3 p-3 bg-paper/50 border border-border rounded-sharp flex items-center gap-3">
            <div className="h-16 w-24 bg-surface-elevated rounded-sharp border border-border overflow-hidden flex-shrink-0">
              <img
                src={formData.imageUrl}
                alt="Space preview"
                className="h-full w-full object-cover"
                onError={(e) => {
                  ;(e.target as HTMLElement).style.display = 'none'
                }}
              />
            </div>
            <div className="text-xs text-text-muted">
              <p className="font-medium text-ink">Image preview loaded</p>
              <p className="truncate max-w-md">{formData.imageUrl}</p>
            </div>
          </div>
        )}
      </div>

      {/* Module 4: Operating Hours */}
      <div className="bg-surface border border-border rounded-sharp p-6 shadow-xs space-y-6">
        <div className="flex items-center gap-3 border-b border-border pb-4">
          <div className="h-8 w-8 rounded-sharp bg-paper border border-border flex items-center justify-center text-ink flex-shrink-0">
            <Clock size={18} weight="regular" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-ink uppercase tracking-wider">
              Operating Hours
            </h2>
            <p className="text-xs text-text-muted mt-0.5">
              Configure open time slots available for booking each day of the week
            </p>
          </div>
        </div>

        <div className="divide-y divide-border/60">
          {DAYS_OF_WEEK.map((day, idx) => (
            <div
              key={idx}
              className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5"
            >
              <div className="w-32">
                <span className="text-sm font-medium text-ink">{day}</span>
              </div>
              <div className="flex items-center gap-2">
                <select
                  value={openHours[idx as keyof typeof openHours].start}
                  onChange={(e) => handleTimeChange(idx, 'start', e.target.value)}
                  disabled={isSubmitting || isLoading}
                  className="bg-paper/50 border border-border rounded-sharp px-3 py-1.5 text-sm text-ink font-medium focus:outline-none focus:border-ink focus:ring-2 focus:ring-ink/10 disabled:opacity-50 tabular-nums cursor-pointer"
                >
                  {TIME_OPTIONS.map((time) => (
                    <option key={time} value={time}>
                      {time}
                    </option>
                  ))}
                </select>
                <span className="text-text-muted text-xs">to</span>
                <select
                  value={openHours[idx as keyof typeof openHours].end}
                  onChange={(e) => handleTimeChange(idx, 'end', e.target.value)}
                  disabled={isSubmitting || isLoading}
                  className="bg-paper/50 border border-border rounded-sharp px-3 py-1.5 text-sm text-ink font-medium focus:outline-none focus:border-ink focus:ring-2 focus:ring-ink/10 disabled:opacity-50 tabular-nums cursor-pointer"
                >
                  {TIME_OPTIONS.map((time) => (
                    <option key={time} value={time}>
                      {time}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Error state */}
      {(formError || externalError) && (
        <div className="bg-error/10 border border-error/20 rounded-sharp p-4 text-error text-sm flex items-start gap-2.5">
          <WarningCircle size={18} weight="regular" className="shrink-0 mt-0.5" />
          <p className="font-medium">{formError || externalError}</p>
        </div>
      )}

      {/* Actions & Confirmation Footer */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-border">
        <Link
          href="/dashboard/spaces"
          className="w-full sm:w-auto inline-flex items-center justify-center rounded-sharp border border-border bg-transparent px-5 py-2.5 text-sm font-medium text-ink hover:bg-paper transition-colors order-2 sm:order-1"
        >
          Cancel
        </Link>

        <div className="flex items-center gap-3 w-full sm:w-auto justify-end order-1 sm:order-2">
          {/* Reference Dialog Confirmation */}
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button
                type="button"
                variant="outline"
                onClick={(e) => {
                  if (!validateForm()) {
                    e.preventDefault()
                    return
                  }
                }}
              >
                Review & Publish
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <div className="flex flex-col gap-3">
                  <div className="bg-paper border border-border flex size-10 items-center justify-center rounded-full text-ink">
                    <CircleAlertIcon className="h-5 w-5 text-ink" />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <DialogTitle>Publish space?</DialogTitle>
                    <DialogDescription>
                      "{formData.name.trim() || 'New Space'}" will go live immediately on your organization's booking calendar and be open for reservations.
                    </DialogDescription>
                  </div>
                </div>
              </DialogHeader>
              <DialogFooter>
                <DialogClose asChild>
                  <Button variant="outline" disabled={isSubmitting || isLoading}>
                    Cancel
                  </Button>
                </DialogClose>
                <Button
                  onClick={handleConfirmPublish}
                  isLoading={isSubmitting || isLoading}
                  disabled={isSubmitting || isLoading}
                >
                  {isSubmitting || isLoading ? 'Creating space...' : 'Publish'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Modern Create space button with loading state */}
          <Button
            type="submit"
            isLoading={isSubmitting || isLoading}
            disabled={isSubmitting || isLoading}
            className="w-full sm:w-auto px-7 py-2.5 text-sm"
          >
            {isSubmitting || isLoading
              ? 'Creating space...'
              : submitLabel}
          </Button>
        </div>
      </div>
    </motion.form>
  )
}
