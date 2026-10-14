'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { api } from '@/lib/api'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { useToast } from '@/components/ui/Toast'
import { ChevronLeft } from 'lucide-react'
import { cn } from '@/lib/utils'

function formatDate(isoString: string): string {
  const date = new Date(isoString)
  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  })
}

function formatTime(isoString: string): string {
  const date = new Date(isoString)
  return date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
  })
}

const statusColorMap: Record<string, { bg: string; text: string; dot: string }> = {
  pending: { bg: 'bg-warning/10', text: 'text-warning', dot: 'bg-warning' },
  confirmed: { bg: 'bg-signal/10', text: 'text-signal', dot: 'bg-signal' },
  checked_in: { bg: 'bg-info/10', text: 'text-info', dot: 'bg-info' },
  completed: { bg: 'bg-success/10', text: 'text-success', dot: 'bg-success' },
  cancelled: { bg: 'bg-surface-elevated', text: 'text-text-muted line-through', dot: 'bg-text-muted' },
  no_show: { bg: 'bg-error/10', text: 'text-error', dot: 'bg-error' },
}

function StatusBadge({ status }: { status: string }) {
  const colors = statusColorMap[status] || statusColorMap.pending
  const displayText = status === 'checked_in' ? 'Checked In' : status.charAt(0).toUpperCase() + status.slice(1).replace(/_/g, ' ')

  return (
    <div className={cn('inline-flex items-center gap-1.5 px-2.5 py-1 rounded-object text-xs font-medium', colors.bg)}>
      <div className={cn('size-1.5 rounded-full', colors.dot)} />
      <span className={colors.text}>{displayText}</span>
    </div>
  )
}

