
'use client'

import React from 'react'
import { Clock3, Check, LockKeyhole, CircleSlash } from 'lucide-react'
import { cn } from '@/lib/utils'

export type SlotState =
  | 'available'
  | 'booked'
  | 'locked'
  | 'unavailable'

export type BookingStatus =
  | 'pending'
  | 'confirmed'
  | 'checked_in'
  | 'completed'
  | 'cancelled'
  | 'no_show'

interface SlotCellProps {
  startTime: string
  endTime: string
  price: number
  state: SlotState
  booking?: {
    renterName: string
    status: BookingStatus
  }
  onClick?: () => void
}

const statusConfig: Record<
  BookingStatus,
  { label: string; className: string; dotClassName: string }
> = {
  pending: {
    label: 'Pending',
    className: 'border-warning/25 bg-warning/10 text-warning',
    dotClassName: 'bg-warning',
  },
  confirmed: {
    label: 'Confirmed',
    className: 'border-signal/20 bg-signal/10 text-signal',
    dotClassName: 'bg-signal',
  },
  checked_in: {
    label: 'Checked in',
    className: 'border-info/25 bg-info/10 text-info',
    dotClassName: 'bg-info',
  },
  completed: {
    label: 'Completed',
    className: 'border-success/25 bg-success/10 text-success',
    dotClassName: 'bg-success',
  },
  cancelled: {
    label: 'Cancelled',
    className: 'border-border bg-paper text-text-muted',
    dotClassName: 'bg-text-muted',
  },
  no_show: {
    label: 'No-show',
    className: 'border-error/25 bg-error/10 text-error',
    dotClassName: 'bg-error',
  },
}

function formatTime(time: string): string {
  const [hours, minutes] = time.split(':').map(Number)
  const period = hours >= 12 ? 'PM' : 'AM'
  const hour = hours % 12 || 12

  return `${hour}:${String(minutes).padStart(2, '0')} ${period}`
}

export function SlotCell({
  startTime,
  endTime,
  price,
  state,
  booking,
  onClick,
}: SlotCellProps) {
  const timeLabel = `${formatTime(startTime)} – ${formatTime(endTime)}`

  if (state === 'available') {
    return (
      <button
        type="button"
        onClick={onClick}
        aria-label={`Available from ${timeLabel}, ₹${(price / 100).toFixed(2)}`}
        className={cn(
          'group relative flex min-h-[60px] w-full flex-col justify-between',
          'overflow-hidden border border-border bg-surface px-2.5 py-2 text-left',
          'transition-colors duration-150',
          'hover:border-success/60 hover:bg-success/[0.04]',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal focus-visible:ring-offset-1',
        )}
      >
        <span className="flex items-center justify-between gap-1">
          <span className="truncate text-[10px] font-medium tabular-nums text-text-secondary">
            {formatTime(startTime)}
          </span>

          <span className="flex h-4 w-4 shrink-0 items-center justify-center border border-success/30 bg-success/[0.07] text-success transition-colors group-hover:bg-success group-hover:text-white">
            <Check size={10} strokeWidth={2.5} />
          </span>
        </span>

        <span className="mt-2 flex items-end justify-between gap-1">
          <span className="text-[11px] font-semibold tabular-nums text-ink">
            ₹{(price).toFixed(2)}
          </span>

          <span className="text-[9px] font-medium uppercase tracking-wide text-text-muted opacity-0 transition-opacity group-hover:opacity-100">
            Open
          </span>
        </span>
      </button>
    )
  }

  if (state === 'booked') {
    const status = booking
      ? statusConfig[booking.status]
      : statusConfig.pending

    return (
      <button
        type="button"
        onClick={onClick}
        aria-label={`Booked from ${timeLabel} by ${booking?.renterName || 'Unknown'}. Status: ${status.label}`}
        className={cn(
          'group relative flex min-h-[60px] w-full flex-col justify-between',
          'overflow-hidden border border-signal/20 bg-signal/[0.045] px-2.5 py-2 text-left',
          'transition-colors duration-150 hover:border-signal/55 hover:bg-signal/[0.08]',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal focus-visible:ring-offset-1',
        )}
      >
        <span className="absolute bottom-0 left-0 top-0 w-[2px] bg-signal/70 transition-colors group-hover:bg-signal" />

        <span className="flex min-w-0 items-center justify-between gap-1 pl-0.5">
          <span className="truncate text-[10px] font-medium tabular-nums text-text-secondary">
            {formatTime(startTime)}
          </span>

          <span
            className={cn(
              'h-1.5 w-1.5 shrink-0 rounded-full',
              status.dotClassName,
            )}
          />
        </span>

        <span
          className="mt-2 block truncate pl-0.5 text-[11px] font-semibold text-ink"
          title={booking?.renterName || 'Unknown'}
        >
          {booking?.renterName || 'Unknown'}
        </span>

        <span className="mt-1 flex min-w-0 items-center justify-between gap-1 pl-0.5">
          <span
            className={cn(
              'inline-flex max-w-full items-center border px-1.5 py-0.5',
              'text-[9px] font-medium leading-none',
              status.className,
            )}
          >
            <span className="truncate">{status.label}</span>
          </span>

          <span className="shrink-0 text-[9px] text-text-muted opacity-0 transition-opacity group-hover:opacity-100">
            View
          </span>
        </span>
      </button>
    )
  }

  if (state === 'locked') {
    return (
      <div
        className={cn(
          'slot-cell-locked-stripes flex min-h-[60px] w-full flex-col justify-between',
          'border border-border/70 px-2.5 py-2',
        )}
        aria-label={`Locked from ${timeLabel}`}
      >
        <span className="flex items-center justify-between gap-1">
          <span className="truncate text-[10px] font-medium tabular-nums text-text-secondary">
            {formatTime(startTime)}
          </span>
          <LockKeyhole size={12} className="shrink-0 text-text-muted" />
        </span>

        <span className="mt-2 text-[10px] font-medium text-text-muted">
          Locked
        </span>
      </div>
    )
  }

  return (
    <div
      className="flex min-h-[60px] w-full flex-col justify-between border border-dashed border-border bg-paper/70 px-2.5 py-2"
      aria-label={`Unavailable from ${timeLabel}`}
    >
      <span className="flex items-center justify-between gap-1">
        <span className="truncate text-[10px] font-medium tabular-nums text-text-muted">
          {formatTime(startTime)}
        </span>
        <CircleSlash size={12} className="shrink-0 text-text-muted/70" />
      </span>

      <span className="mt-2 text-[10px] font-medium text-text-muted">
        Unavailable
      </span>
    </div>
  )
}
