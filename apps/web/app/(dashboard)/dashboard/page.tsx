'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/context/AuthContext'
import { api } from '@/lib/api'
import Link from 'next/link'
import {
  CalendarBlank,
  Clock,
  WarningCircle,
  ArrowRight,
  CheckCircle,
} from 'phosphor-react'

interface BookingResponse {
  id: string
  spaceId: string
  spaceName: string
  renterEmail: string
  renterName: string
  startTime: string
  endTime: string
  status: 'pending' | 'confirmed' | 'checked_in' | 'completed' | 'cancelled' | 'no_show'
  amount: number
  depositPaid: number
  createdAt: string
  updatedAt: string
}

const SKELETON_ROWS = 4
const ROW_HEIGHT = 64

export default function DashboardPage() {
  const { user, isLoading: authloading } = useAuth()
  const [bookings, setBookings] = useState<BookingResponse[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // Wait for auth context to finish loading
    if (authloading) {
      return
    }

    if (!user) {
      setIsLoading(false)
      return
    }

    if (!user.orgId) {
      setIsLoading(false)
      setError('Please complete onboarding first')
      return
    }

    const fetchBookings = async () => {
      try {
        setError(null)
        const today = new Date()
        const dateStr = today.toISOString().split('T')[0]

        const response = await api.bookings.listByOrg(user.orgId as string, dateStr)
        setBookings(response.bookings)
      } catch (err) {
        console.error('Failed to fetch bookings:', err)
        setError(
          err instanceof Error ? err.message : 'Failed to load bookings'
        )
        setBookings([])
      } finally {
        setIsLoading(false)
      }
    }

    fetchBookings()
  }, [user, authloading])

  const getStatusBadge = (status: BookingResponse['status']) => {
    switch (status) {
      case 'pending':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-object text-xs font-medium bg-warning/10 text-warning border border-warning/20">
            <span className="h-1.5 w-1.5 rounded-full bg-warning" />
            Pending
          </span>
        )
      case 'confirmed':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-object text-xs font-medium bg-signal/10 text-signal border border-signal/20">
            <span className="h-1.5 w-1.5 rounded-full bg-signal" />
            Confirmed
          </span>
        )
      case 'checked_in':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-object text-xs font-medium bg-info/10 text-info border border-info/20">
            <span className="h-1.5 w-1.5 rounded-full bg-info badge-checked-in-dot" />
            Checked In
          </span>
        )
      case 'completed':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-object text-xs font-medium bg-success/10 text-success border border-success/20">
            <span className="h-1.5 w-1.5 rounded-full bg-success" />
            Completed
          </span>
        )
      case 'cancelled':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-object text-xs font-medium bg-surface-elevated text-text-muted border border-border line-through">
            <span className="h-1.5 w-1.5 rounded-full bg-text-muted" />
            Cancelled
          </span>
        )
      case 'no_show':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-object text-xs font-medium bg-error/10 text-error border border-error/20">
            <span className="h-1.5 w-1.5 rounded-full bg-error" />
            No Show
          </span>
        )
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-object text-xs font-medium bg-paper text-text-muted border border-border">
            {status}
          </span>
        )
    }
  }

  const formatTime = (isoString: string): string => {
    const date = new Date(isoString)
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    })
  }

  const confirmedCount = bookings.filter(
    (b) => b.status === 'confirmed' || b.status === 'checked_in'
  ).length
  const totalRevenue = bookings.reduce((sum, b) => sum + (b.amount || 0), 0)

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border pb-6">
        <div>
          <div className="flex items-center gap-2 text-text-muted text-xs font-medium uppercase tracking-wider mb-1">
            <CalendarBlank size={14} weight="bold" />
            <span>
              {new Date().toLocaleDateString('en-US', {
                weekday: 'long',
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              })}
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-ink">
            Today's Bookings
          </h1>
        </div>

        {/* Quick status pill */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-surface border border-border rounded-sharp text-xs font-medium text-text-secondary">
            <span className="h-2 w-2 rounded-full bg-success" />
            <span>Live Schedule</span>
          </div>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-surface border border-border rounded-sharp p-4 sm:p-5 shadow-xs">
          <p className="text-xs font-medium uppercase tracking-wider text-text-muted">
            Total Sessions
          </p>
          <p className="text-2xl sm:text-3xl font-semibold text-ink mt-1.5 tabular-nums">
            {isLoading ? '—' : bookings.length}
          </p>
          <p className="text-xs text-text-secondary mt-1">Booked for today</p>
        </div>

        <div className="bg-surface border border-border rounded-sharp p-4 sm:p-5 shadow-xs">
          <p className="text-xs font-medium uppercase tracking-wider text-text-muted">
            Confirmed / Active
          </p>
          <p className="text-2xl sm:text-3xl font-semibold text-ink mt-1.5 tabular-nums">
            {isLoading ? '—' : confirmedCount}
          </p>
          <p className="text-xs text-text-secondary mt-1">Ready or in progress</p>
        </div>

        <div className="bg-surface border border-border rounded-sharp p-4 sm:p-5 shadow-xs">
          <p className="text-xs font-medium uppercase tracking-wider text-text-muted">
            Expected Revenue
          </p>
          <p className="text-2xl sm:text-3xl font-semibold text-ink mt-1.5 tabular-nums">
            {isLoading ? '—' : `₹${(totalRevenue / 100).toLocaleString('en-IN')}`}
          </p>
          <p className="text-xs text-text-secondary mt-1">Gross daily booking value</p>
        </div>
      </div>

      {/* Loading skeleton */}
      {isLoading && (
        <div className="bg-surface border border-border rounded-sharp p-4 divide-y divide-border/60">
          {Array.from({ length: SKELETON_ROWS }).map((_, idx) => (
            <div
              key={idx}
              className="py-4 flex items-center justify-between animate-pulse first:pt-0 last:pb-0"
              style={{ minHeight: `${ROW_HEIGHT}px` }}
            >
              <div className="flex items-center gap-4 flex-1">
                <div className="h-4 w-32 bg-surface-elevated rounded-sharp" />
                <div className="h-4 w-40 bg-surface-elevated rounded-sharp" />
              </div>
              <div className="flex items-center gap-3">
                <div className="h-4 w-16 bg-surface-elevated rounded-sharp" />
                <div className="h-6 w-20 bg-surface-elevated rounded-object" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Error state */}
      {!isLoading && error && (
        <div className="bg-error/10 border border-error/20 rounded-sharp p-5 text-error text-sm">
          <div className="flex items-start gap-3">
            <WarningCircle size={20} weight="regular" className="flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-semibold text-ink">
                {error === 'Please complete onboarding first'
                  ? 'Organization setup required'
                  : 'Failed to load bookings'}
              </p>
              <p className="text-sm text-text-secondary mt-1">{error}</p>
              {error === 'Please complete onboarding first' && (
                <Link
                  href="/onboarding"
                  className="inline-flex items-center gap-1.5 mt-3 text-sm font-medium text-ink hover:underline"
                >
                  <span>Complete onboarding</span>
                  <ArrowRight size={14} weight="bold" />
                </Link>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Empty state */}
      {!isLoading && !error && bookings.length === 0 && (
        <div className="bg-surface border border-border rounded-sharp p-12 text-center">
          <div className="h-12 w-12 rounded-sharp bg-paper border border-border mx-auto flex items-center justify-center text-text-muted mb-4">
            <CalendarBlank size={24} weight="regular" />
          </div>
          <h3 className="text-base font-semibold text-ink">No bookings today</h3>
          <p className="text-sm text-text-muted max-w-sm mx-auto mt-1.5">
            Your schedule is clear for today. Confirmed bookings from renters will appear here in real time.
          </p>
          <div className="mt-6">
            <Link
              href="/dashboard/spaces"
              className="inline-flex items-center gap-2 px-4 py-2 bg-ink text-paper text-sm font-medium rounded-sharp hover:bg-[#2e2d2a] transition-colors"
            >
              <span>View Spaces</span>
              <ArrowRight size={14} weight="bold" />
            </Link>
          </div>
        </div>
      )}

      {/* Bookings list */}
      {!isLoading && !error && bookings.length > 0 && (
        <div className="bg-surface border border-border rounded-sharp shadow-xs overflow-hidden">
          <div className="px-5 py-3.5 border-b border-border bg-paper/40 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock size={16} weight="regular" className="text-text-muted" />
              <h2 className="text-xs font-semibold uppercase tracking-wider text-text-secondary">
                Scheduled Sessions
              </h2>
            </div>
            <span className="text-xs font-medium text-text-muted tabular-nums">
              {bookings.length} {bookings.length === 1 ? 'booking' : 'bookings'}
            </span>
          </div>

          <div className="divide-y divide-border">
            {bookings.map((booking) => (
              <div
                key={booking.id}
                className="flex flex-col sm:flex-row sm:items-center justify-between p-4 sm:px-5 sm:py-4 hover:bg-paper/50 transition-colors gap-3 sm:gap-4"
                style={{ minHeight: `${ROW_HEIGHT}px` }}
              >
                {/* Left: Time, Space & Renter */}
                <div className="flex-1 min-w-0">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-6">
                    {/* Time */}
                    <div className="flex items-center gap-2 text-sm font-semibold text-ink tabular-nums whitespace-nowrap min-w-[170px]">
                      <Clock size={15} weight="regular" className="text-text-muted" />
                      <span>
                        {formatTime(booking.startTime)} – {formatTime(booking.endTime)}
                      </span>
                    </div>

                    {/* Space and renter */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-ink truncate">
                        {booking.spaceName}
                      </p>
                      <p className="text-xs text-text-muted truncate mt-0.5">
                        {booking.renterName || booking.renterEmail}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Right: Amount and status */}
                <div className="flex items-center justify-between sm:justify-end gap-4 sm:ml-4 pt-2 sm:pt-0 border-t border-border/40 sm:border-t-0">
                  <div className="text-sm font-medium text-ink tabular-nums whitespace-nowrap">
                    ₹{(booking.amount / 100).toFixed(0)}
                  </div>
                  <div>
                    {getStatusBadge(booking.status)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}