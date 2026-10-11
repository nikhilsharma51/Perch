'use client'

import React from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'

interface DateNavigationProps {
  selectedDate: Date
  onDateChange: (date: Date) => void
  minDate?: Date
  maxDate?: Date
  compact?: boolean
}

function formatDate(date: Date): string {
  return date.toISOString().split('T')[0]
}

function formatDisplayDate(date: Date): string {
  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: date.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined,
  })
}

export function DateNavigation({
  selectedDate,
  onDateChange,
  minDate,
  maxDate,
  compact = false,
}: DateNavigationProps) {
  const handlePrevDay = () => {
    const newDate = new Date(selectedDate)
    newDate.setDate(newDate.getDate() - 1)
    if (!minDate || newDate >= minDate) {
      onDateChange(newDate)
    }
  }

  const handleNextDay = () => {
    const newDate = new Date(selectedDate)
    newDate.setDate(newDate.getDate() + 1)
    if (!maxDate || newDate <= maxDate) {
      onDateChange(newDate)
    }
  }

  const handleToday = () => {
    onDateChange(new Date())
  }

  const isToday = formatDate(selectedDate) === formatDate(new Date())
  const canGoPrev = !minDate || selectedDate > minDate
  const canGoNext = !maxDate || selectedDate < maxDate

  if (compact) {
    return (
      <div className="flex items-center gap-2 rounded-sharp border border-border bg-surface px-3 py-2 shadow-sm">
        <button
          onClick={handlePrevDay}
          disabled={!canGoPrev}
          className="rounded-sharp p-1 transition-colors hover:bg-paper disabled:opacity-50 disabled:cursor-not-allowed"
          aria-label="Previous day"
        >
          <ChevronLeft size={16} className="text-text-muted" />
        </button>

        <button
          onClick={handleToday}
          className={`px-3 py-1 text-xs font-medium rounded-sharp transition-colors ${
            isToday
              ? 'bg-signal text-surface'
              : 'text-text-secondary hover:bg-paper'
          }`}
        >
          {isToday ? 'Today' : formatDisplayDate(selectedDate)}
        </button>

        <button
          onClick={handleNextDay}
          disabled={!canGoNext}
          className="rounded-sharp p-1 transition-colors hover:bg-paper disabled:opacity-50 disabled:cursor-not-allowed"
          aria-label="Next day"
        >
          <ChevronRight size={16} className="text-text-muted" />
        </button>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-ink">
          {formatDisplayDate(selectedDate)}
        </h2>
        <div className="flex items-center gap-2">
          <button
            onClick={handlePrevDay}
            disabled={!canGoPrev}
            className="px-3 py-2 text-sm font-medium rounded-sharp border border-border transition-colors hover:bg-paper disabled:opacity-50 disabled:cursor-not-allowed"
          >
            ← Prev
          </button>
          <button
            onClick={handleToday}
            className="px-3 py-2 text-sm font-medium rounded-sharp border border-border transition-colors hover:bg-paper"
          >
            Today
          </button>
          <button
            onClick={handleNextDay}
            disabled={!canGoNext}
            className="px-3 py-2 text-sm font-medium rounded-sharp border border-border transition-colors hover:bg-paper disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Next →
          </button>
        </div>
      </div>
    </div>
  )
}
