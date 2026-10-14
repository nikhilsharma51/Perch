'use client'

import React, { useState, useEffect, Suspense } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { api } from '@/lib/api'
import { ChevronLeft, Download, Check } from 'lucide-react'

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

function ConfirmationContent() {
  const searchParams = useSearchParams()
  const [booking, setBooking] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const bookingId = searchParams?.get('bookingId')

  useEffect(() => {
    if (!bookingId) {
      setError('Invalid confirmation link')
      setIsLoading(false)
      return
    }

    // Poll for booking confirmation (payment processing may still be pending)
    const pollBooking = async () => {
      try {
        const response = await api.bookings.get(bookingId)
        setBooking(response)
        setError(null)
        setIsLoading(false)
      } catch (err) {
        // Retry after 2 seconds
        setTimeout(pollBooking, 2000)
      }
    }

    // Start polling with a timeout
    let attempts = 0
    const maxAttempts = 5 // 10 seconds max
    
    const poll = () => {
      attempts++
      if (attempts > maxAttempts) {
        setError('Booking confirmation timed out. Please check your email or try again.')
        setIsLoading(false)
        return
      }
      pollBooking()
    }

    poll()
  }, [bookingId])

  const downloadICS = () => {
    if (!booking) return

    // Create iCalendar format
    const startDate = new Date(booking.startTime)
    const endDate = new Date(booking.endTime)

    const formatCalendarDate = (date: Date) => {
      return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z'
    }

    const ics = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Perch//Booking//EN
CALSCALE:GREGORIAN
METHOD:PUBLISH
BEGIN:VEVENT
UID:${booking.id}@perch
DTSTAMP:${formatCalendarDate(new Date())}
DTSTART:${formatCalendarDate(startDate)}
DTEND:${formatCalendarDate(endDate)}
SUMMARY:${booking.spaceName} - Booking Confirmed
DESCRIPTION:Your booking is confirmed. Booking ID: ${booking.id}
STATUS:CONFIRMED
END:VEVENT
END:VCALENDAR`

    const blob = new Blob([ics], { type: 'text/calendar' })
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `booking-${booking.id}.ics`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    window.URL.revokeObjectURL(url)
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-paper p-6 flex items-center justify-center">
        <div className="max-w-560px w-full text-center">
          <div className="mb-6">
            <div className="w-16 h-16 mx-auto bg-surface-elevated rounded-full animate-pulse mb-4" />
          </div>
          <h1 className="text-2xl font-semibold text-ink mb-2">Confirming your booking...</h1>
          <p className="text-text-secondary">This may take a few moments</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-paper p-6 flex items-center justify-center">
        <div className="max-w-560px w-full text-center">
          <h1 className="text-2xl font-semibold text-ink mb-4">Something went wrong</h1>
          <p className="text-text-secondary mb-6">{error}</p>
          <Link
            href="/studios"
            className="inline-flex items-center gap-2 px-4 py-2 bg-ink text-paper rounded-sharp font-medium hover:bg-[#2e2d2a]"
          >
            Back to studios
          </Link>
        </div>
      </div>
    )
  }

  if (!booking) return null

  const depositAmount = booking.depositPaid / 100
  const fullAmount = booking.amount / 100

  return (
    <div className="min-h-screen bg-paper p-6">
      <div className="max-w-560px mx-auto">
        {/* Success header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 mx-auto bg-success/10 border border-success rounded-full flex items-center justify-center mb-4">
            <Check className="text-success" size={32} />
          </div>
          <h1 className="text-2xl font-semibold text-ink mb-1">Booking confirmed!</h1>
          <p className="text-text-secondary">Your payment has been received</p>
        </div>

        {/* Booking details */}
        <div className="bg-surface border border-border rounded-sharp p-6 mb-6 space-y-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-text-muted mb-1">Space</p>
            <p className="text-base font-medium text-ink">{booking.spaceName}</p>
          </div>

          <div className="grid grid-cols-2 gap-4 pt-4 border-t border-border">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-text-muted mb-1">Date</p>
              <p className="text-base font-medium text-ink">{formatDate(booking.startTime)}</p>
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-text-muted mb-1">Time</p>
              <p className="text-base font-medium text-ink">{formatTime(booking.startTime)} – {formatTime(booking.endTime)}</p>
            </div>
          </div>

          <div className="pt-4 border-t border-border space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-text-secondary">Deposit paid:</span>
              <span className="text-ink font-medium tabular-nums">₹{depositAmount.toLocaleString('en-IN', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-text-secondary">Balance due:</span>
              <span className="text-ink font-medium tabular-nums">₹{(fullAmount - depositAmount).toLocaleString('en-IN', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}</span>
            </div>
            <div className="flex justify-between text-sm border-t border-border pt-2 mt-2">
              <span className="text-ink font-medium">Total:</span>
              <span className="text-ink font-semibold tabular-nums">₹{fullAmount.toLocaleString('en-IN', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}</span>
            </div>
          </div>
        </div>

        {/* Booking info */}
        <div className="bg-surface-elevated border border-border/50 rounded-sharp p-4 mb-6 text-sm space-y-2">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-text-muted mb-1">Booking ID</p>
            <p className="font-mono text-ink">{booking.id}</p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-text-muted mb-1">Confirmation sent to</p>
            <p className="text-ink">{booking.renterEmail}</p>
          </div>
        </div>

        {/* Actions */}
        <div className="space-y-3 mb-8">
          <button
            onClick={downloadICS}
            className="w-full py-3 px-4 border border-ink text-ink rounded-sharp font-medium hover:bg-paper transition-colors flex items-center justify-center gap-2"
          >
            <Download size={18} />
            Add to calendar
          </button>

          <Link
            href={`/bookings/${booking.id}`}
            className="block w-full py-3 px-4 bg-ink text-paper rounded-sharp font-medium hover:bg-[#2e2d2a] transition-colors text-center"
          >
            View booking details
          </Link>
        </div>

        {/* Footer info */}
        <div className="text-center text-xs text-text-muted">
          <p>A confirmation email has been sent to {booking.renterEmail}</p>
        </div>
      </div>
    </div>
  )
}

export default function ConfirmationPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-paper p-6 flex items-center justify-center">
          <div className="max-w-560px w-full text-center">
            <div className="mb-6">
              <div className="w-16 h-16 mx-auto bg-surface-elevated rounded-full animate-pulse mb-4" />
            </div>
            <h1 className="text-2xl font-semibold text-ink mb-2">Confirming your booking...</h1>
            <p className="text-text-secondary">This may take a few moments</p>
          </div>
        </div>
      }
    >
      <ConfirmationContent />
    </Suspense>
  )
}