export default function BookingStatusPage({ params }: { params: Promise<{ bookingId: string }> }) {
  const [bookingId, setBookingId] = useState<string | null>(null)
  const [booking, setBooking] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showCancelDialog, setShowCancelDialog] = useState(false)
  const [isCanceling, setIsCanceling] = useState(false)
  const [cancelError, setCancelError] = useState<string | null>(null)
  const { success } = useToast()

  // Unwrap params
  useEffect(() => {
    params.then((p) => setBookingId(p.bookingId))
  }, [params])

  // Fetch booking
  useEffect(() => {
    if (!bookingId) return

    const fetchBooking = async () => {
      try {
        setIsLoading(true)
        setError(null)
        const response = await api.bookings.get(bookingId)
        setBooking(response.booking)
      } catch (err) {
        setError('We couldn\'t find that booking.')
      } finally {
        setIsLoading(false)
      }
    }

    fetchBooking()
  }, [bookingId])

  const handleCancelConfirm = async () => {
    if (!bookingId) return
    setCancelError(null)
    setIsCanceling(true)

    try {
      const response = await api.bookings.cancel(bookingId)
      setBooking(response.booking)
      setShowCancelDialog(false)

      success(
        response.refund.issued
          ? `Booking cancelled. Refund of ₹${(response.booking.amount / 100).toLocaleString('en-IN')} will be processed.`
          : 'Booking cancelled. No refund available for this cancellation.'
      )
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to cancel booking'
      setCancelError(message)
    } finally {
      setIsCanceling(false)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-paper p-6 flex items-center justify-center">
        <div className="max-w-560px w-full">
          <div className="h-8 bg-surface-elevated rounded-sharp w-32 animate-pulse mb-8" />
          <div className="space-y-4">
            <div className="h-40 bg-surface-elevated rounded-sharp animate-pulse" />
            <div className="h-12 bg-surface-elevated rounded-sharp animate-pulse" />
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-paper p-6 flex items-center justify-center">
        <div className="max-w-560px w-full text-center">
          <h1 className="text-2xl font-semibold text-ink mb-4">Booking not found</h1>
          <p className="text-text-secondary mb-6">{error}</p>
          <Link
            href="/studios"
            className="inline-flex items-center gap-2 px-4 py-2 bg-ink text-paper rounded-sharp font-medium hover:bg-[#2e2d2a]"
          >
            Browse studios
          </Link>
        </div>
      </div>
    )
  }

  if (!booking) return null

  const depositAmount = booking.amount / 100
  const canCancel = booking.status === 'confirmed'

  return (
    <div className="min-h-screen bg-paper p-6">
      <div className="max-w-560px mx-auto">
        {/* Back link */}
        <Link href="/studios" className="inline-flex items-center gap-2 text-text-secondary hover:text-ink transition-colors mb-8">
          <ChevronLeft size={20} />
          <span className="text-sm font-medium">Back</span>
        </Link>

        {/* Title */}
        <h1 className="text-2xl font-semibold text-ink mb-1">Your booking</h1>
        <p className="text-text-secondary mb-8">Booking ID: <span className="font-mono text-sm">{booking.id}</span></p>

        {/* Status card */}
        <div className="bg-surface border border-border rounded-sharp p-6 mb-6 space-y-4">
          {/* Status badge */}
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-text-muted mb-2">Status</p>
            <StatusBadge status={booking.status} />
          </div>

          {/* Details */}
          <div className="pt-4 border-t border-border space-y-4">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-text-muted mb-1">Space</p>
              <p className="text-base font-medium text-ink">{booking.spaceName}</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-text-muted mb-1">Date</p>
                <p className="text-base font-medium text-ink">{formatDate(booking.startTime)}</p>
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-text-muted mb-1">Time</p>
                <p className="text-base font-medium text-ink">{formatTime(booking.startTime)} – {formatTime(booking.endTime)}</p>
              </div>
            </div>

            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-text-muted mb-1">Deposit paid</p>
              <p className="text-base font-medium text-ink tabular-nums">₹{depositAmount.toLocaleString('en-IN', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}</p>
            </div>
          </div>
        </div>

        {/* Booking state-specific content */}
        {booking.status === 'pending' && (
          <div className="bg-surface-elevated border border-border/50 rounded-sharp p-4 mb-6 text-sm">
            <p className="text-text-secondary">Your payment is still being confirmed. This typically takes a few minutes. Check back shortly.</p>
          </div>
        )}

        {booking.status === 'cancelled' && (
          <div className="bg-surface-elevated border border-border/50 rounded-sharp p-4 mb-6 text-sm">
            <p className="font-medium text-ink mb-1">Cancellation details</p>
            <p className="text-text-secondary">
              {booking.refund?.issued
                ? `Refund of ₹${(booking.amount / 100).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} will appear within 5–10 days`
                : 'No refund was issued for this cancellation.'}
            </p>
          </div>
        )}

        {/* Cancellation policy */}
        <div className="bg-surface-elevated border border-border/50 rounded-sharp p-4 mb-6 text-sm">
          <p className="font-medium text-ink mb-1">Cancellation policy</p>
          <p className="text-text-secondary text-xs leading-relaxed">
            Free cancellation up to 24 hours before your booking. Cancellations within 24 hours will not be refunded.
          </p>
        </div>

        {/* Cancel button and error */}
        {canCancel && (
          <>
            {cancelError && (
              <div className="p-4 bg-error/10 border border-error rounded-sharp text-error text-sm mb-4">
                {cancelError}
              </div>
            )}
            <button
              onClick={() => setShowCancelDialog(true)}
              disabled={isCanceling}
              className="w-full py-3 px-4 border border-error text-error rounded-sharp font-medium hover:bg-error/5 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel booking
            </button>
          </>
        )}

        {/* Cancel confirmation dialog */}
        {showCancelDialog && (
          <ConfirmDialog
            isOpen={showCancelDialog}
            title="Cancel booking?"
            message={`This will cancel your booking for ${booking.spaceName} on ${formatDate(booking.startTime)}.`}
            confirmLabel="Cancel booking"
            cancelLabel="Keep booking"
            onConfirm={handleCancelConfirm}
            onCancel={() => setShowCancelDialog(false)}
            isDangerous={true}
            isLoading={isCanceling}
          />
        )}
      </div>
    </div>
  )
}
